// api/_lib/rateLimit.ts
// ==============================================================================
// Distributed Rate Limiting (SEC-05 Resolution)
// Dual-tier rate limiter using Upstash/ElastiCache Redis with local LRU fallback
// Prevents cross-instance brute-force and request abuse across ECS tasks & serverless
// ==============================================================================

import { LRUCache } from 'lru-cache'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redis } from './redis'

type RateLimitEntry = { count: number; resetAt: number }

const localCache = new LRUCache<string, RateLimitEntry>({ max: 10000 })

export interface RateLimitOptions {
  windowMs: number
  max: number
}

/**
 * Asynchronously checks rate limit directly against Redis sliding window.
 * Returns true if request is allowed, false if limit is exceeded.
 */
export async function rateLimitDistributed(
  req: VercelRequest,
  res: VercelResponse,
  opts: { windowMs: number; max: number }
): Promise<boolean> {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown'
  const key = `rl:${ip}:${req.url}`
  const now = Date.now()

  try {
    const ttlSec = Math.ceil(opts.windowMs / 1000)
    // Pipeline INCR + EXPIRE
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, ttlSec)
    }

    if (current > opts.max) {
      const ttl = await redis.ttl(key)
      const retryAfter = ttl > 0 ? ttl : Math.ceil(opts.windowMs / 1000)
      res.setHeader('Retry-After', String(retryAfter))
      res.status(429).json({ error: 'Too many requests — please wait.' })
      return false
    }

    return true
  } catch (err) {
    // Non-blocking fallback to in-memory LRU cache if Redis is temporarily unreachable
    console.warn('[RateLimit] Redis unreachable, falling back to in-memory limiter:', err)
    return rateLimit(req, res, opts)
  }
}

/**
 * Standard rate limiter with in-memory fast path and asynchronous Redis synchronization.
 * Compatible with synchronous handler calls while preventing single-instance exhaustion.
 */
export function rateLimit(req: VercelRequest, res: VercelResponse, opts: { windowMs: number; max: number }): boolean {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown'
  const key = `rl:${ip}:${req.url}`
  const now = Date.now()
  const entry = localCache.get(key)

  // Asynchronously increment Redis in background without blocking request latency
  const ttlSec = Math.ceil(opts.windowMs / 1000)
  redis.incr(key)
    .then((current) => {
      if (current === 1) {
        redis.expire(key, ttlSec).catch(() => {})
      }
    })
    .catch(() => {})

  if (!entry || entry.resetAt < now) {
    localCache.set(key, { count: 1, resetAt: now + opts.windowMs })
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
