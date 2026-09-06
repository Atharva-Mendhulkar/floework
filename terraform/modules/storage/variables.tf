variable "project_name" {
  type        = string
  description = "Project name identifier (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. staging, prod)"
}

variable "aws_region" {
  type        = string
  description = "AWS region for storage deployment"
}

variable "ecs_task_role_id" {
  type        = string
  description = "ID of the ECS Task Runtime Role for attaching S3 access policies"
}

variable "cors_allowed_origins" {
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:3000"]
  description = "Whitelisted origins for S3 direct CORS uploads"
}

variable "kms_key_arn" {
  type        = string
  default     = ""
  description = "Optional KMS Key ARN for S3 server-side encryption"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
