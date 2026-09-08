// test/api/observability_phase9.test.ts
// ==============================================================================
// Phase 9: Observability & Telemetry Hardening Test Suite
// Validates structured JSON correlation logging, distributed trace extraction,
// container liveness/readiness probes, and response correlation headers.
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import http from 'http'
import {
  logger,
  extractCorrelationContext,
  formatStructuredLog
} from '../../api/_lib/logger'
import { createServer } from '../../api/_server'

describe('Phase 9: Structured JSON Correlation Logger (api/_lib/logger.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts AWS X-Ray and request IDs from incoming HTTP headers', () => {
    const mockReq = {
      headers: {
        'x-amzn-trace-id': 'Root=1-67891234-abcdef012345678912345678',
        'x-request-id': 'req-custom-999'
      },
      user: {
        id: 'usr-charlie',
        team_id: 'team-alpha'
      }
    }

    const context = extractCorrelationContext(mockReq)
    expect(context.trace_id).toBe('Root=1-67891234-abcdef012345678912345678')
    expect(context.request_id).toBe('req-custom-999')
    expect(context.user_id).toBe('usr-charlie')
    expect(context.tenant_id).toBe('team-alpha')
  })

  it('extracts standard x-trace-id header when x-amzn-trace-id is absent', () => {
    const mockReq = {
      headers: {
        'x-trace-id': 'trace-custom-abc'
      }
    }

    const context = extractCorrelationContext(mockReq)
    expect(context.trace_id).toBe('trace-custom-abc')
    expect(context.request_id).toBeDefined()
  })

  it('generates a synthetic trace ID and UUID request ID when headers are absent', () => {
    const context = extractCorrelationContext()
    expect(context.trace_id).toMatch(/^flw-[0-9a-f]{16}$/)
    expect(context.request_id).toBeDefined()
  })

  it('formats structured log record as valid JSON conforming to APM schema', () => {
    const logString = formatStructuredLog('INFO', 'Test log message', {
      trace_id: 'tr-12345',
      user_id: 'usr-1',
      action: 'TASK_MODIFIED'
    })

    const parsed = JSON.parse(logString)
    expect(parsed.level).toBe('INFO')
    expect(parsed.message).toBe('Test log message')
    expect(parsed.service).toBe('floework-api')
    expect(parsed.trace_id).toBe('tr-12345')
    expect(parsed.user_id).toBe('usr-1')
    expect(parsed.timestamp).toBeDefined()
    expect(parsed.context?.action).toBe('TASK_MODIFIED')
  })

  it('serializes error details correctly into JSON structure on error log', () => {
    const testError = new Error('Database connection timed out')
    const logString = formatStructuredLog('ERROR', 'DB Query Failure', { trace_id: 'tr-err' }, testError)

    const parsed = JSON.parse(logString)
    expect(parsed.level).toBe('ERROR')
    expect(parsed.message).toBe('DB Query Failure')
    expect(parsed.error).toBeDefined()
    expect(parsed.error.name).toBe('Error')
    expect(parsed.error.message).toBe('Database connection timed out')
    expect(parsed.error.stack).toBeDefined()
  })

  it('invokes console methods with valid JSON strings for logger methods', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.info('Info message', { trace_id: 'tr-info' })
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(logSpy.mock.calls[0][0]).level).toBe('INFO')

    logger.warn('Warning message', { trace_id: 'tr-warn' })
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(warnSpy.mock.calls[0][0]).level).toBe('WARN')

    logger.error('Error message', new Error('Fail'), { trace_id: 'tr-error' })
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(errorSpy.mock.calls[0][0]).level).toBe('ERROR')
  })
})

describe('Phase 9: API Server Health Probes & Trace Header Propagation (api/server.ts)', () => {
  let server: http.Server
  let serverPort: number

  beforeEach(async () => {
    server = createServer()
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address()
        if (typeof addr === 'object' && addr) {
          serverPort = addr.port
        }
        resolve()
      })
    })
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('GET /health/live returns HTTP 200 with liveness metadata', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/health/live`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.status).toBe('healthy')
    expect(data.check).toBe('liveness')
    expect(data.service).toBe('floework-api')
    expect(data.uptime_seconds).toBeGreaterThanOrEqual(0)
  })

  it('GET /health/ready returns HTTP 200 when environment dependencies are configured', async () => {
    const originalDb = process.env.DATABASE_URL
    const originalRegion = process.env.AWS_REGION
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/floework'
    process.env.AWS_REGION = 'us-east-1'

    try {
      const res = await fetch(`http://127.0.0.1:${serverPort}/health/ready`)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.status).toBe('ready')
      expect(data.check).toBe('readiness')
      expect(data.checks.database).toBe('UP')
      expect(data.checks.queues).toBe('UP')
    } finally {
      process.env.DATABASE_URL = originalDb
      process.env.AWS_REGION = originalRegion
    }
  })

  it('propagates incoming X-Trace-Id and X-Request-Id into HTTP response headers', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/health`, {
      headers: {
        'x-trace-id': 'trace-ingress-12345',
        'x-request-id': 'req-ingress-67890'
      }
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('x-trace-id')).toBe('trace-ingress-12345')
    expect(res.headers.get('x-request-id')).toBe('req-ingress-67890')
  })

  it('generates synthetic trace headers when client sends none', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/health`)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-trace-id')).toMatch(/^flw-[0-9a-f]{16}$/)
    expect(res.headers.get('x-request-id')).toBeDefined()
  })
})
