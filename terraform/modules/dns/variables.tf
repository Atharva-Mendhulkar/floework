# ==============================================================================
# Route 53 DNS & SSL Certificate Module Variables
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
  description = "Domain name for DNS routing (e.g. floework.com)"
  type        = string
  default     = "floework.internal"
}

variable "enable_custom_domain" {
  description = "Whether to provision public Route 53 zones and ACM certificates"
  type        = bool
  default     = false
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "Canonical hosted zone ID of the Application Load Balancer"
  type        = string
  default     = ""
}

variable "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution for web frontend"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
