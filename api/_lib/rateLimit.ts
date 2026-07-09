// api/lib/rateLimit.ts
import { LRUCache } from 'lru-cache'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type RateLimitEntry = { count: number; resetAt: number }

const cache = new LRUCache<string, RateLimitEntry>({ max: 5000 })

/**
 * Simple sliding-window rate limiter using an in-memory LRU cache.
 * Note: In Vercel serverless environments, memory is not shared between 
 * different function instances. This works best for low-traffic or 
 * as a basic protection layer. For robust production rate limiting, 
 * use Upstash Redis.
 */
export function rateLimit(req: VercelRequest, res: VercelResponse, opts: { windowMs: number; max: number }): boolean {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
  const key = `rl:${ip}:${req.url}`
  const now = Date.now()
  const entry = cache.get(key)

  if (!entry || entry.resetAt < now) {
    cache.set(key, { count: 1, resetAt: now + opts.windowMs })
    return true
  }

  entry.count++
  if (entry.count > opts.max) {
    res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
    res.status(429).json({ error: 'Too many requests — please wait.' })
    return false
  }

  return true
}
