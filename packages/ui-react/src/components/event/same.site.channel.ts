/**
 * 基于 window.postMessage 的同站不同源事件通信服务。
 * addTarget 会创建临时隐藏 iframe 并加载同站页面，dispatch 会通知当前页面和已注册 iframe，observe 则按事件 type 返回可订阅的 Observable。
 * TIP：example.com 和 sim.example.com 不是同源，可配置可信站点后缀后使用 BKSameSiteChannel 通信。
 *
 * 安全模型：
 *   - 同站范围由 addTarget 的 trustedSiteDomains 显式配置，默认不信任任何正式域名。
 *     当前页与目标页必须属于同一个配置后缀；localhost / IP 仅允许同 host。
 *     协议也参与比较，http 与 https 不会被视为同一个安全站点。
 *     只应配置业务方控制的域名，不用于第三方托管域的通用 PSL / eTLD+1 判定。
 *   - 每个 target 有独立的随机 token（128bit），addTarget 时自动生成，
 *     或通过 options.token 显式指定（比如从服务端下发）。
 *   - token 会以 hash 参数 __bk_ss_token 的形式注入 iframe.src，
 *     目标页用 readSameSiteChannelToken() 读取，并在所有发出的消息中原样携带。
 *   - 本 channel 接收消息时执行三重校验：source 已注册 → event.origin 匹配 → token 匹配。
 *     因此同站其它页面即使知道 channel 名，也无法伪造事件，也无法重放历史消息。
 *   - channel 名仍然作为逻辑分组使用，但不是安全边界；真正的安全边界是 token + source + origin。
 *
 * auth: cyq@guangpu.info
 * create: cyq@guangpu.info  2026/09/20 10:24
 * update: cyq@guangpu.info  2026/10/28 18:43
 *
 * demo:
 * const sameSiteChannel = bkSameSiteChannel();
 * const trustedSiteDomains = ['bitkan.com', 'btcwatch.com'] as const;
 * const ACTION_CHANNEL = 'demo_action_channel';
 *
 * // 默认创建隐藏 iframe，适合后台握手、action bridge 这类无界面通信。
 * const actionTarget = sameSiteChannel.addTarget('https://sim.bitkan.com/auth/demo/action', {
 *   trustedSiteDomains,
 *   id: 'demo-action-iframe',
 *   title: 'Demo action bridge',
 *   channelName: ACTION_CHANNEL,
 * });
 * if (!actionTarget) return;
 *
 * // addTarget 会自动生成随机 token 并注入到 iframe.src（hash 参数 __bk_ss_token）。
 * // 目标页用 readSameSiteChannelToken() 读取该 token，并在所有发出的消息中原样携带。
 * // 本 channel 只接受携带正确 token 的消息，因此同站其它页面即使知道 channel 名也无法伪造。
 * const readyState = await actionTarget.ready;
 * if (readyState !== 'ready') {
 *   actionTarget.destroy();
 *   return;
 * }
 *
 * const subscription = sameSiteChannel.observe('bot.action.result', undefined, {
 *   channelName: ACTION_CHANNEL,
 * }).subscribe((event) => {
 *   console.log(event.message);
 *   subscription.unsubscribe();
 *   actionTarget.destroy();
 * });
 *
 * const dispatched = actionTarget.dispatch({
 *   type: 'bot.action.request',
 *   message: { action: 'logout' },
 * });
 * if (!dispatched) {
 *   subscription.unsubscribe();
 *   actionTarget.destroy();
 * }
 *
 * // 需要用户交互时可创建可见 iframe，并挂载到指定容器；通常在弹窗关闭时 destroy。
 * const paymentTarget = sameSiteChannel.addTarget('https://sim.bitkan.com/auth/demo/payment', {
 *   trustedSiteDomains,
 *   hidden: false,
 *   mount: document.getElementById('payment-dialog-body') || document.body,
 *   title: 'Payment verification',
 *   className: 'block h-full w-full border-0',
 *   allow: 'payment *',
 *   channelName: 'demo_payment_channel',
 *   // 可选：如果 token 由服务端统一下发，则通过 options.token 传入，跳过自动生成。
 *   // token: 'pre-shared-token-from-server',
 * });
 * // paymentTarget?.destroy();
 *
 * // ==== 目标页侧接入示例（运行在 sim.bitkan.com 的 iframe 内）====
 * import { readSameSiteChannelToken } from '...';
 *
 * const token = readSameSiteChannelToken(); // 从 URL hash 读取 __bk_ss_token
 * if (!token) throw new Error('missing same site channel token');
 *
 * // 所有发给父页面的消息都必须带上 token，否则会被拒绝。
 * window.parent.postMessage(
 *   { channel: ACTION_CHANNEL, token, event: { type: 'bot.action.result', message: { ok: true } } },
 *   'https://bitkan.com'
 * );
 */

