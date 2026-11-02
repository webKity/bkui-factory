export type NextTask<T = any> = (result?: T) => void;

export type ITaskQueueItem<T = any> = (
  data: T,
  next: NextTask<T>
) => void | Promise<void>;

export interface ITaskQueue<T = any> {
  use: (task: ITaskQueueItem<T>) => ITaskQueue<T>;
  run: (data?: T) => void;
  runAsync: (data?: T) => Promise<T | undefined>;
  clear: () => void;
}

export class TaskQueue<T = any> implements ITaskQueue<T> {
  private _queue: ITaskQueueItem<T>[] = [];

  use(task: ITaskQueueItem<T>): this {
    if (typeof task !== 'function') {
      throw new TypeError('TaskQueue.use() expects a function');
    }
    this._queue.push(task);
    return this;
  }

  /**
   * 同步执行任务链（不消费队列，可重复 `run`）。
   *
   * - 任务通过 `next` 推进；`next` 每次推进只应调用一次。
   * - 任务返回的 Promise 不会被 `run` 等待，仅依赖任务内部调用 `next` 推进。
   * - 同步任务链通过内部循环推进，**不会因任务数量大而栈溢出**。
   * - 任务同步抛错会向上冒泡；异步抛错无法被 `run` 捕获。
   */
  run(data?: T) {
    const queue = [...this._queue];
    let index = 0;
    let current = data;

    const step = () => {
      while (index < queue.length) {
        const task = queue[index++];
        let called = false;
        // 任务执行期间同步调用 next 时标记为 true，由 while 继续推进
        let syncCall = true;

        const next: NextTask<T> = (result?: T) => {
          if (called) return;
          called = true;
          current = result;
          // 异步（或任务返回后）调用 next，递归进入下一轮
          if (!syncCall) step();
        };

        task(current as T, next);
        syncCall = false;

        // 任务异步推进，等待 next 被调用
        if (!called) return;
        // 任务同步调用了 next，while 继续，无递归
      }
    };

    step();
  }

  /**
   * 异步执行任务链，全部完成后 resolve 最终结果。
   *
   * - 任务可以是同步的（直接调用 `next`），也可以返回 Promise。
   * - 任务返回 Promise 时，`runAsync` 会等待它完成；期间若调用了 `next`，
   *   以 `next` 的 result 为准；若未调用 `next` 就完成，则当前值保持不变。
   * - 任一任务抛错或返回 rejected Promise，链会中断并 reject。
   * - 任务之间通过 `await` 推进，**不会累积调用栈**，适合大量任务。
   */
  async runAsync(data?: T): Promise<T | undefined> {
    const queue = [...this._queue];
    let current = data;
    for (const task of queue) {
      current = await this.runOneTask(task, current as T);
    }
    return current;
  }

  private runOneTask(
    task: ITaskQueueItem<T>,
    data: T
  ): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const next: NextTask<T> = (result?: T) => {
        settle(() => resolve(result));
      };

      try {
        const ret = task(data, next);
        if (ret && typeof (ret as Promise<void>).then === 'function') {
          (ret as Promise<void>).then(
            () => settle(() => resolve(data)),
            (err) => settle(() => reject(err))
          );
        }
      } catch (err) {
        settle(() => reject(err));
      }
    });
  }

  clear() {
    this._queue = [];
  }

  get size() {
    return this._queue.length;
  }
}