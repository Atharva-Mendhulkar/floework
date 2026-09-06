// apps/web/src/services/StorageService.ts
// ==============================================================================
// Dual-Mode Object Storage Service
// Direct binary upload to Amazon S3 via authenticated presigned URLs,
// with graceful fallback to Supabase Storage.
// ==============================================================================

import { supabase } from '../lib/supabase'

export interface StorageUploadResult {
  publicUrl: string
  key?: string
  error?: string
}

export class StorageService {
  private static apiUrl = import.meta.env.VITE_API_URL || ''

  /**
   * Uploads user avatar image via S3 Presigned URL (AWS Mode) or Supabase Storage (Fallback)
   */
  static async uploadAvatar(
    file: File,
    userId: string,
    token?: string
  ): Promise<StorageUploadResult> {
    const isAwsStorageEnabled = import.meta.env.VITE_ENABLE_AWS_STORAGE === 'true'

    // 1. AWS Mode: S3 Presigned PUT URL
    if (isAwsStorageEnabled && token) {
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

        if (presignedRes.ok) {
          const { uploadUrl, key, publicUrl } = await presignedRes.json()

          // Direct binary PUT to S3
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'image/png'
            },
            body: file
          })

          if (uploadRes.ok) {
            return {
              publicUrl: `${publicUrl}?t=${Date.now()}`,
              key
            }
          }
          console.warn('[StorageService] S3 direct upload failed, attempting Supabase fallback...')
        }
      } catch (awsErr) {
        console.warn('[StorageService] AWS Presigned upload error, attempting Supabase fallback...', awsErr)
      }
    }

    // 2. Fallback Mode: Supabase Storage
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('[StorageService] Supabase avatar upload error:', uploadError)
        return { publicUrl: '', error: uploadError.message }
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return {
        publicUrl: `${urlData.publicUrl}?t=${Date.now()}`
      }
    } catch (err: any) {
      return { publicUrl: '', error: err.message || 'Avatar upload failed' }
    }
  }

  /**
   * Uploads workspace or task attachment via S3 Presigned URL
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
        return { publicUrl: '', error: errJson.error || 'Failed to obtain presigned URL' }
      }

      const { uploadUrl, key, publicUrl } = await presignedRes.json()

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