import { Subject, defer, EMPTY, finalize, Observable, startWith } from 'rxjs';

import { container, singleton } from '../di';

import type { BKEventType } from './type';

const DEFAULT_CHANNEL_NAME = 'bk_same_site_channel';
const DEFAULT_READY_TIMEOUT = 15000;

/** token 在 iframe URL hash 中的参数名。目标页通过 readSameSiteChannelToken 读取。 */
const TOKEN_PARAM_NAME = '__bk_ss_token';

type SameSiteTarget = {
  window: Window;
  origin: string;
  iframe: HTMLIFrameElement;
  channelName: string;
  /** 该 target 独有的通信 token，用于发送与校验消息。 */
  token: string;
  /** iframe 是否已经 load 完成。 */
  ready: boolean;
  status: SameSiteTargetState;
  /** iframe load 之前待发送的消息队列。 */
  pending: SameSiteMessage[];
  readyTimer: number | null;
  readySettled: boolean;
  resolveReady: (status: SameSiteTargetReadyState) => void;
};

type SameSiteMessage = {
  channel: string;
  token: string;
  event: BKEventType;
};

export type SameSiteTargetOptions = {
  /**
   * 业务方控制的可信站点后缀，如 ['example.com']，同时包含根域及其子域。
   * 仅传 hostname，不含协议、端口、路径或通配符；当前页与目标页须匹配同一个后缀。
   * 默认 []，不允许正式域名通信；localhost / IP 始终仅允许相同 hostname。
   * 仅用于本次 addTarget，不会修改共享 channel 的配置。
   */
  trustedSiteDomains?: readonly string[];
  id?: string;
  title?: string;
  mount?: HTMLElement;
  channelName?: string;
  hidden?: boolean;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  allow?: string;
  sandbox?: string;
  readyTimeout?: number;
  /**
   * 显式指定该 target 的通信 token。
   * 不传时自动生成 128bit 随机 token 并附加到 iframe URL hash 的 __bk_ss_token 参数。
   * 目标页必须从 URL 中读取该 token 并在所有消息中原样携带，否则会被拒绝。
   */
  token?: string;
};

type SameSiteChannelOptions = {
  channelName?: string;
};

export type SameSiteTargetReadyState = 'ready' | 'destroyed' | 'timeout';
export type SameSiteTargetState = 'pending' | SameSiteTargetReadyState;

export type SameSiteTargetHandle = {
  iframe: HTMLIFrameElement;
  origin: string;
  url: string;
  /** 该 target 的通信 token，便于调试或做进一步校验。 */
  token: string;
  /** iframe load 完成、target 被销毁或 readyTimeout 触发后 resolve 对应状态。 */
  ready: Promise<SameSiteTargetReadyState>;
  readonly status: SameSiteTargetState;
  readonly closed: boolean;
  dispatch: (event: BKEventType) => boolean;
  destroy: () => void;
};

@singleton()
class BKSameSiteChannel {
  private _subjects = new Map<string, Subject<BKEventType>>();

  private _refCounts = new Map<string, number>();

  private _targets = new Map<Window, SameSiteTarget>();

  private _destroyed = false;

