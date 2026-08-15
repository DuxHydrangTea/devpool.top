import { redis, getRedis } from "./redis";

// ==========================================
// 1. IN-MEMORY LRU CACHE WITH TTL & STATS
// ==========================================
interface CacheEntry<T> {
  value: T;
  expiresAt: number; // timestamp in ms
}

export class LRUCache<K, V> {
  private capacity: number;
  private defaultTTL: number; // in seconds
  private cache: Map<K, CacheEntry<V>>;
  public hits: number = 0;
  public misses: number = 0;

  constructor(capacity: number = 500, defaultTTL: number = 3600) {
    this.capacity = capacity;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
  }

  public get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh LRU position (delete & re-insert)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  public set(key: K, value: V, ttlSeconds?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest item (first key in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const ttl = (ttlSeconds !== undefined ? ttlSeconds : this.defaultTTL) * 1000;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  public has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  public delete(key: K): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public get size(): number {
    return this.cache.size;
  }

  public getStats() {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? (this.hits / total) * 100 : 100;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: Number(ratio.toFixed(1)),
    };
  }
}

// Global L1 Memory Instances
const l1ArticleCache = new LRUCache<string, any>(500, 3600); // 500 articles, 1 hour TTL
const l1SiteTreeCache = new LRUCache<string, any>(10, 1800); // 10 tree snapshots, 30 min TTL

// Redis Key Prefixes & TTLs (in seconds)
const REDIS_PREFIX_ARTICLE = "doc:art:";
const REDIS_PREFIX_TREE = "site:nav:tree";
const REDIS_TTL_ARTICLE = 7 * 24 * 3600; // 7 days
const REDIS_TTL_TREE = 24 * 3600; // 1 day

// ==========================================
// 2. HYBRID CACHE API (L1 MEMORY + L2 REDIS)
// ==========================================

/**
 * Get cached article data (Checks L1 Memory -> L2 Upstash Redis)
 */
export async function getArticleCache(slug: string): Promise<any | null> {
  // 1. Try L1 Memory Cache (0ms)
  const l1Data = l1ArticleCache.get(slug);
  if (l1Data) {
    return l1Data;
  }

  // 2. Try L2 Upstash Redis (~15ms)
  if (getRedis()) {
    try {
      const redisKey = `${REDIS_PREFIX_ARTICLE}${slug}`;
      const cached = await redis.get<any>(redisKey);
      if (cached) {
        // Populate L1 cache for subsequent requests
        l1ArticleCache.set(slug, cached, 3600);
        return cached;
      }
    } catch (err) {
      console.error(`[Redis] Error getting article cache for ${slug}:`, err);
    }
  }

  return null;
}

/**
 * Set article cache in both L1 Memory and L2 Upstash Redis
 */
export async function setArticleCache(slug: string, data: any): Promise<void> {
  // 1. Set L1 Memory Cache
  l1ArticleCache.set(slug, data, 3600);

  // 2. Set L2 Upstash Redis (non-blocking)
  if (getRedis()) {
    try {
      const redisKey = `${REDIS_PREFIX_ARTICLE}${slug}`;
      await redis.set(redisKey, data, { ex: REDIS_TTL_ARTICLE });
    } catch (err) {
      console.error(`[Redis] Error setting article cache for ${slug}:`, err);
    }
  }
}

/**
 * Invalidate article cache from both L1 and L2
 */
export async function invalidateArticle(slug: string): Promise<void> {
  l1ArticleCache.delete(slug);

  if (getRedis()) {
    try {
      const redisKey = `${REDIS_PREFIX_ARTICLE}${slug}`;
      await redis.del(redisKey);
    } catch (err) {
      console.error(`[Redis] Error deleting article cache for ${slug}:`, err);
    }
  }
}

/**
 * Get cached site navigation tree (Categories + Articles metadata)
 */
export async function getSiteTreeCache(): Promise<{ categories: any[]; articles: any[] } | null> {
  const l1Data = l1SiteTreeCache.get("tree");
  if (l1Data) {
    return l1Data;
  }

  if (getRedis()) {
    try {
      const cached = await redis.get<{ categories: any[]; articles: any[] }>(REDIS_PREFIX_TREE);
      if (cached && Array.isArray(cached.categories) && Array.isArray(cached.articles)) {
        l1SiteTreeCache.set("tree", cached, 1800);
        return cached;
      }
    } catch (err) {
      console.error("[Redis] Error getting site tree cache:", err);
    }
  }

  return null;
}

/**
 * Set site navigation tree cache in both L1 and L2
 */
export async function setSiteTreeCache(data: { categories: any[]; articles: any[] }): Promise<void> {
  l1SiteTreeCache.set("tree", data, 1800);

  if (getRedis()) {
    try {
      await redis.set(REDIS_PREFIX_TREE, data, { ex: REDIS_TTL_TREE });
    } catch (err) {
      console.error("[Redis] Error setting site tree cache:", err);
    }
  }
}

/**
 * Invalidate site navigation tree cache (when categories/articles tree structure changes)
 */
export async function invalidateSiteTree(): Promise<void> {
  l1SiteTreeCache.clear();

  if (getRedis()) {
    try {
      await redis.del(REDIS_PREFIX_TREE);
    } catch (err) {
      console.error("[Redis] Error invalidating site tree cache:", err);
    }
  }
}

/**
 * Clear all cache entries in both RAM and Upstash Redis
 */
export async function clearAllCache(): Promise<{ memoryCount: number; redisCleared: boolean }> {
  const memCount = l1ArticleCache.size;
  l1ArticleCache.clear();
  l1SiteTreeCache.clear();

  let redisCleared = false;
  if (getRedis()) {
    try {
      // Find and delete all doc:art:* keys and tree key
      const keys = await redis.keys(`${REDIS_PREFIX_ARTICLE}*`);
      const allKeys = [...keys, REDIS_PREFIX_TREE];
      if (allKeys.length > 0) {
        await redis.del(...allKeys);
      }
      redisCleared = true;
    } catch (err) {
      console.error("[Redis] Error clearing all cache:", err);
    }
  }

  return { memoryCount: memCount, redisCleared };
}

/**
 * Get unified cache metrics for Admin Dashboard
 */
export async function getCacheStats() {
  const stats = l1ArticleCache.getStats();
  let redisKeysCount = 0;
  const isRedisActive = !!getRedis();

  if (isRedisActive) {
    try {
      const keys = await redis.keys(`${REDIS_PREFIX_ARTICLE}*`);
      redisKeysCount = keys.length;
    } catch (e) {
      // ignore
    }
  }

  return {
    memoryEntries: stats.size,
    redisEntries: redisKeysCount,
    redisConnected: isRedisActive,
    hits: stats.hits,
    misses: stats.misses,
    hitRatio: stats.hitRatio,
  };
}

// ==========================================
// 3. BACKWARD-COMPATIBLE ADAPTER (articleCache)
// ==========================================
export const articleCache = {
  get: (key: string) => l1ArticleCache.get(key),
  set: (key: string, value: any) => {
    setArticleCache(key, value);
  },
  delete: (key: string) => {
    invalidateArticle(key);
    return true;
  },
  has: (key: string) => l1ArticleCache.has(key),
  clear: () => {
    clearAllCache();
  },
  get size() {
    return l1ArticleCache.size;
  },
};
