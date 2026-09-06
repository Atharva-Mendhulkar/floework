variable "project_name" {
  description = "The prefix name for all provisioned resources"
  type        = string
  default     = "floework"
}

variable "environment" {
  description = "Deployment environment (e.g. staging, production)"
  type        = string
}

variable "kms_key_id" {
  description = "KMS Key ID used to encrypt SecureString parameters"
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  default     = "https://vlozimkyxyyigclfdntp.supabase.co"
}

variable "supabase_anon_key" {
  description = "Supabase publishable anon key"
  type        = string
  default     = ""
}

variable "supabase_service_role_key" {
  description = "Supabase backend service role key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_api_key" {
  description = "Google Gemini API key for narrative synthesis"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret for session validation"
  type        = string
  sensitive   = true
  default     = ""
}

variable "upstash_redis_rest_url" {
  description = "Upstash Redis REST endpoint URL"
  type        = string
  default     = ""
}

variable "upstash_redis_rest_token" {
  description = "Upstash Redis REST authentication token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock Foundation Model ID for AI narrative generation"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "bedrock_region" {
  description = "AWS region for Amazon Bedrock runtime"
  type        = string
  default     = "us-east-1"
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID for JWT validation"
  type        = string
  default     = ""
}

variable "cognito_client_id" {
  description = "Cognito User Pool Client ID for Web SPA"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Resource tags to append to all SSM parameters"
  type        = map(string)
  default     = {}
}