  /**
   * 接收来自其它窗口的消息。
   * 只有同时满足以下全部条件才会被处理：
   *   1) channel 名一致；
   *   2) source 是已注册的 iframe contentWindow；
   *   3) event.origin 与注册时锁定的 origin 完全一致；
   *   4) message.token 与该 target 的 token 完全一致。
   * 三重绑定让同站其它页面无法伪造消息：即便知道 channel 与 origin，也不知道 token。
   */
  private _messageHandler = (event: MessageEvent) => {
    if (this._destroyed) return;

    const source = event.source as Window | null;
    if (!source) return;
    
    const target = this._targets.get(source);
    if (!target || !isSameSiteMessage(event.data, target.channelName, target.token)) return;

    const eventOrigin = normalizeOrigin(event.origin);
    if (!eventOrigin || eventOrigin !== target.origin) return;

    this._notifyLocal(event.data.channel, event.data.event);
  };

  constructor() {
    if (isBrowser()) {
      window.addEventListener('message', this._messageHandler);
    }
  }

  // ---------------------------------------------------------------------------
  // 私有工具
  // ---------------------------------------------------------------------------

  // 同站判定：协议相同，且双方 hostname 匹配使用方配置的同一个可信后缀。
  private _isSameSite(origin: string, trustedSiteDomains: readonly string[]): boolean {
    if (!isBrowser() || !origin) return false;

    try {
      const current = new URL(window.location.origin);
      const target = new URL(origin);
      if (current.protocol !== target.protocol) return false;

      if (isLocalHost(current.hostname) || isLocalHost(target.hostname)) {
        return current.hostname === target.hostname;
      }

      return trustedSiteDomains.some((value) => {
        const domain = value.trim().toLowerCase();
        if (!domain) return false;

        const matches = (hostname: string) => hostname === domain || hostname.endsWith(`.${domain}`);
        return matches(current.hostname) && matches(target.hostname);
      });
    } catch {
      return false;
    }
  }

  private _getSubjectKey(channelName: string, type: string) {
    return `${channelName}:${type}`;
  }

  private _notifyLocal(channelName: string, event: BKEventType) {
    if (this._destroyed) return;

    const subject = this._subjects.get(this._getSubjectKey(channelName, event.type));
    if (!subject || subject.closed) return;

    subject.next(event);
  }

  private _increaseRef(key: string) {
    const count = this._refCounts.get(key) ?? 0;

    this._refCounts.set(key, count + 1);
  }

  private _decreaseRef(key: string) {
    const count = this._refCounts.get(key) ?? 0;
    const nextCount = Math.max(count - 1, 0);

    if (nextCount > 0) {
      this._refCounts.set(key, nextCount);
      return;
    }

    // 没有订阅者时彻底清理，避免 Subject 泄漏。
    this._subjects.get(key)?.complete();
    this._subjects.delete(key);
    this._refCounts.delete(key);
  }

  /**
   * 组装发往某个 target 的消息负载。
   * 携带该 target 的 token，供目标页在回信时携带、父页面在接收时校验。
   */
  private _buildPayload(target: SameSiteTarget, event: BKEventType ): SameSiteMessage {
    return {
      channel: target.channelName,
      token: target.token,
      event: event,
    };
  }

  // 把 load 之前缓存的消息按顺序发出。
  private _flushPending(target: SameSiteTarget) {
    if (!target.pending.length) return;
    if (!this._targets.has(target.window)) {
      target.pending.length = 0;
      return;
    }
    if (target.window.closed || !target.iframe.isConnected) {
      this.removeTarget(target.window, 'destroyed');
      return;
    }

    const queue = target.pending.splice(0);
    queue.forEach((payload) => {
      if (!this._targets.has(target.window)) return;
      this._postMessage(target, payload);
    });
  }

  // 统一封装 postMessage，捕获不可结构化克隆的数据导致的异常。
  private _postMessage(target: SameSiteTarget, payload: SameSiteMessage) {
    try {
      target.window.postMessage(payload, target.origin);
      return true;
    } catch (error) {
      console.warn('[BKSameSiteChannel] postMessage failed', error);
      return false;
    }
  }

