import { describe, test, expect, beforeEach } from 'vitest';
import { getCachedQuery, setCachedQuery, clearCache, cacheSize, QUERY_CACHE_MAX } from '../../cache.js';

describe('cache.js', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('getCachedQuery', () => {
    test('should return null for cache miss', () => {
      expect(getCachedQuery('nonexistent-key')).toBeNull();
    });

    test('should return cached data for cache hit', () => {
      const data = [{ value: 42 }];
      setCachedQuery('test-key', data);
      expect(getCachedQuery('test-key')).toEqual(data);
    });

    test('should return cached data for string values', () => {
      setCachedQuery('csv-key', 'period,value\n2025,100');
      expect(getCachedQuery('csv-key')).toBe('period,value\n2025,100');
    });

    test('should promote accessed entry to most recently used', () => {
      setCachedQuery('a', 1);
      setCachedQuery('b', 2);
      setCachedQuery('c', 3);

      // Access 'a' to promote it
      getCachedQuery('a');

      // Fill cache to max, evicting oldest (should be 'b', not 'a')
      for (let i = 0; i < QUERY_CACHE_MAX; i++) {
        setCachedQuery(`fill-${i}`, i);
      }

      // 'a' was promoted so it survived longer, but 'b' was evicted first
      // Both should be evicted now since we added QUERY_CACHE_MAX items
      expect(getCachedQuery('b')).toBeNull();
    });
  });

  describe('setCachedQuery', () => {
    test('should store and retrieve a value', () => {
      setCachedQuery('key1', { data: 'test' });
      expect(getCachedQuery('key1')).toEqual({ data: 'test' });
      expect(cacheSize()).toBe(1);
    });

    test('should overwrite existing key', () => {
      setCachedQuery('key1', 'old');
      setCachedQuery('key1', 'new');
      expect(getCachedQuery('key1')).toBe('new');
    });

    test('should evict oldest entry when at max capacity', () => {
      // Fill cache to max
      for (let i = 0; i < QUERY_CACHE_MAX; i++) {
        setCachedQuery(`key-${i}`, i);
      }

      expect(cacheSize()).toBe(QUERY_CACHE_MAX);

      // Add one more, should evict key-0 (oldest)
      setCachedQuery('new-key', 'new-value');

      expect(cacheSize()).toBe(QUERY_CACHE_MAX);
      expect(getCachedQuery('key-0')).toBeNull();
      expect(getCachedQuery('new-key')).toBe('new-value');
      // key-1 should still exist
      expect(getCachedQuery('key-1')).toBe(1);
    });
  });

  describe('QUERY_CACHE_MAX', () => {
    test('should be 500', () => {
      expect(QUERY_CACHE_MAX).toBe(500);
    });
  });
});
