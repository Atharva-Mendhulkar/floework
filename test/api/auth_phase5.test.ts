import { describe, it, expect, beforeEach } from 'vitest'
import { verifyToken, signTestToken, parseJwt } from '../../api/_lib/jwt'
import { getUser, requireMember } from '../../api/_lib/auth'
import { handleCors, isOriginAllowed } from '../../api/_lib/cors'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const TEST_JWT_SECRET = 'super-secure-test-jwt-secret-at-least-32-chars-long'

describe('Phase 5: Authentication & Session Hardening', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.VITE_APP_URL = 'https://app.floework.dev'
  })

  describe('1. Local JWT Verification (Zero Network Round-Trips)', () => {
    it('successfully verifies and decodes a valid token locally', async () => {
      const payload = {
        sub: 'usr-123e4567-e89b-12d3-a456-426614174000',
        email: 'developer@floework.dev',
        workspace_id: 'ws-team-alpha',
        role: 'admin'
      }
      const token = signTestToken(payload, TEST_JWT_SECRET, { expiresInSec: 3600 })

      const user = await verifyToken(token)
      expect(user).not.toBeNull()
      expect(user?.id).toBe(payload.sub)
      expect(user?.email).toBe(payload.email)
      expect(user?.workspace_id).toBe(payload.workspace_id)
      expect(user?.role).toBe(payload.role)
    })

    it('rejects an expired token without crashing', async () => {
      const payload = {
        sub: 'usr-expired-12345',
        email: 'expired@floework.dev'
      }
      // Expired 60 seconds ago
      const token = signTestToken(payload, TEST_JWT_SECRET, { expiresInSec: -60 })

      const user = await verifyToken(token)
      expect(user).toBeNull()
    })

    it('rejects a token with a tampered signature', async () => {
      const payload = {
        sub: 'usr-tampered-12345',
        email: 'tampered@floework.dev'
      }
      const validToken = signTestToken(payload, TEST_JWT_SECRET)
      // Mutate the signature portion
      const tamperedToken = validToken.slice(0, -4) + 'abcd'

      const user = await verifyToken(tamperedToken)
      expect(user).toBeNull()
    })

    it('rejects a token signed with a different secret', async () => {
      const payload = {
        sub: 'usr-wrong-secret',
        email: 'attacker@evil.com'
      }
      const tokenWithWrongSecret = signTestToken(payload, 'wrong-secret-key-12345678901234567890')

      const user = await verifyToken(tokenWithWrongSecret)
      expect(user).toBeNull()
    })
  })

  describe('2. Auth Middleware Lifecycle & Request Memoization', () => {
    it('getUser memoizes verified user onto request object across multiple calls', async () => {
      const token = signTestToken(
        { sub: 'usr-memo-test', email: 'memo@floework.dev' },
        TEST_JWT_SECRET
      )

      const mockReq = {
        headers: { authorization: `Bearer ${token}` }
      } as unknown as VercelRequest

      const userFirstCall = await getUser(mockReq)
      expect(userFirstCall).not.toBeNull()
      expect(userFirstCall?.id).toBe('usr-memo-test')

      // Verify user was attached to request
      expect((mockReq as any).user).toBe(userFirstCall)

      // Second call should return the exact same memoized reference immediately
      const userSecondCall = await getUser(mockReq)
      expect(userSecondCall).toBe(userFirstCall)
    })

    it('returns null when Authorization header is missing', async () => {
      const mockReq = { headers: {} } as unknown as VercelRequest
      const user = await getUser(mockReq)
      expect(user).toBeNull()
    })
  })

  describe('3. SEC-07: Strict Origin-Based CORS Enforcement', () => {
    it('allows whitelisted origins and reflects origin header', () => {
      expect(isOriginAllowed('http://localhost:5173')).toBe(true)
      expect(isOriginAllowed('http://localhost:3000')).toBe(true)
      expect(isOriginAllowed('https://app.floework.dev')).toBe(true)
      expect(isOriginAllowed(undefined)).toBe(true) // Same-origin / direct server
    })

    it('rejects untrusted third-party origins', () => {
      expect(isOriginAllowed('https://evil-hacker.com')).toBe(false)
      expect(isOriginAllowed('http://phishing-site.xyz')).toBe(false)
      expect(isOriginAllowed('https://unauthorized-domain.org')).toBe(false)
    })

    it('sets proper CORS headers for allowed origin', () => {
      const headersSet: Record<string, string> = {}
      const mockReq = {
        method: 'GET',
        headers: { origin: 'https://app.floework.dev' }
      } as any

      const mockRes = {
        setHeader(k: string, v: string) {
          headersSet[k] = v
        },
        end() {}
      } as any

      const allowed = handleCors(mockReq, mockRes)
      expect(allowed).toBe(true)
      expect(headersSet['Access-Control-Allow-Origin']).toBe('https://app.floework.dev')
      expect(headersSet['Vary']).toBe('Origin')
      expect(headersSet['Access-Control-Allow-Credentials']).toBe('true')
    })

    it('rejects OPTIONS preflight from unauthorized origin with HTTP 403', () => {
      let statusCode = 200
      let responseBody = ''
      const headersSet: Record<string, string> = {}

      const mockReq = {
        method: 'OPTIONS',
        headers: { origin: 'https://attacker.site' }
      } as any

      const mockRes = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader(k: string, v: string) {
          headersSet[k] = v
        },
        end(data: string) {
          responseBody = data
        }
      } as any

      const allowed = handleCors(mockReq, mockRes)
      expect(allowed).toBe(false)
      expect(statusCode).toBe(403)
      expect(headersSet['Access-Control-Allow-Origin']).toBeUndefined()
      expect(JSON.parse(responseBody).error).toContain('CORS origin not allowed')
    })

    it('returns 204 No Content for OPTIONS preflight from whitelisted origin', () => {
      let statusCode = 200
      const headersSet: Record<string, string> = {}

      const mockReq = {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:5173' }
      } as any

      const mockRes = {
        set statusCode(code: number) {
          statusCode = code
        },
        setHeader(k: string, v: string) {
          headersSet[k] = v
        },
        end() {}
      } as any

      const allowed = handleCors(mockReq, mockRes)
      expect(allowed).toBe(false)
      expect(statusCode).toBe(204)
      expect(headersSet['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    })
  })
})
