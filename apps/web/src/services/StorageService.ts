// apps/web/src/services/StorageService.ts
// ==============================================================================
// Pure Amazon S3 Object Storage Service
// Direct binary uploads to Amazon S3 via authenticated SigV4 presigned URLs.
// ==============================================================================

export interface StorageUploadResult {
  publicUrl: string
  key?: string
  error?: string
}

export class StorageService {
  private static apiUrl = import.meta.env.VITE_API_URL || ''

  /**
   * Uploads user avatar image directly to Amazon S3 via authenticated presigned URL
   */
  static async uploadAvatar(
    file: File,
    userId: string,
    token?: string
  ): Promise<StorageUploadResult> {
    if (!token) {
      return { publicUrl: '', error: 'Authentication token required for S3 upload' }
    }

    try {
      const presignedEndpoint = `${this.apiUrl}/api/v1/storage/presigned-url`
      const presignedRes = await fetch(presignedEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'upload',
          type: 'avatar',
          filename: file.name,
          contentType: file.type || 'image/png',
          userId
        })
      })

      if (!presignedRes.ok) {
        const errJson = await presignedRes.json().catch(() => ({}))
        return { publicUrl: '', error: errJson.error || 'Failed to acquire S3 upload signature' }
      }

      const { uploadUrl, key, publicUrl } = await presignedRes.json()

      // Direct binary PUT to Amazon S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/png'
        },
        body: file
      })

      if (!uploadRes.ok) {
        return { publicUrl: '', error: `S3 direct binary upload failed (${uploadRes.status})` }
      }

      return {
        publicUrl: `${publicUrl}?t=${Date.now()}`,
        key
      }
    } catch (err: any) {
      return { publicUrl: '', error: err.message || 'Avatar upload failed' }
    }
  }

  /**
   * Uploads workspace or task attachment directly to Amazon S3 via authenticated presigned URL
   */
  static async uploadAttachment(
    file: File,
    workspaceId: string,
    token: string
  ): Promise<StorageUploadResult> {
    try {
      const presignedEndpoint = `${this.apiUrl}/api/v1/storage/presigned-url`
      const presignedRes = await fetch(presignedEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'upload',
          type: 'attachment',
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          workspaceId
        })
      })

      if (!presignedRes.ok) {
        const errJson = await presignedRes.json().catch(() => ({}))
        return { publicUrl: '', error: errJson.error || 'Failed to obtain S3 presigned URL' }
      }

      const { uploadUrl, key, publicUrl } = await presignedRes.json()

      // Direct binary PUT to Amazon S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      })

      if (!uploadRes.ok) {
        return { publicUrl: '', error: 'S3 binary upload failed' }
      }

      return { publicUrl, key }
    } catch (err: any) {
      return { publicUrl: '', error: err.message || 'Attachment upload failed' }
    }
  }
}
