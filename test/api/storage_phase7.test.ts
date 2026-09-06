// test/api/storage_phase7.test.ts
// ==============================================================================
// Phase 7: Object Storage Migration & Presigned URL Engine Tests
// ==============================================================================

// Set test environment variables before module imports
process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'
process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
process.env.AWS_REGION = 'us-east-1'
process.env.S3_STORAGE_BUCKET = 'floework-staging-storage'
process.env.CLOUDFRONT_DOMAIN = 'https://assets.floework.com'
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  sanitizeObjectKey,
  isAllowedMimeType,
  generateAvatarKey,
  generateAttachmentKey,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  getPublicAssetUrl
} from '../../api/_lib/storage'
import { signTestToken } from '../../api/_lib/jwt'

// Mock in-memory database for team membership verification
const mockMemberships = new Map<string, Set<string>>()
// ws-team-alpha has usr-alice
mockMemberships.set('ws-team-alpha', new Set(['usr-alice', 'usr-admin']))
// ws-team-beta has usr-bob
mockMemberships.set('ws-team-beta', new Set(['usr-bob']))

// Mock Supabase Admin for membership queries
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      },
      from: (table: string) => {
        let teamId: string | null = null
        let userId: string | null = null

        const builder: any = {
          select: () => builder,
          eq: (col: string, val: any) => {
            if (col === 'team_id') teamId = val
            if (col === 'user_id') userId = val
            return builder
          },
          single: async () => {
            if (table === 'team_members') {
              if (teamId && userId && mockMemberships.get(teamId)?.has(userId)) {
                return { data: { role: 'member' }, error: null }
              }
              return { data: null, error: { message: 'Not a member' } }
            }
            return { data: null, error: { message: 'Not found' } }
          }
        }
        return builder
      }
    })
  }
})

// Import handler after mocks
import storageHandler from '../../api/storage/presigned-url'

// Mock HTTP Request/Response Helper
function createMockReqRes(options: {
  method?: string
  body?: any
  query?: Record<string, string>
  token?: string
}) {
  const req: any = {
    method: options.method || 'POST',
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body || {},
    query: options.query || {}
  }

  let statusCode = 200
  let responseData: any = null

  const res: any = {
    status(code: number) {
      statusCode = code
      return res
    },
    json(data: any) {
      responseData = data
      return res
    },
    setHeader() {
      return res
    }
  }

  return {
    req: req as VercelRequest,
    res: res as VercelResponse,
    getStatus: () => statusCode,
    getBody: () => responseData
  }
}

