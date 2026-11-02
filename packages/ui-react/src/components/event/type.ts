
export interface IBKEvent {
	readonly name: string;
  once(type: string, listener: (event: BKEventType) => void): void;
  addEventListener(type: string, listener: (event: BKEventType) => void): void;
  has(type: string, listener: (event: BKEventType) => void): boolean;
  remove(type: string, listener: (event: BKEventType) => void): void;
  dispatch(event: BKEventType): void;
}
export interface BKEventType {
  type: string;
  message?: any;
  target?: any;
}

export interface Event<T> {
	(listener: (e: T) => any, args?: any): void;
}