  private _dispatchToTarget(target: SameSiteTarget, event: BKEventType) {
    if (this._destroyed) {
      console.warn('[BKSameSiteChannel] dispatch skipped: channel destroyed');
      return false;
    }
    if (!this._targets.has(target.window)) {
      console.warn('[BKSameSiteChannel] dispatch skipped: target removed');
      return false;
    }

    // 窗口关闭或 iframe 被外部移除时，顺手清理掉注册项。
    if (target.window.closed || !target.iframe.isConnected) {
      this.removeTarget(target.window);
      console.warn('[BKSameSiteChannel] dispatch skipped: target iframe disconnected');
      return false;
    }

    let payload: SameSiteMessage;
    try {
      payload = this._buildPayload(target, event);
    } catch (error) {
      console.warn('[BKSameSiteChannel] build payload failed', error);
      return false;
    }

    // iframe 尚未 load 完成时，目标页可能还没注册 message 监听，先入队。
    if (!target.ready) {
      target.pending.push(payload);
      return true;
    }

    return this._postMessage(target, payload);
  }

  private _settleReady(target: SameSiteTarget, status: SameSiteTargetReadyState) {
    if (target.readyTimer !== null && isBrowser()) {
      window.clearTimeout(target.readyTimer);
      target.readyTimer = null;
    }

    if (!target.readySettled) {
      target.readySettled = true;
      target.ready = status === 'ready';
      target.status = status;
      target.resolveReady(status);
    }
  }

  // ---------------------------------------------------------------------------
  // 对外 API
  // ---------------------------------------------------------------------------

  // 创建临时 iframe 并注册为通信目标，调用方用返回的 handle.destroy() 清理。
  addTarget(targetUrl: string, options: SameSiteTargetOptions = {}): SameSiteTargetHandle | null {
    if (!isBrowser() || this._destroyed) return null;

    const resolvedUrl = resolveUrl(targetUrl);
    const normalizedOrigin = normalizeOrigin(resolvedUrl);

    if (!resolvedUrl || !normalizedOrigin) return null;
    if (!this._isSameSite(normalizedOrigin, options.trustedSiteDomains ?? [])) return null;

    const mount = options.mount || document.body;
    if (!mount) return null;

    // 每个 target 独立生成 token；如调用方显式传入则直接使用。
    const token = options.token || generateToken();
    const channelName = options.channelName || DEFAULT_CHANNEL_NAME;
    const urlWithToken = appendTokenToUrl(resolvedUrl, token);

    const iframe = document.createElement('iframe');

    // 通过 hash 参数把 token 传给目标页，避免进入服务端日志。
    iframe.src = urlWithToken;
    iframe.title = options.title || 'Same site channel target';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.border = '0';

    if (options.id) iframe.id = options.id;
    if (options.className) iframe.className = options.className;
    if (options.allow) iframe.allow = options.allow;
    // 注意：如果 sandbox 里没有 allow-same-origin，目标文档的 origin 会变成 opaque，
    // event.origin 会是 "null"，届时无法通过 origin 校验，本 channel 不再适用。
    if (options.sandbox) iframe.setAttribute('sandbox', options.sandbox);

    if (options.hidden !== false) {
      iframe.style.display = 'none';
      iframe.style.width = '0';
      iframe.style.height = '0';
    } else {
      iframe.removeAttribute('aria-hidden');
    }

    if (options.style) {
      Object.assign(iframe.style, options.style);
    }

    // contentWindow 只有在挂载到 DOM 后才可用，必须先 append。
    mount.appendChild(iframe);

    const targetWindow = iframe.contentWindow;
    if (!targetWindow) {
      iframe.remove();
      return null;
    }

    let resolveReady: (status: SameSiteTargetReadyState) => void = () => {};
    const readyPromise = new Promise<SameSiteTargetReadyState>((resolve) => {
      resolveReady = resolve;
    });
    const target: SameSiteTarget = {
      window: targetWindow,
      origin: normalizedOrigin,
      iframe,
      channelName,
      token,
      ready: false,
      status: 'pending',
      pending: [],
      readyTimer: null,
      readySettled: false,
      resolveReady,
    };

    // iframe load 完成后标记 ready，并 flush 之前排队的消息。
    // 这里不监听 error：iframe 内部 404 等仍会触发 load，交由业务侧自行判断。
    iframe.addEventListener(
      'load',
      () => {
        if (!this._targets.has(targetWindow)) return;

        this._settleReady(target, 'ready');
        this._flushPending(target);
      },
      { once: true }
    );

    const readyTimeout = Math.max(options.readyTimeout ?? DEFAULT_READY_TIMEOUT, 0);
    if (readyTimeout > 0) {
      target.readyTimer = window.setTimeout(() => {
        console.warn('[BKSameSiteChannel] iframe ready timeout', resolvedUrl);
        this.removeTarget(targetWindow, 'timeout');
      }, readyTimeout);
    }

    this._targets.set(targetWindow, target);
    const isTargetRegistered = () => this._targets.has(targetWindow);

    return {
      iframe,
      origin: normalizedOrigin,
      url: resolvedUrl,
      token,
      ready: readyPromise,
      get status() {
        return target.status;
      },
      get closed() {
        return !target.iframe.isConnected || !isTargetRegistered();
      },
      dispatch: (event) => {
        return this._dispatchToTarget(target, event);
      },
      destroy: () => {
        this.removeTarget(targetWindow, 'destroyed');
      },
    };
  }

