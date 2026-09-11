// api/server.ts
// ==============================================================================
// Floework Modular Monolith HTTP API Server
// Production server entry point for ECS Fargate container deployments
// Supports native health checks (/health), graceful shutdown, and request dispatch
// ==============================================================================

import http from 'http'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Route Handlers
import tasksHandler from './tasks/index'
import focusCompleteHandler from './focus/complete'
import narrativeHandler from './analytics/narrative'
import workspacesHandler from './workspaces/index'
import invitesHandler from './workspaces/invites/index'
import membersHandler from './workspaces/members/index'
import storagePresignedUrlHandler from './storage/presigned-url'
import taskDependenciesHandler from './tasks/dependencies'
import billingWebhookHandler from './billing/webhook'
import { handleCors } from './_lib/cors'
import { logger, extractCorrelationContext } from './_lib/logger'

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'

interface AdaptedResponse extends http.ServerResponse {
  status: (code: number) => AdaptedResponse
  json: (data: any) => AdaptedResponse
  send: (data: any) => AdaptedResponse
}

interface AdaptedRequest extends http.IncomingMessage {
  query: Record<string, string | string[]>
  body: any
  cookies: Record<string, string>
}

/**
 * Decorates native Node.js HTTP request/response to match Vercel handler interfaces
 */
function adaptReqRes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  parsedUrl: URL,
  body: any
): { adaptedReq: VercelRequest; adaptedRes: VercelResponse } {
  const adaptedRes = res as unknown as AdaptedResponse
  adaptedRes.status = function (statusCode: number) {
    this.statusCode = statusCode
    return this
  }
  adaptedRes.json = function (data: any) {
    if (!this.getHeader('Content-Type')) {
      this.setHeader('Content-Type', 'application/json')
    }
    this.end(JSON.stringify(data))
    return this
  }
  adaptedRes.send = function (data: any) {
    if (typeof data === 'object') {
      return this.json(data)
    }
    this.end(data)
    return this
  }

  const query: Record<string, string | string[]> = {}
  parsedUrl.searchParams.forEach((v, k) => {
    query[k] = v
  })

  const adaptedReq = req as unknown as AdaptedRequest
  adaptedReq.query = query
  adaptedReq.body = body
  adaptedReq.cookies = {}

  return {
    adaptedReq: adaptedReq as unknown as VercelRequest,
    adaptedRes: adaptedRes as unknown as VercelResponse
  }
}

/**
 * Route Dispatcher
 */
