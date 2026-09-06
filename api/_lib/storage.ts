// api/_lib/storage.ts
// ==============================================================================
// Amazon S3 & CloudFront Object Storage Engine
// Handles authenticated presigned URL generation (PUT/GET), tenant path scoping,
// MIME type validation, and path traversal sanitization.
// ==============================================================================

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// S3 Configuration
const region = process.env.AWS_REGION || 'us-east-1'
const bucketName = process.env.S3_STORAGE_BUCKET || process.env.STORAGE_BUCKET_NAME || 'floework-staging-storage'
const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || process.env.STORAGE_CDN_DOMAIN

export const s3Client = new S3Client({
  region,
  // If running in local mock test environment without AWS credentials
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN
  } : undefined
})

// Whitelisted MIME types for secure uploads
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json'
])

// Dangerous executable MIME types explicitly blocked
export const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript'
])

/**
 * Sanitizes object keys to prevent directory traversal and path manipulation attacks
 */
export function sanitizeObjectKey(input: string): string {
  if (!input) return ''
  return input
    .replace(/\0/g, '') // strip null bytes
    .replace(/\\/g, '/') // normalize slashes
    .replace(/\/\.+/g, '/') // strip relative segments (e.g. /../ or /./)
    .replace(/^\.+/g, '') // strip leading dots
    .replace(/\/+/g, '/') // collapse multiple slashes
    .replace(/^\//, '') // strip leading slash
    .trim()
}

/**
 * Validates whether the given MIME type is permitted
 */
export function isAllowedMimeType(contentType: string): boolean {
  if (!contentType) return false
  const lower = contentType.toLowerCase().split(';')[0].trim()
  if (BLOCKED_MIME_TYPES.has(lower)) return false
  return ALLOWED_MIME_TYPES.has(lower)
}

/**
 * Constructs a tenant-scoped avatar object key
 */
export function generateAvatarKey(userId: string, filename: string): string {
  const cleanFilename = sanitizeObjectKey(filename).split('/').pop() || 'avatar.png'
  return `avatars/${userId}/${cleanFilename}`
}

/**
 * Constructs a tenant-scoped workspace attachment object key
 */
export function generateAttachmentKey(workspaceId: string, filename: string): string {
  const cleanFilename = sanitizeObjectKey(filename)
  return `workspaces/${workspaceId}/attachments/${cleanFilename}`
}

export interface PresignedUploadOptions {
  bucket?: string
  key: string
  contentType: string
  expiresInSeconds?: number
}

export interface PresignedDownloadOptions {
  bucket?: string
  key: string
  expiresInSeconds?: number
}

/**
 * Generates a presigned PUT URL for direct browser-to-S3 binary upload
 */
export async function createPresignedUploadUrl(
  options: PresignedUploadOptions
): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
  const cleanKey = sanitizeObjectKey(options.key)
  const targetBucket = options.bucket || bucketName
  const expiresIn = options.expiresInSeconds || 900 // 15 minutes default

  if (!isAllowedMimeType(options.contentType)) {
    throw new Error(`Unsupported or dangerous MIME type: ${options.contentType}`)
  }

  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: cleanKey,
    ContentType: options.contentType
  })

  // Generate genuine presigned URL with SigV4 expiration
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })

  return {
    uploadUrl,
    key: cleanKey,
    expiresIn
  }
}

/**
 * Generates a presigned GET URL for authenticated private document access
 */
export async function createPresignedDownloadUrl(
  options: PresignedDownloadOptions
): Promise<{ downloadUrl: string; key: string; expiresIn: number }> {
  const cleanKey = sanitizeObjectKey(options.key)
  const targetBucket = options.bucket || bucketName
  const expiresIn = options.expiresInSeconds || 900 // 15 minutes default

  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: cleanKey
  })

  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn })

  return {
    downloadUrl,
    key: cleanKey,
    expiresIn
  }
}

/**
 * Resolves a CloudFront CDN or S3 public asset URL
 */
export function getPublicAssetUrl(key: string): string {
  const cleanKey = sanitizeObjectKey(key)
  const domain = process.env.CLOUDFRONT_DOMAIN || process.env.STORAGE_CDN_DOMAIN || cloudfrontDomain
  if (domain) {
    const cleanDomain = domain.replace(/\/$/, '')
    return `${cleanDomain.startsWith('http') ? cleanDomain : `https://${cleanDomain}`}/${cleanKey}`
  }
  const bucket = process.env.S3_STORAGE_BUCKET || process.env.STORAGE_BUCKET_NAME || bucketName
  const awsRegion = process.env.AWS_REGION || region
  return `https://${bucket}.s3.${awsRegion}.amazonaws.com/${cleanKey}`
}
