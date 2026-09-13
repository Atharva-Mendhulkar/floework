import https from 'https'
import { Redis } from '@upstash/redis'

// Fail loudly in production when Upstash Redis is not configured.
// In test/dev, a stub keeps unit tests hermetic (all Redis calls are
// caught by callers which fall back to in-memory caches).
const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

if (process.env.NODE_ENV === 'production' && (!url || !token)) {
  throw new Error(
    'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production'
  )
}

export const redis = new Redis({
  url: url || 'https://localhost.upstash.io',
  token: token || 'not-configured',
  // Fail fast against an unreachable endpoint; callers fall back to in-memory caches.
  retry: { retries: 1 },
  agent: new https.Agent({ timeout: 3000 })
})
