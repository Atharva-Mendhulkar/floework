variable "project_name" {
  type        = string
  description = "Project name prefix (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. staging, prod)"
}

variable "user_pool_domain_prefix" {
  type        = string
  default     = null
  description = "Custom prefix for Cognito hosted domain. If null, defaults to project_name-environment."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
