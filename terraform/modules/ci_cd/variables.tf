variable "project_name" {
  description = "Prefix identifier for all infrastructure resources"
  type        = string
  default     = "floework"
}

variable "environment" {
  description = "Target deployment environment"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo for OIDC subject binding"
  type        = string
  default     = "Atharva-Mendhulkar/floework"
}

variable "kms_key_arn" {
  description = "ARN of KMS customer managed key for ECR image encryption"
  type        = string
}

variable "enable_oidc_provider" {
  description = "Whether to create the GitHub OIDC provider (false if already exists in AWS account)"
  type        = bool
  default     = true
}

variable "ecs_execution_role_arn" {
  description = "ARN of the ECS task execution IAM role for scoping iam:PassRole in CI/CD"
  type        = string
  default     = ""
}

variable "ecs_task_role_arn" {
  description = "ARN of the ECS task runtime IAM role for scoping iam:PassRole in CI/CD"
  type        = string
  default     = ""
}

variable "frontend_bucket_arn" {
  description = "ARN of the frontend S3 bucket for deployment synchronization"
  type        = string
  default     = ""
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the frontend CloudFront distribution for cache invalidation"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

