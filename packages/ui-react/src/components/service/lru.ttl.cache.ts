
/**
 * 带容量上限和有效期的通用缓存服务。
 *
 * - `ttl` 控制单条缓存最长存活时间，单位毫秒；传 `0` 表示不过期。
 * - `maxSize` 控制最多缓存条数。
 * - 写入后若超过 `maxSize`，会先清理过期数据，再按先入先出顺序删除最早写入的数据。
 *
 * 基本使用：
 *
 * ```ts
 * const cache = lruTTLCacheServiceFactory<UserInfo>('user.info', {
 *   maxSize: 100,
 *   ttl: 5 * 60 * 1000,
 * });
 *
 * cache.set('user-id', userInfo);
 * const userInfo = cache.get('user-id');
 * ```
 */
export type ILRUTTLCacheOptions = {
  maxSize?: number;
  ttl?: number;
}

type ICacheRecord<T> = {
  value: T;
  expiredAt: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL = 5 * 60 * 1000;

export class LRUTTLCacheService<T> {
  private _cache = new Map<string, ICacheRecord<T>>();
  private _maxSize: number;
  private _ttl: number;

  constructor(options: ILRUTTLCacheOptions = {}) {
    this._maxSize = Math.max(1, options.maxSize || DEFAULT_MAX_SIZE);
    this._ttl = Math.max(0, options.ttl ?? DEFAULT_TTL);
  }

  private getExpiredAt(now: number) {
    return this._ttl ? now + this._ttl : Number.POSITIVE_INFINITY;
  }

  private isExpired(record: ICacheRecord<T>, now = Date.now()) {
    return record.expiredAt <= now;
  }

  private deleteExpired(now = Date.now()) {
    this._cache.forEach((record, key) => {
      if (this.isExpired(record, now)) {
        this._cache.delete(key);
      }
    });
  }

  private trim() {
    this.deleteExpired();

    while (this._cache.size > this._maxSize) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey === undefined) return;

      this._cache.delete(firstKey);
    }
  }

  set(key: string, value: T) {
    const now = Date.now();

    this._cache.delete(key);
    this._cache.set(key, {
      value,
      expiredAt: this.getExpiredAt(now),
    });
    this.trim();
  }

  get(key: string): T | undefined {
    const record = this._cache.get(key);
    if (!record) return undefined;

    if (this.isExpired(record)) {
      this._cache.delete(key);
      return undefined;
    }

    return record.value;
  }

  has(key: string) {
    return this.get(key) !== undefined;
  }

  delete(key: string) {
    return this._cache.delete(key);
  }

  clear() {
    this._cache.clear();
  }

  configure(options: ILRUTTLCacheOptions = {}) {
    if (options.maxSize !== undefined) {
      this._maxSize = Math.max(1, options.maxSize);
    }

    if (options.ttl !== undefined) {
      this._ttl = Math.max(0, options.ttl);
    }

    this.trim();
  }

  forEach(callback: (value: T, key: string) => void) {
    this.deleteExpired();
    this._cache.forEach((record, key) => callback(record.value, key));
  }

  get size() {
    this.deleteExpired();
    return this._cache.size;
  }
}