  removeTarget(
    targetWindow: Window | null | undefined,
    readyState: SameSiteTargetReadyState = 'destroyed'
  ) {
    if (!targetWindow) return;

    const target = this._targets.get(targetWindow);
    if (!target) return;

    this._settleReady(target, readyState);
    target.iframe.remove();
    target.pending.length = 0;
    this._targets.delete(targetWindow);
  }

  dispatch(
    event: BKEventType,
    format?: (event: BKEventType) => unknown,
    options: SameSiteChannelOptions = {}
  ) {
    if (this._destroyed) return;
    const channelName = options.channelName || DEFAULT_CHANNEL_NAME;

    // 全局只执行一次 format，所有 target 与本页本地通知共用同一份 message。
    let message: unknown;
    try {
      message = typeof format === 'function' ? format(event) : event.message;
    } catch (error) {
      console.warn('[BKSameSiteChannel] build message failed', error);
      return;
    }

    const baseEvent: BKEventType = { type: event.type, message };

    this._targets.forEach((target, targetWindow) => {
      if (targetWindow.closed || !target.iframe.isConnected) {
        this.removeTarget(targetWindow);
        return;
      }
      if (target.channelName !== channelName) return;

      this._dispatchToTarget(target, baseEvent);
    });

    // 本地通知复用同一份 baseEvent，不再额外调用 format。
    this._notifyLocal(channelName, baseEvent);
  }

  /**
   * 按事件 type 返回可订阅的 Observable。
   * @param key      事件 type
   * @param initData 可选的初始数据。会通过 startWith 给每个订阅者各发一次；
   *                 即使值是 0 / '' / false 也照样发出。
   */
  observe(
    key: string,
    initData?: unknown,
    options: SameSiteChannelOptions = {}
  ): Observable<BKEventType> {
    if (this._destroyed) return EMPTY;

    const channelName = options.channelName || DEFAULT_CHANNEL_NAME;
    const subjectKey = this._getSubjectKey(channelName, key);
    let subject = this._subjects.get(subjectKey);

    if (!subject || subject.closed) {
      subject = new Subject<BKEventType>();
      this._subjects.set(subjectKey, subject);
      this._refCounts.set(subjectKey, 0);
    }

    const currentSubject = subject;

    return defer(() => {
      this._increaseRef(subjectKey);

      const base$ = currentSubject.asObservable();
      const source$ =
        initData !== undefined
          ? base$.pipe(startWith({ type: key, message: initData } as BKEventType))
          : base$;

      return source$.pipe(
        finalize(() => {
          this._decreaseRef(subjectKey);
        })
      );
    });
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    if (isBrowser()) {
      window.removeEventListener('message', this._messageHandler);
    }

    this._subjects.forEach((subject) => {
      subject.complete();
    });
    this._subjects.clear();
    this._refCounts.clear();

    this._targets.forEach((target) => {
      this._settleReady(target, 'destroyed');
      target.iframe.remove();
      target.pending.length = 0;
    });
    this._targets.clear();
  }
}

