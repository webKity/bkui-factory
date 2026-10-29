type NextTask = (result?: any) => void;
export type ITaskQueueItem = (data: any, next: NextTask) => void;

export interface ITaskQueue {
  use: (task: ITaskQueueItem) => ITaskQueue;
  run: (data?: any) => void
}

export class TaskQueue implements ITaskQueue {
  private _queue: ITaskQueueItem[] = [];

  use(task: ITaskQueueItem) {
    this._queue.push(task);
    return this;
  }

  run(data?: any) {
    const next = (result?: any) => {
      const task = this._queue.shift();
      task && task(result, next);
    }

    next(data);
  }

  clear() {
    this._queue = [];
  }
}
