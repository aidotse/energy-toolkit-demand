/**
 * @fileoverview Simple LRU cache for query results.
 *
 * Cache has no TTL since the data is static at runtime.
 * Cache is cleared on server restart. Max entries with LRU eviction.
 *
 * @module cache
 */

/**
 * Internal cache store
 * @type {Map<string, any>}
 */
const queryCache = new Map();

/** Maximum number of cached entries before LRU eviction */
const QUERY_CACHE_MAX = 500;

let hits = 0;
let misses = 0;

/**
 * Get cached query result
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
function getCachedQuery(key) {
  const data = queryCache.get(key);
  if (data !== undefined) {
    // Move to end (most recently used) by re-inserting
    queryCache.delete(key);
    queryCache.set(key, data);
    hits++;
    return data;
  }
  misses++;
  return null;
}

/**
 * Set query result in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function setCachedQuery(key, data) {
  // LRU eviction: if at max capacity, delete oldest (first) entry
  if (queryCache.size >= QUERY_CACHE_MAX) {
    const oldestKey = queryCache.keys().next().value;
    queryCache.delete(oldestKey);
  }
  queryCache.set(key, data);
}

/**
 * Clear the entire cache (useful for testing)
 */
function clearCache() {
  queryCache.clear();
  hits = 0;
  misses = 0;
}

/**
 * Get current cache size (useful for testing)
 * @returns {number}
 */
function cacheSize() {
  return queryCache.size;
}

/**
 * Get cache stats for the /_health endpoint.
 * @returns {{ hits: number, misses: number, size: number, maxSize: number }}
 */
function getCacheStats() {
  return { hits, misses, size: queryCache.size, maxSize: QUERY_CACHE_MAX };
}

export { getCachedQuery, setCachedQuery, clearCache, cacheSize, getCacheStats, QUERY_CACHE_MAX };
