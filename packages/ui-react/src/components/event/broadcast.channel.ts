
/**
 * 基于浏览器 BroadcastChannel 的同源跨窗口事件总线。
 * dispatch 会同时通知当前页面和同源下其他打开的页面，observe 则按事件 type 返回可订阅的 Observable。
 * TIP：some.com 和 demo.some.com 不是同源，同站通信请使用 BKSameSiteChannel。
 *
 * auth: cyq@guangpu.info
 * create: cyq@guangpu.info  2026/90/20 10:24
 * update: cyq@guangpu.info  2026/10/28 18:43
 *
 * demo:
 * const broadcastChannel = bkBroadcastChannel();
 *
 * const subscription = broadcastChannel.observe('bot.action.success').subscribe((event) => {
 *   console.log(event?.message);
 * });
 *
 * broadcastChannel.dispatch({
 *   type: 'bot.action.success',
 *   message: { id: 1 },
 * });
 *
 * subscription.unsubscribe();
 */

import { BehaviorSubject, defer, finalize, Observable } from 'rxjs';

import { container, singleton } from '../di';

import type { BKEventType } from './type';

@singleton()
export class BKBroadcastChannel {
  private _observerMap = new Map<string, BehaviorSubject<BKEventType | null>>();

  private _observerRefMap = new Map<string, number>();

  private _channel = new BroadcastChannel('bk_window_channel');

  private _destroyed = false;

  constructor() {
    this._channel.onmessage = (event) => {
      const response: BKEventType = event.data;
      this._notifyLocal(response);
    };
  }
  
  private _notifyLocal(response: BKEventType) {
    if (this._destroyed) return;

    const observer = this._observerMap.get(response.type);

    if (!observer || observer.closed) return;

    observer.next(response);
  }

  // 订阅的时候 同一个事件被引用的次数 需要加 1
  private _increaseRef(key: string) {
    const count = this._observerRefMap.get(key) || 0;

    this._observerRefMap.set(key, count + 1);
  }

  // 取消订阅的时候 同一个事件被引用的次数 需要减 1
  private _decreaseRef(key: string) {
    const count = this._observerRefMap.get(key) || 0;
    const nextCount = Math.max(count - 1, 0);

    if (nextCount > 0) {
      this._observerRefMap.set(key, nextCount);
      return;
    }

    const observer = this._observerMap.get(key);

    observer?.complete();

    this._observerMap.delete(key);
    this._observerRefMap.delete(key);
  }

  dispatch(event: BKEventType, format?: (event: BKEventType) => unknown) {
    if (this._destroyed) return;
    const message = typeof format === 'function' ? format(event) : event.message;
    const response = { type: event.type, message };

    this._channel.postMessage(response);
    this._notifyLocal(response);
  }

  observe(key: string, initData: unknown = null): Observable<BKEventType | null> {
    if (this._destroyed) {
      return new Observable<BKEventType | null>((observer) => {
        observer.complete();
      });
    }

    let observer = this._observerMap.get(key);

    if (!observer || observer.closed) {
      observer = new BehaviorSubject<BKEventType | null>(null);
      this._observerMap.set(key, observer);
      this._observerRefMap.set(key, 0);
    }

    if (initData) {
      observer.next({
        type: key,
        message: initData,
      });
    }

    return defer(() => {
      this._increaseRef(key);

      return observer!.asObservable().pipe(
        finalize(() => {
          this._decreaseRef(key);
        })
      );
    });
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;
    this._channel.onmessage = null;
    this._channel.close();

    this._observerMap.forEach((observer) => {
      observer.complete();
    });

    this._observerMap.clear();
    this._observerRefMap.clear();
  }
}

export const bkBroadcastChannel = () => container.resolve(BKBroadcastChannel);
