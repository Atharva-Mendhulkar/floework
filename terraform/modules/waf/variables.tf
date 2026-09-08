# ==============================================================================
# AWS WAF v2 Module Variables
# ==============================================================================

variable "project_name" {
  description = "Project name prefix for naming resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (staging/prod)"
  type        = string
}

variable "alb_arn" {
  description = "ARN of the Application Load Balancer to associate with the Web ACL"
  type        = string
  default     = ""
}

variable "rate_limit_requests_per_5m" {
  description = "Maximum number of requests permitted per 5-minute period per IP"
  type        = number
  default     = 1000
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
