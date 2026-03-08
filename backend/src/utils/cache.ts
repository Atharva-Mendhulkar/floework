import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    reconnectOnError: () => true,
});

redis.on('error', (err) => {
    // Non-fatal — app continues without Redis if unavailable
    if (process.env.NODE_ENV !== 'test') {
        console.warn('[redis] Connection error (caching disabled):', err.message);
    }
});

export const TTL_SECONDS = 15 * 60; // 15 minutes

export async function getOrSet<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>
): Promise<T> {
    try {
        if (redis.status !== 'ready') throw new Error('Redis not ready');
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached) as T;
        const value = await fn();
        await redis.set(key, JSON.stringify(value), 'EX', ttl);
        return value;
    } catch {
        // Cache miss — fall through to DB
        return fn();
    }
}

export async function invalidate(key: string) {
    try {
        await redis.del(key);
    } catch { /* silent */ }
}
