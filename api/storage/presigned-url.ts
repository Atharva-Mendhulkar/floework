// api/storage/presigned-url.ts
// ==============================================================================
// Presigned URL Generation Endpoint for S3 Direct Uploads & Downloads
// Enforces caller authentication, anti-spoofing for avatars, workspace tenant
// authorization for attachments, path traversal sanitization, and MIME safety.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUser, requireMember } from '../_lib/auth'
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  getPublicAssetUrl,
  generateAvatarKey,
  generateAttachmentKey,
  isAllowedMimeType,
  sanitizeObjectKey
} from '../_lib/storage'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Mandate authentication for all storage operations
  const user = await getUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' })
  }

  // 2. Handle GET: Presigned Download URL
  if (req.method === 'GET') {
    const rawKey = req.query.key as string
    if (!rawKey) {
      return res.status(400).json({ error: 'Missing required query parameter: key' })
    }

    const key = sanitizeObjectKey(rawKey)

    // Tenant check if accessing private workspace attachment
    if (key.startsWith('workspaces/')) {
      const parts = key.split('/')
      const workspaceId = parts[1]
      if (workspaceId) {
        const member = await requireMember(req, res, workspaceId)
        if (!member) return // requireMember sends 403
      }
    }

    try {
      const result = await createPresignedDownloadUrl({ key })
      return res.status(200).json(result)
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to generate download URL' })
    }
  }

  // 3. Handle POST: Presigned Upload or Download URL
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { action = 'upload', type, filename, contentType, workspaceId, userId, key: explicitKey } = body

    // Download action via POST
    if (action === 'download') {
      if (!explicitKey) {
        return res.status(400).json({ error: 'Missing required field: key' })
      }
      const key = sanitizeObjectKey(explicitKey)
      if (key.startsWith('workspaces/')) {
        const parts = key.split('/')
        const wsId = parts[1]
        if (wsId) {
          const member = await requireMember(req, res, wsId)
          if (!member) return
        }
      }
      try {
        const result = await createPresignedDownloadUrl({ key })
        return res.status(200).json(result)
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Failed to generate download URL' })
      }
    }

    // Upload action
    if (!type || !['avatar', 'attachment'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type: must be "avatar" or "attachment"' })
    }

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Missing required field: filename' })
    }

    if (!contentType || typeof contentType !== 'string' || !isAllowedMimeType(contentType)) {
      return res.status(400).json({ error: 'Invalid or unsupported contentType' })
    }

    let targetKey: string

    // 3a. Avatar Upload
    if (type === 'avatar') {
      // Prevent user ID spoofing: user can only upload their own avatar
      if (userId && userId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot generate avatar upload URL for another user' })
      }
      targetKey = generateAvatarKey(user.id, filename)
    } 
    // 3b. Workspace Attachment Upload
    else {
      if (!workspaceId || typeof workspaceId !== 'string') {
        return res.status(400).json({ error: 'workspaceId is required for attachment uploads' })
      }
      // Enforce workspace tenant membership
      const member = await requireMember(req, res, workspaceId)
      if (!member) return // requireMember sends 403

      targetKey = generateAttachmentKey(workspaceId, filename)
    }

    try {
      const presigned = await createPresignedUploadUrl({
        key: targetKey,
        contentType
      })

      const publicUrl = getPublicAssetUrl(presigned.key)

      return res.status(200).json({
        uploadUrl: presigned.uploadUrl,
        key: presigned.key,
        expiresIn: presigned.expiresIn,
        publicUrl
      })
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to generate upload URL' })
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