// -----------------------------------------------------------------------------
// 工具函数
// -----------------------------------------------------------------------------

const isBrowser = () => typeof window !== 'undefined';

const resolveUrl = (url: string) => {
  try {
    return new URL(url, isBrowser() ? window.location.href : undefined).href;
  } catch {
    return '';
  }
};

// 统一转成标准 origin，避免传入带 path / search 的 URL 影响比较和 postMessage 目标来源。
const normalizeOrigin = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch {
    return '';
  }
};

/**
 * 生成 128bit 随机 token（32 个 hex 字符）。
 * 优先使用 Web Crypto；退化到 Math.random 只是为了在极老环境下不至于崩掉，
 * 生产环境请确保运行在支持 crypto.getRandomValues 的浏览器中。
 */
const generateToken = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

// 把 token 追加到 iframe URL 的 hash 参数上，供目标页读取，避免进入服务端日志。
const appendTokenToUrl = (url: string, token: string): string => {
  try {
    const u = new URL(url);
    const rawHash = u.hash.replace(/^#/, '');
    const tokenParam = `${encodeURIComponent(TOKEN_PARAM_NAME)}=${encodeURIComponent(token)}`;
    const hashWithoutToken = rawHash
      .split('&')
      .filter((part) => {
        const [key] = part.split('=');

        return decodeURIComponent(key || '') !== TOKEN_PARAM_NAME;
      })
      .join('&');

    u.hash = hashWithoutToken ? `${hashWithoutToken}&${tokenParam}` : tokenParam;

    return u.href;
  } catch {
    return url;
  }
};

/**
 * 目标页侧使用：从当前 iframe URL 中读取由 addTarget 注入的通信 token。
 *
 * 目标页需要在所有发给父页面的消息中原样携带这个 token，否则会被父页面丢弃：
 *
 *   const token = readSameSiteChannelToken();
 *   window.parent.postMessage(
 *     { channel: 'bk_same_site_channel', token, event: { ... } },
 *     'https://bitkan.com'
 *   );
 */
const readSameSiteChannelToken = (): string | null => {
  if (!isBrowser()) return null;

  try {
    const url = new URL(window.location.href);

    return new URLSearchParams(url.hash.replace(/^#/, '')).get(TOKEN_PARAM_NAME);
  } catch {
    return null;
  }
};

// IP / localhost 不做站点后缀匹配，直接按原 hostname 比较。
const isLocalHost = (hostname: string): boolean => {
  if (hostname === 'localhost') return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.startsWith('[')) return true; // IPv6 形如 [::1]

  return false;
};

// 结构校验：channel 名为字符串 + token 为非空字符串 + event.type 为字符串。
const isSameSiteMessage = (
  data: unknown,
  channel: string,
  token: string | null
): data is SameSiteMessage => {
  if (!data || typeof data !== 'object') return false;

  const message = data as Partial<SameSiteMessage>;
  const event = message.event;

  return (
    typeof message.channel === 'string' &&
    message.channel.length > 0 &&
    message.channel === channel &&
    typeof message.token === 'string' &&
    message.token.length > 0 &&
    message.token === token &&
    !!event &&
    typeof event === 'object' &&
    typeof event.type === 'string'
  );
};

const postChannelMessage = (
  targetWindow: Window | null | undefined,
  targetOrigin: string,
  channel: string,
  type: string,
  message?: unknown
) => {
  const token = readSameSiteChannelToken();

  if (!targetWindow || !token) return false;

  targetWindow.postMessage({
    channel,
    token,
    event: {
      type,
      message,
    },
  }, targetOrigin);

  return true;
};

const bkSameSiteChannel = () => container.resolve(BKSameSiteChannel);

export {
  readSameSiteChannelToken,
  isSameSiteMessage,
  postChannelMessage,
  bkSameSiteChannel,
  BKSameSiteChannel,
}
