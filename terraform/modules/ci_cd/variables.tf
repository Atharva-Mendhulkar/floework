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

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
