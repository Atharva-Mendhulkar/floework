# ==============================================================================
# Variables: Frontend Static Web Hosting & CloudFront CDN
# ==============================================================================

variable "project_name" {
  description = "Prefix identifier for all infrastructure resources"
  type        = string
}

variable "environment" {
  description = "Target deployment environment (staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "Target AWS region for S3 bucket hosting"
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "Resource tags applied to all provisioned infrastructure"
  type        = map(string)
  default     = {}
}

variable "kms_key_arn" {
  description = "Optional KMS customer managed key ARN for S3 server-side encryption"
  type        = string
  default     = ""
}

variable "enable_custom_domain" {
  description = "Set to true to attach custom Route 53 domain and ACM SSL certificate to CloudFront"
  type        = bool
  default     = false
}

variable "custom_domain_name" {
  description = "Apex or sub-domain name for frontend web traffic (e.g., floework.internal)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of validated AWS Certificate Manager SSL certificate for custom domain"
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront edge location pricing tier (PriceClass_100, PriceClass_200, PriceClass_All)"
  type        = string
  default     = "PriceClass_100"
}
