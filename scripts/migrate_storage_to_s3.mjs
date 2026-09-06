#!/usr/bin/env node
// scripts/migrate_storage_to_s3.mjs
// ==============================================================================
// Automated Storage Migration: Supabase Storage to Amazon S3
// Migrates user avatars and workspace attachments while preserving object keys,
// content types, and metadata.
// ==============================================================================

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
const S3_BUCKET = process.env.S3_STORAGE_BUCKET || process.env.STORAGE_BUCKET_NAME || 'floework-staging-storage'
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'

const isDryRun = process.argv.includes('--dry-run')

export async function migrateBucket(supabase, s3, bucketName, prefix = '') {
  console.log(`\n[Migration] Scanning Supabase bucket "${bucketName}" (prefix: "${prefix}")...`)
  
  const { data: files, error } = await supabase.storage.from(bucketName).list(prefix)
  if (error) {
    console.error(`[Migration] Failed to list bucket "${bucketName}":`, error.message)
    return { migrated: 0, skipped: 0, failed: 1 }
  }

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const item of files || []) {
    // If it's a folder, recurse
    if (item.id === null) {
      const subPath = prefix ? `${prefix}/${item.name}` : item.name
      const subResults = await migrateBucket(supabase, s3, bucketName, subPath)
      migrated += subResults.migrated
      skipped += subResults.skipped
      failed += subResults.failed
      continue
    }

    const itemPath = prefix ? `${prefix}/${item.name}` : item.name
    const targetKey = `${bucketName}/${itemPath}`

    // Check if already in S3 (idempotent migration)
    try {
      await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: targetKey }))
      console.log(`  [Skip] Exists in S3: s3://${S3_BUCKET}/${targetKey}`)
      skipped++
      continue
    } catch (headErr) {
      // Object doesn't exist, proceed to upload
    }

    if (isDryRun) {
      console.log(`  [Dry-Run] Would migrate: ${itemPath} -> s3://${S3_BUCKET}/${targetKey}`)
      migrated++
      continue
    }

    // Download from Supabase
    const { data: blob, error: downloadError } = await supabase.storage.from(bucketName).download(itemPath)
    if (downloadError || !blob) {
      console.error(`  [Error] Failed download: ${itemPath}:`, downloadError?.message)
      failed++
      continue
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const contentType = item.metadata?.mimetype || 'application/octet-stream'

    // Upload to S3
    try {
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: targetKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          migrated_from: 'supabase',
          original_bucket: bucketName,
          migrated_at: new Date().toISOString()
        }
      }))
      console.log(`  [Migrated] s3://${S3_BUCKET}/${targetKey} (${buffer.length} bytes, ${contentType})`)
      migrated++
    } catch (uploadErr) {
      console.error(`  [Error] S3 upload failed for ${targetKey}:`, uploadErr.message)
      failed++
    }
  }

  return { migrated, skipped, failed }
}

export async function runMigration() {
  console.log('====================================================')
  console.log('Floework: Supabase Storage to Amazon S3 Migration')
  console.log(`Target Bucket: ${S3_BUCKET} (${AWS_REGION})`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`)
  console.log('====================================================')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const s3 = new S3Client({ region: AWS_REGION })

  const buckets = ['avatars', 'attachments']
  let totalMigrated = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const bucket of buckets) {
    const result = await migrateBucket(supabase, s3, bucket)
    totalMigrated += result.migrated
    totalSkipped += result.skipped
    totalFailed += result.failed
  }

  console.log('\n====================================================')
  console.log(`Migration Summary: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalFailed} failed`)
  console.log('====================================================')
  return { totalMigrated, totalSkipped, totalFailed }
}

if (process.argv[1] && process.argv[1].endsWith('migrate_storage_to_s3.mjs')) {
  runMigration().catch((err) => {
    console.error('[Fatal Migration Error]:', err)
    process.exit(1)
  })
}
