// Set mock environment variables before imports
process.env.SUPABASE_URL = 'https://mock.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key'
process.env.NODE_ENV = 'test'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import { createServer } from '../../api/server'
import { rateLimit } from '../../api/_lib/rateLimit'
import type { VercelRequest, VercelResponse } from '@vercel/node'

describe('Phase 4: Modular API Server & Health Check Probes', () => {
  let server: http.Server
  let baseUrl: string

  beforeAll(async () => {
    server = createServer()
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('GET /health returns HTTP 200 with service health payload for ALB probe', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.status).toBe('healthy')
    expect(data.service).toBe('floework-api')
    expect(typeof data.uptime_seconds).toBe('number')
    expect(data.timestamp).toBeDefined()
  })

  it('GET /healthz alias returns HTTP 200 for container orchestrator readiness', async () => {
    const res = await fetch(`${baseUrl}/healthz`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('healthy')
  })

  it('GET /unmatched-route returns HTTP 404 with available endpoint catalog', async () => {
    const res = await fetch(`${baseUrl}/non-existent-endpoint`)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Not Found')
    expect(Array.isArray(data.available_endpoints)).toBe(true)
  })

  it('SEC-05: rateLimit allows requests under threshold and blocks on exceeding max', () => {
    const mockReq = {
      headers: { 'x-forwarded-for': '192.168.1.100' },
      url: '/test-endpoint',
      socket: { remoteAddress: '192.168.1.100' }
    } as unknown as VercelRequest

    let responseStatus = 200
    let responseBody: any = null
    let retryAfterHeader: string | null = null

    const mockRes = {
      status(code: number) {
        responseStatus = code
        return this
      },
      json(body: any) {
        responseBody = body
        return this
      },
      setHeader(name: string, val: string) {
        if (name === 'Retry-After') retryAfterHeader = val
      }
    } as unknown as VercelResponse

    // First 2 requests within limit (max: 2)
    const pass1 = rateLimit(mockReq, mockRes, { windowMs: 10000, max: 2 })
    expect(pass1).toBe(true)

    const pass2 = rateLimit(mockReq, mockRes, { windowMs: 10000, max: 2 })
    expect(pass2).toBe(true)

    // 3rd request should exceed limit and be rejected with 429
    const pass3 = rateLimit(mockReq, mockRes, { windowMs: 10000, max: 2 })
    expect(pass3).toBe(false)
    expect(responseStatus).toBe(429)
    expect(responseBody).toEqual({ error: 'Too many requests — please wait.' })
    expect(retryAfterHeader).toBeDefined()
  })
})
