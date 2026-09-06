// api/_lib/jwt.ts
// ==============================================================================
// Local Cryptographic JWT & JWKS Verification Engine
// Validates Amazon Cognito User Pool JWTs (RS256) and Secret-Signed JWTs (HS256)
// Eliminates remote network round-trips with in-memory public key caching.
// ==============================================================================

import crypto from 'crypto'
import type { User } from '@supabase/supabase-js'

export interface VerifiedUser extends User {
  id: string
  email?: string
  workspace_id?: string
  role?: string
  app_metadata: Record<string, any>
  user_metadata: Record<string, any>
  aud: string
  created_at: string
}

interface JWKKey {
  kid: string
  kty: string
  alg: string
  use: string
  n: string
  e: string
}

interface JWKSCache {
  keys: Map<string, crypto.KeyObject>
  fetchedAt: number
}

// 1-hour cache TTL for JWKS
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000
let jwksCache: JWKSCache | null = null

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8')
}

export function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
  return buf.toString('base64url')
}

/**
 * Parses unverified JWT segments
 */
export function parseJwt(token: string): {
  header: Record<string, any>
  payload: Record<string, any>
  signingInput: string
  signature: string
} | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]))
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    const signingInput = `${parts[0]}.${parts[1]}`
    const signature = parts[2]
    return { header, payload, signingInput, signature }
  } catch {
    return null
  }
}

/**
 * Fetches and caches Amazon Cognito JWKS keys
 */
export async function getCognitoKey(kid: string, userPoolId: string, region: string): Promise<crypto.KeyObject | null> {
  const now = Date.now()

  // Return from cache if valid and kid exists
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    if (jwksCache.keys.has(kid)) {
      return jwksCache.keys.get(kid)!
    }
  }

  // Fetch JWKS from Cognito discovery endpoint
  const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
  try {
    const response = await fetch(jwksUrl)
    if (!response.ok) return null
    const data = (await response.json()) as { keys: JWKKey[] }

    const keyMap = new Map<string, crypto.KeyObject>()
    for (const key of data.keys) {
      if (key.kty === 'RSA') {
        const keyObject = crypto.createPublicKey({
          key: key as any,
          format: 'jwk'
        })
        keyMap.set(key.kid, keyObject)
      }
    }

    jwksCache = { keys: keyMap, fetchedAt: now }
    return keyMap.get(kid) || null
  } catch (err) {
    console.warn('[JWT] Failed to fetch Cognito JWKS:', err)
    return null
  }
}

/**
 * Verifies HS256 JWT signature using HMAC
 */
function verifyHS256(signingInput: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url')

  // Constant-time buffer comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expectedSignature)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}

/**
 * Verifies RS256 JWT signature using RSA Public Key
 */
function verifyRS256(signingInput: string, signature: string, publicKey: crypto.KeyObject): boolean {
  try {
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(signingInput)
    return verifier.verify(publicKey, Buffer.from(signature, 'base64url'))
  } catch {
    return false
  }
}

/**
 * Main local verification function
 * Validates token signature, expiration, and payload structure.
 */
export async function verifyToken(token: string): Promise<VerifiedUser | null> {
  const parsed = parseJwt(token)
  if (!parsed) return null

  const { header, payload, signingInput, signature } = parsed
  const nowSec = Math.floor(Date.now() / 1000)

  // 1. Expiration check (with 5-second clock skew tolerance)
  if (typeof payload.exp === 'number' && payload.exp + 5 < nowSec) {
    return null
  }

  // 2. Signature verification
  let isValidSignature = false

  // Path A: RS256 (Cognito JWKS)
  if (header.alg === 'RS256') {
    const userPoolId = process.env.COGNITO_USER_POOL_ID
    const region = process.env.AWS_REGION || process.env.BEDROCK_REGION || 'us-east-1'

    if (userPoolId && header.kid) {
      const publicKey = await getCognitoKey(header.kid, userPoolId, region)
      if (publicKey) {
        isValidSignature = verifyRS256(signingInput, signature, publicKey)
      }
    }
  }

  // Path B: HS256 (JWT_SECRET)
  if (!isValidSignature && header.alg === 'HS256') {
    const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
    if (secret) {
      isValidSignature = verifyHS256(signingInput, signature, secret)
    }
  }

  if (!isValidSignature) {
    return null
  }

  // 3. Construct normalized user object
  const userId = payload.sub || payload.id
  if (!userId) return null

  const user: VerifiedUser = {
    id: userId,
    email: payload.email,
    workspace_id: payload['custom:workspace_id'] || payload.workspace_id,
    role: payload['custom:role'] || payload.role || 'member',
    app_metadata: payload.app_metadata || {},
    user_metadata: payload.user_metadata || {},
    aud: payload.aud || 'authenticated',
    created_at: payload.created_at || new Date().toISOString()
  }

  return user
}

/**
 * Helper to generate signed tokens for automated testing
 */
export function signTestToken(
  payload: Record<string, any>,
  secret: string,
  options: { alg?: 'HS256'; expiresInSec?: number } = {}
): string {
  const alg = options.alg || 'HS256'
  const header = { alg, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    iat: now,
    exp: options.expiresInSec ? now + options.expiresInSec : now + 3600,
    ...payload
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url')

  return `${signingInput}.${signature}`
}
