// api/_lib/cors.ts
// ==============================================================================
// Strict Origin-Based CORS Middleware (SEC-07 Resolution)
// Eliminates wildcard (*) CORS allowances; enforces explicit origin whitelist.
// Protects against unauthorized cross-origin data access and CSRF exploitation.
// ==============================================================================

import type http from 'http'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]

/**
 * Checks if a given origin is allowed based on configured whitelist
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true // Same-origin, direct server-to-server, or CLI

  const configuredOrigins: string[] = []
  if (process.env.VITE_APP_URL) configuredOrigins.push(process.env.VITE_APP_URL)
  if (process.env.APP_DOMAIN) configuredOrigins.push(process.env.APP_DOMAIN)
  if (process.env.ALLOWED_ORIGINS) {
    configuredOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()))
  }

  const allAllowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])
  if (allAllowed.has(origin)) return true

  // Support Vercel preview URLs if configured
  if (origin.endsWith('.vercel.app') && process.env.NODE_ENV !== 'production') {
    return true
  }

  return false
}

/**
 * Handles CORS headers and OPTIONS preflight requests
 * Returns false if the request was handled (e.g. OPTIONS response sent) or blocked
 * Returns true if the request should continue to downstream handlers
 */
export function handleCors(
  req: http.IncomingMessage,
  res: http.ServerResponse & { status?: (code: number) => any; json?: (data: any) => any }
): boolean {
  const origin = req.headers.origin as string | undefined

  if (origin) {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, x-cron-secret')
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Max-Age', '86400')
    } else {
      // Reject disallowed origin on preflight
      if (req.method === 'OPTIONS') {
        res.statusCode = 403
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Forbidden: CORS origin not allowed' }))
        return false
      }
      // For non-preflight, do NOT attach Access-Control-Allow-Origin header
      // Browser SOP will automatically drop the response
    }
  }

  // If OPTIONS preflight from allowed origin, respond 204 No Content
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return false
  }

  return true
}
