// api/_lib/logger.ts
// ==============================================================================
// Structured JSON Correlation Logger & Telemetry Engine
// Emits structured JSON logs with correlation IDs (trace_id, span_id, tenant_id)
// compatible with AWS CloudWatch, AWS X-Ray, and OpenTelemetry.
// ==============================================================================

import { trace } from '@opentelemetry/api'
import type { IncomingMessage } from 'http'
import crypto from 'crypto'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogContext {
  trace_id?: string
  span_id?: string
  tenant_id?: string
  user_id?: string
  request_id?: string
  method?: string
  path?: string
  status_code?: number
  duration_ms?: number
  [key: string]: any
}

export interface StructuredLogRecord {
  timestamp: string
  level: LogLevel
  service: string
  environment: string
  message: string
  trace_id?: string
  span_id?: string
  tenant_id?: string
  user_id?: string
  request_id?: string
  context?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Extracts distributed tracing and correlation IDs from OpenTelemetry or HTTP headers
 */
export function extractCorrelationContext(req?: IncomingMessage | Record<string, any>): LogContext {
  const context: LogContext = {}

  // 1. OpenTelemetry active span takes highest precedence
  const activeSpan = trace.getActiveSpan()
  if (activeSpan) {
    const spanCtx = activeSpan.spanContext()
    if (spanCtx.traceId) context.trace_id = spanCtx.traceId
    if (spanCtx.spanId) context.span_id = spanCtx.spanId
  }

  // 2. HTTP Request headers fallback
  if (req) {
    const headers = (req as any).headers || {}
    const getHeader = (k: string): string | undefined => {
      const val = headers[k.toLowerCase()]
      return Array.isArray(val) ? val[0] : val
    }

    if (!context.trace_id) {
      // AWS X-Ray / CloudFront trace header: Root=1-67891234-abcdef...
      const amznTrace = getHeader('x-amzn-trace-id')
      if (amznTrace) {
        context.trace_id = amznTrace
      } else {
        context.trace_id = getHeader('x-trace-id') || getHeader('traceparent')
      }
    }

    context.request_id = getHeader('x-request-id') || crypto.randomUUID()

    // Tenant / User IDs if attached by auth middleware
    const anyReq = req as any
    if (anyReq.user?.id) context.user_id = anyReq.user.id
    if (anyReq.user?.team_id || anyReq.teamId) context.tenant_id = anyReq.user?.team_id || anyReq.teamId
  }

  if (!context.trace_id) {
    context.trace_id = `flw-${crypto.randomBytes(8).toString('hex')}`
  }

  if (!context.request_id) {
    context.request_id = crypto.randomUUID()
  }

  return context
}

/**
 * Formats a log payload as a standard JSON string for CloudWatch ingestion
 */
export function formatStructuredLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  err?: Error | unknown
): string {
  const otelContext = extractCorrelationContext()
  const mergedContext: LogContext = { ...otelContext, ...(context || {}) }

  const record: StructuredLogRecord = {
    timestamp: new Date().toISOString(),
    level,
    service: 'floework-api',
    environment: process.env.NODE_ENV || 'staging',
    message,
    trace_id: mergedContext.trace_id,
    span_id: mergedContext.span_id,
    tenant_id: mergedContext.tenant_id,
    user_id: mergedContext.user_id,
    request_id: mergedContext.request_id
  }

  // Remove top-level fields from nested context to prevent redundancy
  const cleanContext = { ...mergedContext }
  delete cleanContext.trace_id
  delete cleanContext.span_id
  delete cleanContext.tenant_id
  delete cleanContext.user_id
  delete cleanContext.request_id

  if (Object.keys(cleanContext).length > 0) {
    record.context = cleanContext
  }

  if (err instanceof Error) {
    record.error = {
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  } else if (err) {
    record.error = {
      name: 'Error',
      message: String(err)
    }
  }

  return JSON.stringify(record)
}

/**
 * Logger singleton with typed log level methods
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.debug(formatStructuredLog('DEBUG', message, context))
    }
  },

  info(message: string, context?: LogContext): void {
    console.log(formatStructuredLog('INFO', message, context))
  },

  warn(message: string, context?: LogContext, err?: Error | unknown): void {
    console.warn(formatStructuredLog('WARN', message, context, err))
  },

  error(message: string, err?: Error | unknown, context?: LogContext): void {
    console.error(formatStructuredLog('ERROR', message, context, err))
  }
}
