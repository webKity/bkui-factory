import { Observable, BehaviorSubject } from 'rxjs';

export interface IBKDomService {
  uid: string;
  tagName: string;
  update$: Observable<any>;
  
  setData: (key: string, value: any) => void;
  getData: (key: string) => any;
}

export interface IFormValidata { result: boolean;  errors: IFormError[]; }
export interface IFormError { name: string; message: string; }

/**
 * 基础 DOM 服务类 - 所有 UI 元素的基类
 * 功能：单一元素的数据管理、状态更新、响应式通知
 * 适用场景：简单 UI 元素（按钮、文本、开关等）
 * iOS 类比：UIView 基类
 */
export class BKDomService implements IBKDomService {
  public uid = '';
  public tagName = '';

  private _data: Record<string, any> = {};
  private _update$: BehaviorSubject<Record<string, any>>;

  constructor(uid: string, tag: string, data: any = {}) {
    this.uid = uid;
    this.tagName = tag;
    this._data = this.cloneRecord(data);
    this._update$ = new BehaviorSubject<Record<string, any>>({ ...this._data });
  } 

  public setData(key: string, value: any) {
    this._data[key] = this.cloneValue(value);
    this._update$.next({ ...this._data });
  }

  public getData(key: string) {
    return this.cloneValue(this._data[key]);
  }

  public destroy() {
    this._update$.complete();
  }

  get update$() {
    return this._update$.asObservable();
  }

  private cloneRecord(value: any): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return { ...value };
  }

  private cloneValue(value: any) {
    if (Array.isArray(value)) {
      return [...value];
    }

    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      return { ...value };
    }

    return value;
  }
}
