# ==============================================================================
# Amazon S3 & CloudFront Object Storage Module
# Secure private object store with Block Public Access, KMS encryption,
# Origin Access Control (OAC), and ECS Task IAM Scoping.
# ==============================================================================

resource "aws_s3_bucket" "storage" {
  bucket        = "${var.project_name}-${var.environment}-storage-${var.aws_region}"
  force_destroy = var.environment != "prod"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-storage"
    Environment = var.environment
  })
}

# 1. Enforce complete Block Public Access (Zero public bucket access)
resource "aws_s3_bucket_public_access_block" "storage" {
  bucket = aws_s3_bucket.storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. Server-Side Encryption Configuration (AES-256 or KMS)
resource "aws_s3_bucket_server_side_encryption_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != "" ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : null
    }
    bucket_key_enabled = true
  }
}

# 3. Object Versioning for disaster recovery and conflict auditing
resource "aws_s3_bucket_versioning" "storage" {
  bucket = aws_s3_bucket.storage.id

  versioning_configuration {
    status = "Enabled"
  }
}

# 4. CORS configuration for browser direct presigned PUT uploads
resource "aws_s3_bucket_cors_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD", "DELETE"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# 5. Lifecycle configuration to purge incomplete multipart uploads
resource "aws_s3_bucket_lifecycle_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# 6. CloudFront Origin Access Control (OAC) for cached public assets (avatars)
resource "aws_cloudfront_origin_access_control" "storage_oac" {
  name                              = "${var.project_name}-${var.environment}-s3-oac"
  description                       = "Origin Access Control for Floework private S3 storage"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 7. IAM Policy for ECS Backend API Container Runtime
resource "aws_iam_role_policy" "ecs_s3_access" {
  name = "${var.project_name}-${var.environment}-s3-access"
  role = var.ecs_task_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.storage.arn
      },
      {
        Sid    = "S3ObjectReadWrite"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload"
        ]
        Resource = "${aws_s3_bucket.storage.arn}/*"
      }
    ]
  })
}
