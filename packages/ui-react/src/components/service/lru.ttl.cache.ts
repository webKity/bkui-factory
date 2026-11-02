/**
 * 带容量上限和有效期的通用 LRU 缓存服务。
 *
 * - `ttl` 控制单条缓存最长存活时间，单位毫秒；传 `0` 表示不过期。
 * - `maxSize` 控制最多缓存条数。
 * - 写入或读取命中后，记录会被视为“最近使用”；容量超出时，
 *   先清理过期数据，再按最久未使用（LRU）顺序淘汰。
 * - `configure` 修改 `ttl` 只影响之后写入的记录，不会改写已有记录的过期时间。
 *
 * 基本使用：
 *
 * ```ts
 * const cache = new LRUTTLCacheService<UserInfo>({
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
};

type ICacheRecord<T> = {
  value: T;
  expiredAt: number;
};

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL = 5 * 60 * 1000;

export class LRUTTLCacheService<T> {
  private _cache = new Map<string, ICacheRecord<T>>();
  private _maxSize: number;
  private _ttl: number;

  constructor(options: ILRUTTLCacheOptions = {}) {
    this._maxSize = Math.max(1, options.maxSize ?? DEFAULT_MAX_SIZE);
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

  private touch(key: string, record: ICacheRecord<T>) {
    this._cache.delete(key);
    this._cache.set(key, record);
  }

  private readRecord(key: string): ICacheRecord<T> | undefined {
    const record = this._cache.get(key);
    if (!record) return undefined;
    if (this.isExpired(record)) {
      this._cache.delete(key);
      return undefined;
    }
    return record;
  }

  private trim() {
    // 未超容量时不做全量扫描
    if (this._cache.size <= this._maxSize) return;

    this.deleteExpired();
    while (this._cache.size > this._maxSize) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey === undefined) return;
      this._cache.delete(firstKey);
    }
  }

  set(key: string, value: T) {
    const record: ICacheRecord<T> = {
      value,
      expiredAt: this.getExpiredAt(Date.now()),
    };
    // 先删后写，更新后的 key 位于 Map 末尾（最近使用）
    this._cache.delete(key);
    this._cache.set(key, record);
    this.trim();
  }

  /** 读取并标记为最近使用。 */
  get(key: string): T | undefined {
    const record = this.readRecord(key);
    if (!record) return undefined;
    this.touch(key, record);
    return record.value;
  }

  /** 读取但不影响 LRU 顺序。 */
  peek(key: string): T | undefined {
    return this.readRecord(key)?.value;
  }

  /** 判断存在且未过期，不影响 LRU 顺序。 */
  has(key: string) {
    return this.readRecord(key) !== undefined;
  }

  delete(key: string) {
    return this._cache.delete(key);
  }

  clear() {
    this._cache.clear();
  }

  /** 主动清理所有过期记录。 */
  prune() {
    this.deleteExpired();
  }

  /**
   * O(n)。清理过期项后返回**精确有效**的条目数。
   * 若只需 O(1) 的粗略条目数（可能含未清理的过期项），使用 `size`。
   */
  count() {
    this.deleteExpired();
    return this._cache.size;
  }

  configure(options: ILRUTTLCacheOptions = {}) {
    if (options.maxSize !== undefined) {
      this._maxSize = Math.max(1, options.maxSize);
    }
    if (options.ttl !== undefined) {
      // 只影响之后写入的记录，不回溯修改已有记录的过期时间
      this._ttl = Math.max(0, options.ttl);
    }
    this.trim();
  }

  forEach(callback: (value: T, key: string) => void) {
    this.deleteExpired();
    // 用快照遍历，回调中修改缓存不会导致遍历异常
    Array.from(this._cache.entries()).forEach(([key, record]) => {
      callback(record.value, key);
    });
  }

  /**
   * O(1)。返回当前 Map 条目数，**可能包含尚未被清理的过期项**。
   * 需要精确有效数量时使用 `count()`。
   */
  get size() {
    return this._cache.size;
  }
}