variable "project_name" {
  description = "Project name identifier"
  type        = string
  default     = "floework"
}

variable "environment" {
  description = "Deployment environment name (e.g. prod, staging)"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS Customer Managed Key ARN for encryption at rest"
  type        = string
  default     = ""
}

variable "enable_cloudtrail" {
  description = "Whether to provision multi-region AWS CloudTrail"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Whether to provision AWS Config recorder and managed rules"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags applied to all compliance resources"
  type        = map(string)
  default     = {}
}
