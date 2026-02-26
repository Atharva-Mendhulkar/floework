import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Configure Redis Client
export const redis = new Redis(redisUrl, {
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
});

redis.on('connect', () => {
    console.log('✅ Successfully connected to Redis');
});

let hasLoggedRedisError = false;

redis.on('error', (err) => {
    if (!hasLoggedRedisError) {
        console.warn('⚠️ Redis Connection Error. Have you started redis-server? Falling back to graceful degradation.');
        console.warn(err.message);
        hasLoggedRedisError = true;
    }
});
