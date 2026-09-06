# ==============================================================================
# Amazon SES Email Module Variables
# ==============================================================================

variable "project_name" {
  description = "Project name prefix for naming resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (staging/prod)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for SES identity verification"
  type        = string
  default     = "floework.internal"
}

variable "sender_email" {
  description = "Verified email identity for sending transactional emails"
  type        = string
  default     = "notifications@floework.internal"
}

variable "enable_ses_domain" {
  description = "Set to true to verify entire custom domain identity in SES"
  type        = bool
  default     = false
}

variable "ecs_task_role_id" {
  description = "ID / Name of the ECS Task IAM Role to attach SES sending permissions"
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
