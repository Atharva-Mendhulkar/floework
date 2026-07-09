import { Redis } from '@upstash/redis'

// Initialize Upstash Redis client
// Make sure to add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to environment variables
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://fake-redis.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'fake-token',
})
