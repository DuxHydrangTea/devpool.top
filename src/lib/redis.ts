import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;
let isInitialized = false;

export function getRedis(): Redis | null {
  if (isInitialized) return redisClient;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      isInitialized = true;
    } catch (err) {
      console.error("Failed to initialize Upstash Redis client:", err);
      isInitialized = true;
      redisClient = null;
    }
  }

  return redisClient;
}

// Proxy export for transparent usage: redis.get(), redis.set(), etc.
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedis();
    if (!client) return undefined;
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
