// src/cache/cache.ts
// Base Cache interface

export interface Cache<TKey extends string, TValue> {
  get(key: TKey): TValue | undefined;
  set(key: TKey, value: TValue): void;
  has(key: TKey): boolean;
  delete(key: TKey): void;
  clear(): void;
  readonly size: number;
}
