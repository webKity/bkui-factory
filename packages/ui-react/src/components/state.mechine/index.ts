/**
 * 通用有限状态机工具。
 *
 * 关注点：
 * - 只描述状态、动作和状态转换，不绑定任何业务或 UI。
 * - 支持同步/异步 onEnter、onExit 生命周期。
 * - transition/reset 会等待初始化回调完成，避免初始化和后续转换交错。
 * - 默认对非法转换返回 false；开启 strict 后抛出错误，方便测试和调试。
 *
 * 注意：
 * - onEnter 回调失败时，状态已经切换（并且已记录历史），错误会抛给调用方。
 * - 在 INIT 的 onEnter 回调中调用 transition() 会立即抛错（避免死锁）。
 * - 在 onExit/onEnter 回调中调用 transition() 会返回 false（strict 下抛错）。
 */

import { BehaviorSubject } from 'rxjs';

export type IStateName = string;
export type IActionName = string;
export type IMaybePromise<T> = T | Promise<T>;
export type IStatusCallbackName = 'onEnter' | 'onExit';

export interface IStateCallbackContext<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> {
  from?: StateName;
  to: StateName;
  action: ActionName | 'INIT' | 'RESET';
  data?: Data;
}

/** resolver 只需要 from / action / data —— 不要给它 to，避免误导。 */
export interface ITransitionResolverContext<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> {
  from: StateName;
  action: ActionName;
  data?: Data;
}

export interface IStateCallback<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> {
  onEnter?: (context: IStateCallbackContext<StateName, ActionName, Data>) => IMaybePromise<void>;
  onExit?: (context: IStateCallbackContext<StateName, ActionName, Data>) => IMaybePromise<void>;
}

export interface IState<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> extends IStateCallback<StateName, ActionName, Data> {
  name?: StateName;
}

export type ITransitionResolver<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> = (context: ITransitionResolverContext<StateName, ActionName, Data>) => StateName;

export type ITransitionTarget<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> = StateName | ITransitionResolver<StateName, ActionName, Data>;

export type IStateTransitions<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> = Partial<
  Record<
    StateName,
    Partial<Record<ActionName, ITransitionTarget<StateName, ActionName, Data>>>
  >
>;

export interface IStateMachineConfig<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> {
  initial: StateName;
  states: Record<StateName, IState<StateName, ActionName, Data>>;
  transitions?: IStateTransitions<StateName, ActionName, Data>;
  strict?: boolean;
  maxHistory?: number;
}

export interface IStateActionHistory<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> {
  timestamp: Date;
  state: StateName;
  action: ActionName | 'INIT' | 'RESET';
  from?: StateName;
  data?: Data;
}

export class StateMachine<
  StateName extends IStateName = IStateName,
  ActionName extends IActionName = IActionName,
  Data = unknown
