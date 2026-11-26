'use client';
// In-memory LRU cache with optional TTL
interface CacheEntry<T> { value: T; expires: number; }

export class LRUCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 500) { this.maxSize = maxSize; }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) { this.map.delete(key); return undefined; }
    // LRU: move to end
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs = 60_000) {
    if (this.map.has(key)) this.map.delete(key);
    if (this.map.size >= this.maxSize) {
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, { value, expires: Date.now() + ttlMs });
  }

  delete(key: string) { this.map.delete(key); }
  clear() { this.map.clear(); }
  get size() { return this.map.size; }
}

export const userCache    = new LRUCache(1000);
export const chatCache    = new LRUCache(500);
export const messageCache = new LRUCache(2000);