describe('Phase 7: Object Storage Migration & Presigned URL Engine', () => {
  const aliceToken = signTestToken(
    { sub: 'usr-alice', email: 'alice@floework.dev' },
    process.env.JWT_SECRET!
  )
  const bobToken = signTestToken(
    { sub: 'usr-bob', email: 'bob@floework.dev' },
    process.env.JWT_SECRET!
  )

  describe('1. Storage Utility Engine (_lib/storage.ts)', () => {
    it('sanitizes object keys against directory traversal and null byte injections', () => {
      expect(sanitizeObjectKey('../../../etc/passwd')).toBe('etc/passwd')
      expect(sanitizeObjectKey('avatars/usr-1/../../secret.png')).toBe('avatars/usr-1/secret.png')
      expect(sanitizeObjectKey('\\windows\\path\\file.jpg')).toBe('windows/path/file.jpg')
      expect(sanitizeObjectKey('/leading/slash/avatar.webp')).toBe('leading/slash/avatar.webp')
      expect(sanitizeObjectKey('file\0name.png')).toBe('filename.png')
    })

    it('enforces MIME type whitelisting and blocks dangerous executable formats', () => {
      // Allowed
      expect(isAllowedMimeType('image/png')).toBe(true)
      expect(isAllowedMimeType('image/jpeg')).toBe(true)
      expect(isAllowedMimeType('image/webp')).toBe(true)
      expect(isAllowedMimeType('application/pdf')).toBe(true)
      expect(isAllowedMimeType('text/plain; charset=utf-8')).toBe(true)

      // Blocked
      expect(isAllowedMimeType('application/x-msdownload')).toBe(false)
      expect(isAllowedMimeType('application/x-executable')).toBe(false)
      expect(isAllowedMimeType('text/html')).toBe(false)
      expect(isAllowedMimeType('application/javascript')).toBe(false)
      expect(isAllowedMimeType('')).toBe(false)
    })

    it('generates properly formatted tenant-scoped keys', () => {
      expect(generateAvatarKey('usr-alice', 'profile-pic.png')).toBe('avatars/usr-alice/profile-pic.png')
      expect(generateAttachmentKey('ws-team-alpha', 'spec.pdf')).toBe('workspaces/ws-team-alpha/attachments/spec.pdf')
    })

    it('generates valid SigV4 presigned upload URL with 15-minute expiration', async () => {
      const result = await createPresignedUploadUrl({
        key: 'avatars/usr-alice/avatar.png',
        contentType: 'image/png'
      })

      expect(result.uploadUrl).toBeDefined()
      expect(result.uploadUrl).toContain('floework-staging-storage.s3.us-east-1.amazonaws.com')
      expect(result.uploadUrl).toContain('X-Amz-Signature=')
      expect(result.uploadUrl).toContain('X-Amz-Expires=900')
      expect(result.key).toBe('avatars/usr-alice/avatar.png')
      expect(result.expiresIn).toBe(900)
    })

    it('generates valid SigV4 presigned download URL for private documents', async () => {
      const result = await createPresignedDownloadUrl({
        key: 'workspaces/ws-team-alpha/attachments/contract.pdf'
      })

      expect(result.downloadUrl).toBeDefined()
      expect(result.downloadUrl).toContain('X-Amz-Signature=')
      expect(result.downloadUrl).toContain('X-Amz-Expires=900')
      expect(result.key).toBe('workspaces/ws-team-alpha/attachments/contract.pdf')
    })

    it('formats CloudFront CDN public asset URLs correctly', () => {
      const cdnUrl = getPublicAssetUrl('avatars/usr-alice/avatar.png')
      expect(cdnUrl).toBe('https://assets.floework.com/avatars/usr-alice/avatar.png')
    })
  })

  describe('2. Presigned URL HTTP Handler (api/storage/presigned-url.ts)', () => {
    it('returns HTTP 401 when request lacks authentication', async () => {
      const { req, res, getStatus, getBody } = createMockReqRes({
        body: { type: 'avatar', filename: 'avatar.png', contentType: 'image/png' }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(401)
      expect(getBody().error).toContain('Authentication required')
    })

    it('returns HTTP 400 when required fields are missing or invalid', async () => {
      const { req, res, getStatus, getBody } = createMockReqRes({
        token: aliceToken,
        body: { type: 'invalid-type', filename: 'test.png', contentType: 'image/png' }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(400)
      expect(getBody().error).toContain('Invalid type')
    })

    it('returns HTTP 400 when an unsupported or dangerous MIME type is provided', async () => {
      const { req, res, getStatus, getBody } = createMockReqRes({
        token: aliceToken,
        body: { type: 'avatar', filename: 'malware.exe', contentType: 'application/x-msdownload' }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(400)
      expect(getBody().error).toContain('unsupported contentType')
    })

    it('blocks identity spoofing: returns HTTP 403 when user attempts to upload avatar for another user', async () => {
      const { req, res, getStatus, getBody } = createMockReqRes({
        token: aliceToken,
        body: {
          type: 'avatar',
          filename: 'avatar.png',
          contentType: 'image/png',
          userId: 'usr-bob' // Alice trying to overwrite Bob's avatar!
        }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(403)
      expect(getBody().error).toContain('Cannot generate avatar upload URL for another user')
    })

    it('generates valid presigned upload URL for authenticated user avatar', async () => {
      const { req, res, getStatus, getBody } = createMockReqRes({
        token: aliceToken,
        body: {
          type: 'avatar',
          filename: 'my-profile.png',
          contentType: 'image/png',
          userId: 'usr-alice'
        }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(200)
      const body = getBody()
      expect(body.uploadUrl).toBeDefined()
      expect(body.key).toBe('avatars/usr-alice/my-profile.png')
      expect(body.expiresIn).toBe(900)
      expect(body.publicUrl).toBe('https://assets.floework.com/avatars/usr-alice/my-profile.png')
    })

    it('enforces tenant isolation: returns HTTP 403 when user attempts to upload attachment to unauthorized workspace', async () => {
      const { req, res, getStatus } = createMockReqRes({
        token: aliceToken, // Alice is not a member of ws-team-beta!
        body: {
          type: 'attachment',
          filename: 'q3-roadmap.pdf',
          contentType: 'application/pdf',
          workspaceId: 'ws-team-beta'
        }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(403)
    })

    it('generates valid presigned upload URL for authorized workspace member attachment', async () => {
      const { req, res, getStatus, getBody } = createMockReqRes({
        token: aliceToken, // Alice belongs to ws-team-alpha
        body: {
          type: 'attachment',
          filename: 'q3-roadmap.pdf',
          contentType: 'application/pdf',
          workspaceId: 'ws-team-alpha'
        }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(200)
      const body = getBody()
      expect(body.uploadUrl).toBeDefined()
      expect(body.key).toBe('workspaces/ws-team-alpha/attachments/q3-roadmap.pdf')
    })

    it('generates valid presigned GET download URL for authorized workspace attachment', async () => {
      const { req, res, getStatus, getBody } = createMockReqRes({
        method: 'GET',
        token: aliceToken,
        query: { key: 'workspaces/ws-team-alpha/attachments/specs.pdf' }
      })

      await storageHandler(req, res)
      expect(getStatus()).toBe(200)
      const body = getBody()
      expect(body.downloadUrl).toBeDefined()
      expect(body.key).toBe('workspaces/ws-team-alpha/attachments/specs.pdf')
      expect(body.expiresIn).toBe(900)
    })
  })

  describe('3. Automated Storage Migration Engine (scripts/migrate_storage_to_s3.mjs)', () => {
    it('scans Supabase storage bucket, skips existing objects, and migrates missing files to S3', async () => {
      const mockSupabaseStorage = {
        storage: {
          from: () => ({
            list: async () => ({
              data: [
                { id: '1', name: 'existing-avatar.png', metadata: { mimetype: 'image/png' } },
                { id: '2', name: 'new-document.pdf', metadata: { mimetype: 'application/pdf' } }
              ],
              error: null
            }),
            download: async () => ({
              data: {
                arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer
              },
              error: null
            })
          })
        }
      }

      const uploadedKeys: string[] = []
      const mockS3 = {
        send: async (command: any) => {
          if (command.constructor.name === 'HeadObjectCommand') {
            if (command.input?.Key?.includes('existing-avatar.png')) {
              return {} // exists in S3
            }
            const notFound: any = new Error('NotFound')
            notFound.name = 'NotFound'
            throw notFound
          }
          if (command.constructor.name === 'PutObjectCommand') {
            uploadedKeys.push(command.input?.Key)
            return {}
          }
          return {}
        }
      }

      const { migrateBucket } = await import('../../scripts/migrate_storage_to_s3.mjs')
      const result = await migrateBucket(mockSupabaseStorage as any, mockS3 as any, 'avatars')

      expect(result.migrated).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.failed).toBe(0)
      expect(uploadedKeys).toContain('avatars/new-document.pdf')
    })
  })
})