> {
  private readonly _initialState: StateName;
  private readonly _states: Record<StateName, IState<StateName, ActionName, Data>>;
  private readonly _transitions: IStateTransitions<StateName, ActionName, Data>;
  private readonly _strict: boolean;
  private readonly _maxHistory?: number;

  private readonly _currentState$: BehaviorSubject<StateName>;
  private _isTransitioning = false;
  private _history: IStateActionHistory<StateName, ActionName, Data>[] = [];

  private readonly _ready: Promise<void>;
  private _readyCompleted = false;
  private _initializationError?: Error;

  /** 标记当前是否正在执行 INIT 的 onEnter 回调（防止死锁）。 */
  private _insideInitialCallback = false;

  constructor(config: IStateMachineConfig<StateName, ActionName, Data>) {
    this._validateConfig(config);

    this._initialState = config.initial;
    this._states = config.states;
    this._transitions = config.transitions ?? {};
    this._strict = !!config.strict;
    this._maxHistory = config.maxHistory;

    this._currentState$ = new BehaviorSubject<StateName>(config.initial);

    // 关键：_enterInitialState 内部不再 rethrow，错误记录到 _initializationError，
    // 从而 _ready 永远 resolve，不会产生 unhandled rejection。
    this._ready = this._enterInitialState();
  }

  private _validateConfig(config: IStateMachineConfig<StateName, ActionName, Data>) {
    if (!config || !config.initial || !config.states) {
      throw new Error('StateMachine requires initial state and states definition');
    }

    if (!config.states[config.initial]) {
      throw new Error(`Initial state "${config.initial}" is not defined in states`);
    }

    if (config.maxHistory !== undefined) {
      if (!Number.isInteger(config.maxHistory) || config.maxHistory < 0) {
        throw new Error('maxHistory must be a non-negative integer');
      }
    }

    Object.keys(config.states).forEach((stateName) => {
      const state = config.states[stateName as StateName];
      if (state?.name && state.name !== stateName) {
        throw new Error(`State key "${stateName}" does not match state.name "${state.name}"`);
      }
    });

    Object.entries(config.transitions ?? {}).forEach(([from, actions]) => {
      if (!config.states[from as StateName]) {
        throw new Error(`Transition source state "${from}" is not defined in states`);
      }

      Object.values(actions ?? {}).forEach((target) => {
        if (typeof target === 'function') return;
        if (!config.states[target as StateName]) {
          throw new Error(`Transition target state "${String(target)}" is not defined in states`);
        }
      });
    });
  }

  private async _enterInitialState() {
    this._insideInitialCallback = true;
    try {
      await this._callStateCallback(this._initialState, 'onEnter', {
        to: this._initialState,
        action: 'INIT',
      });
      this._pushHistory({
        state: this._initialState,
        timestamp: new Date(),
        action: 'INIT',
      });
    } catch (error) {
      this._initializationError =
        error instanceof Error ? error : new Error(String(error));
    } finally {
      this._insideInitialCallback = false;
      this._readyCompleted = true;
    }
  }

  private async _callStateCallback(
    state: StateName,
    callbackType: IStatusCallbackName,
    context: IStateCallbackContext<StateName, ActionName, Data>
  ) {
    const callback = this._states[state]?.[callbackType];
    if (typeof callback !== 'function') return;
    await callback(context);
  }

  private _pushHistory(history: IStateActionHistory<StateName, ActionName, Data>) {
    this._history.push(history);

    if (this._maxHistory === undefined) return;

    if (this._maxHistory === 0) {
      this._history = [];
    } else if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory);
    }
  }

  private _getTransitionTarget(from: StateName, action: ActionName) {
    return this._transitions[from]?.[action];
  }

  private _resolveTransitionTarget(
    target: ITransitionTarget<StateName, ActionName, Data>,
    from: StateName,
    action: ActionName,
    data?: Data
  ): StateName {
    if (typeof target !== 'function') return target;
    return target({ from, action, data });
  }

  private _handleInvalidTransition(from: StateName, action: ActionName) {
    const message = `Cannot transition from "${from}" with action "${action}"`;
    if (this._strict) throw new Error(message);
    return false;
  }

  /** 等待初始化完成；若初始化失败则抛出对应错误。 */
  private async _waitUntilReady() {
    await this._ready;
    if (this._initializationError) {
      throw this._initializationError;
    }
  }

  can(action: ActionName) {
    if (this._isTransitioning || this._initializationError) return false;
    return this._getTransitionTarget(this.state, action) !== undefined;
  }

  async transition(action: ActionName, data?: Data): Promise<boolean> {
    // 防止 INIT onEnter 中调用 transition 造成死锁。
    if (this._insideInitialCallback) {
      const message = 'Cannot call transition() from within the INIT onEnter callback';
      if (this._strict) throw new Error(message);
      return false;
    }

    await this._waitUntilReady();

    if (this._isTransitioning) {
      if (this._strict) throw new Error('State machine is already transitioning');
      return false;
    }

    const previousState = this.state;
    const target = this._getTransitionTarget(previousState, action);

    if (target === undefined) return this._handleInvalidTransition(previousState, action);

    this._isTransitioning = true;

    try {
      const nextState = this._resolveTransitionTarget(target, previousState, action, data);

      if (!this._states[nextState]) {
        throw new Error(`Transition target state "${nextState}" is not defined in states`);
      }

      const context: IStateCallbackContext<StateName, ActionName, Data> = {
        from: previousState,
        to: nextState,
        action,
        data,
      };

      await this._callStateCallback(previousState, 'onExit', context);

      this._currentState$.next(nextState);

      this._pushHistory({
        state: nextState,
        timestamp: new Date(),
        action,
        data,
        from: previousState,
      });

      // 注意：onEnter 抛错时状态已经切换、历史已经写入。
      await this._callStateCallback(nextState, 'onEnter', context);

      return true;
    } finally {
      this._isTransitioning = false;
    }
  }

  async reset(data?: Data): Promise<boolean> {
    if (this._insideInitialCallback) {
      const message = 'Cannot call reset() from within the INIT onEnter callback';
      if (this._strict) throw new Error(message);
      return false;
    }

    await this._waitUntilReady();

    if (this._isTransitioning) {
      if (this._strict) throw new Error('State machine is already transitioning');
      return false;
    }

    this._isTransitioning = true;

    try {
      const previousState = this.state;
      const context: IStateCallbackContext<StateName, ActionName, Data> = {
        from: previousState,
        to: this._initialState,
        action: 'RESET',
        data,
      };

      await this._callStateCallback(previousState, 'onExit', context);

      this._currentState$.next(this._initialState);
      this._history = [];
      this._pushHistory({
        state: this._initialState,
        timestamp: new Date(),
        action: 'RESET',
        from: previousState,
        data,
      });

      await this._callStateCallback(this._initialState, 'onEnter', context);

      return true;
    } finally {
      this._isTransitioning = false;
    }
  }

  /**
   * 直接把当前状态改成目标状态（不触发 onExit/onEnter，不写 history）。
   *
   * 用途：与外部系统（例如 URL、服务端返回）进行状态对齐。
   * 转换进行中、初始化未完成或初始化失败时会拒绝执行。
   */
  updateCurrentState(state: StateName): boolean {
    if (!this._states[state]) {
      console.warn(`State "${state}" is not defined in states`);
      return false;
    }

    if (!this._readyCompleted) {
      if (this._strict) throw new Error('Cannot update current state before initialization completes');
      console.warn('Cannot update current state before initialization completes');
      return false;
    }

    if (this._initializationError) {
      if (this._strict) throw this._initializationError;
      console.warn('Cannot update current state: initialization failed');
      return false;
    }

    if (this._isTransitioning) {
      if (this._strict) throw new Error('Cannot update current state while transitioning');
      console.warn('Cannot update current state while transitioning');
      return false;
    }

    this._currentState$.next(state);
    return true;
  }

  is(state: StateName) {
    return this.state === state;
  }

  isTransitioning() {
    return this._isTransitioning;
  }

  /** 初始化是否已完成（无论成功或失败）。 */
  isReady() {
    return this._readyCompleted && !this._initializationError;
  }

  /** 等待初始化完成；若初始化失败则 reject。 */
  async ready(): Promise<void> {
    await this._waitUntilReady();
  }

  /** 释放内部 BehaviorSubject（调用后 state$ 会 complete）。 */
  dispose() {
    this._currentState$.complete();
  }

  get state() {
    return this._currentState$.getValue();
  }

  get state$() {
    return this._currentState$.asObservable();
  }

  get history() {
    return [...this._history];
  }

  get states() {
    return Object.keys(this._states) as StateName[];
  }

  get transitions() {
    return { ...this._transitions };
  }
}