async function dispatchRoute(
  pathname: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<boolean> {
  // 1. Core Health Checks (ALB Target Group & ECS Probes)
  if (
    pathname === '/health' ||
    pathname === '/healthz' ||
    pathname === '/api/health' ||
    pathname === '/health/live'
  ) {
    res.status(200).json({
      status: 'healthy',
      check: pathname === '/health/live' ? 'liveness' : 'overall',
      service: 'floework-api',
      environment: process.env.NODE_ENV || 'staging',
      uptime_seconds: process.uptime(),
      memory_usage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    })
    return true
  }

  // Deep Readiness Probe (Container startup & downstream dependencies)
  if (pathname === '/health/ready') {
    const isDbConfigured = Boolean(process.env.DATABASE_URL || process.env.PGHOST)
    const isQueueConfigured = Boolean(process.env.FOCUS_COMPLETION_QUEUE_URL || process.env.AWS_REGION)

    const ready = isDbConfigured && isQueueConfigured
    const statusCode = ready ? 200 : 503

    res.status(statusCode).json({
      status: ready ? 'ready' : 'degraded',
      check: 'readiness',
      checks: {
        database: isDbConfigured ? 'UP' : 'DOWN',
        queues: isQueueConfigured ? 'UP' : 'DOWN'
      },
      timestamp: new Date().toISOString()
    })
    return true
  }

  // 2. Tasks API
  if (pathname === '/api/tasks' || pathname === '/api/v1/tasks') {
    await tasksHandler(req, res)
    return true
  }

  // 3. Focus Complete API
  if (pathname === '/api/focus/complete' || pathname === '/api/v1/focus/complete') {
    await focusCompleteHandler(req, res)
    return true
  }

  // 4. Analytics Narrative API (Executive Narrative Engine, Share, Regeneration)
  if (
    pathname === '/api/analytics/narrative' ||
    pathname === '/api/v1/analytics/narrative' ||
    pathname.startsWith('/api/analytics/narrative/') ||
    pathname.startsWith('/api/v1/analytics/narrative/')
  ) {
    await narrativeHandler(req, res)
    return true
  }

  // 5. Workspaces API
  if (pathname === '/api/workspaces' || pathname === '/api/v1/workspaces') {
    await workspacesHandler(req, res)
    return true
  }

  // 6. Workspace Invites API
  if (pathname === '/api/workspaces/invites' || pathname === '/api/v1/workspaces/invites') {
    await invitesHandler(req, res)
    return true
  }

  // 7. Workspace Members API
  if (pathname === '/api/workspaces/members' || pathname === '/api/v1/workspaces/members') {
    await membersHandler(req, res)
    return true
  }

  // 8. Storage Presigned URL API (Phase 7 Object Storage)
  if (pathname === '/api/storage/presigned-url' || pathname === '/api/v1/storage/presigned-url') {
    await storagePresignedUrlHandler(req, res)
    return true
  }

  // 9. Task Dependencies API (Phase 11 DAG Execution Graph)
  if (pathname === '/api/tasks/dependencies' || pathname === '/api/v1/tasks/dependencies') {
    await taskDependenciesHandler(req, res)
    return true
  }

  // 10. Stripe Billing Webhook (Phase 11 SaaS Billing)
  if (pathname === '/api/billing/webhook' || pathname === '/api/v1/billing/webhook') {
    await billingWebhookHandler(req, res)
    return true
  }

  return false
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    const startTime = Date.now()
    const parsedUrl = new URL(req.url || '/', 'http://localhost')
    const pathname = parsedUrl.pathname || '/'

    // Extract OpenTelemetry / HTTP correlation IDs
    const correlation = extractCorrelationContext(req)

    // Attach correlation headers to response
    if (correlation.trace_id) res.setHeader('X-Trace-Id', correlation.trace_id)
    if (correlation.request_id) res.setHeader('X-Request-Id', correlation.request_id)

    // Strict Origin-based CORS validation (SEC-07)
    if (!handleCors(req, res)) {
      return
    }

    // Read and parse request body for mutating methods
    let body: any = {}
    if (['POST', 'PATCH', 'PUT'].includes(req.method || '')) {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
      }
      const rawBody = Buffer.concat(chunks).toString('utf8')
      if (rawBody) {
        try {
          body = JSON.parse(rawBody)
        } catch {
          body = rawBody
        }
      }
    }

    const { adaptedReq, adaptedRes } = adaptReqRes(req, res, parsedUrl, body)

    // Log request completion on finish
    res.on('finish', () => {
      const durationMs = Date.now() - startTime
      // Suppress spammy log outputs for basic ALB health checks
      if (!pathname.startsWith('/health')) {
        logger.info(`${req.method} ${pathname} ${res.statusCode} in ${durationMs}ms`, {
          ...correlation,
          method: req.method,
          path: pathname,
          status_code: res.statusCode,
          duration_ms: durationMs
        })
      }
    })

    try {
      const matched = await dispatchRoute(pathname, adaptedReq, adaptedRes)
      if (!matched) {
        adaptedRes.status(404).json({
          error: 'Not Found',
          path: pathname,
          available_endpoints: [
            '/health',
            '/health/live',
            '/health/ready',
            '/api/tasks',
            '/api/focus/complete',
            '/api/analytics/narrative',
            '/api/workspaces',
            '/api/workspaces/invites',
            '/api/workspaces/members'
          ]
        })
      }
    } catch (err: any) {
      logger.error(`Unhandled request error on ${pathname}: ${err.message}`, err, correlation)
      if (!res.headersSent) {
        adaptedRes.status(500).json({
          error: 'Internal Server Error',
          message: err.message || 'An unexpected error occurred'
        })
      }
    }
  })
}

// Start server when executed directly
if (require.main === module || process.env.START_SERVER === 'true') {
  const server = createServer()
  server.listen(PORT, HOST, () => {
    console.log(`[Floework API] Modular Monolith running on http://${HOST}:${PORT}`)
    console.log(`[Floework API] Health probe ready at http://${HOST}:${PORT}/health`)
  })

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    console.log(`[Floework API] Received ${signal}, draining in-flight requests...`)
    server.close(() => {
      console.log('[Floework API] All connections closed. Exiting cleanly.')
      process.exit(0)
    })
    // Force close after 10s timeout
    setTimeout(() => {
      console.error('[Floework API] Forced termination timeout reached.')
      process.exit(1)
    }, 10000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

// Default export enables Vercel Serverless Function compatibility while supporting standalone ECS execution
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    service: 'floework-api',
    status: 'healthy',
    mode: 'modular-monolith',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
}

