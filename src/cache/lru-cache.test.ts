// src/cache/lru-cache.test.ts
// Unit tests for LRUCache

import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from './lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3, 1000); // maxSize=3, ttl=1000ms
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove a key from the cache', () => {
      cache.set('a', 1);
      cache.delete('a');
      expect(cache.get('a')).toBeUndefined();
      expect(cache.has('a')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries from the cache', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return the number of entries', () => {
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict the least recently used item when at capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // Cache is full (3 items)
      expect(cache.size).toBe(3);
      
      // Adding a 4th item should evict 'a' (least recently used)
      cache.set('d', 4);
      expect(cache.size).toBe(3);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update access order on get', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // Access 'a' to make it most recently used
      cache.get('a');
      
      // Adding a 4th item should now evict 'b' (least recently used)
      cache.set('d', 4);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('TTL expiration', () => {
    it('should return undefined for expired entries', async () => {
      const shortTtlCache = new LRUCache<string, number>(3, 10); // 10ms TTL
      shortTtlCache.set('a', 1);
      
      expect(shortTtlCache.get('a')).toBe(1);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(shortTtlCache.get('a')).toBeUndefined();
    });
  });
});
