# ==============================================================================
# AWS Systems Manager (SSM) Parameter Store Hierarchy
# ==============================================================================

locals {
  prefix = "/${var.project_name}/${var.environment}/app"
}

resource "aws_ssm_parameter" "supabase_url" {
  name        = "${locals.prefix}/SUPABASE_URL"
  description = "Supabase API and database project endpoint URL"
  type        = "String"
  value       = var.supabase_url

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-supabase-url"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "supabase_anon_key" {
  count       = var.supabase_anon_key != "" ? 1 : 0
  name        = "${locals.prefix}/SUPABASE_ANON_KEY"
  description = "Supabase client publishable anon key"
  type        = "String"
  value       = var.supabase_anon_key

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-supabase-anon-key"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "supabase_service_role_key" {
  count       = var.supabase_service_role_key != "" ? 1 : 0
  name        = "${locals.prefix}/SUPABASE_SERVICE_ROLE_KEY"
  description = "Supabase backend administrative service role key"
  type        = "SecureString"
  key_id      = var.kms_key_id
  value       = var.supabase_service_role_key

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-supabase-service-key"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "gemini_api_key" {
  count       = var.gemini_api_key != "" ? 1 : 0
  name        = "${locals.prefix}/GEMINI_API_KEY"
  description = "Google Gemini AI API Key for executive standup narratives"
  type        = "SecureString"
  key_id      = var.kms_key_id
  value       = var.gemini_api_key

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-gemini-key"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "jwt_secret" {
  count       = var.jwt_secret != "" ? 1 : 0
  name        = "${locals.prefix}/JWT_SECRET"
  description = "Cryptographic secret for verifying session authentication tokens"
  type        = "SecureString"
  key_id      = var.kms_key_id
  value       = var.jwt_secret

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-jwt-secret"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "upstash_redis_rest_url" {
  count       = var.upstash_redis_rest_url != "" ? 1 : 0
  name        = "${locals.prefix}/UPSTASH_REDIS_REST_URL"
  description = "Upstash Redis REST endpoint URL"
  type        = "String"
  value       = var.upstash_redis_rest_url

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-redis-url"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "upstash_redis_rest_token" {
  count       = var.upstash_redis_rest_token != "" ? 1 : 0
  name        = "${locals.prefix}/UPSTASH_REDIS_REST_TOKEN"
  description = "Upstash Redis REST authentication token"
  type        = "SecureString"
  key_id      = var.kms_key_id
  value       = var.upstash_redis_rest_token

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-redis-token"
    Environment = var.environment
  })
}
