# ==============================================================================
# AWS Systems Manager (SSM) Parameter Store Hierarchy
# ==============================================================================

locals {
  prefix = "/${var.project_name}/${var.environment}/app"
}

resource "aws_ssm_parameter" "gemini_api_key" {
  count       = var.gemini_api_key != "" ? 1 : 0
  name        = "${local.prefix}/GEMINI_API_KEY"
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
  name        = "${local.prefix}/JWT_SECRET"
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
  name        = "${local.prefix}/UPSTASH_REDIS_REST_URL"
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
  name        = "${local.prefix}/UPSTASH_REDIS_REST_TOKEN"
  description = "Upstash Redis REST authentication token"
  type        = "SecureString"
  key_id      = var.kms_key_id
  value       = var.upstash_redis_rest_token

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-redis-token"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "bedrock_model_id" {
  name        = "${local.prefix}/BEDROCK_MODEL_ID"
  description = "Amazon Bedrock Foundation Model ID for AI narrative generation"
  type        = "String"
  value       = var.bedrock_model_id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-bedrock-model"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "bedrock_region" {
  name        = "${local.prefix}/BEDROCK_REGION"
  description = "AWS region for Amazon Bedrock runtime"
  type        = "String"
  value       = var.bedrock_region

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-bedrock-region"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name        = "${local.prefix}/COGNITO_USER_POOL_ID"
  description = "Amazon Cognito User Pool ID for JWT validation"
  type        = "String"
  value       = var.cognito_user_pool_id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-cognito-pool"
    Environment = var.environment
  })
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name        = "${local.prefix}/COGNITO_CLIENT_ID"
  description = "Amazon Cognito User Pool Client ID for Web SPA"
  type        = "String"
  value       = var.cognito_client_id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-param-cognito-client"
    Environment = var.environment
  })
}

