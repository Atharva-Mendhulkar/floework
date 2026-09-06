variable "project_name" {
  type        = string
  description = "Project prefix identifier (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. staging, prod)"
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where the ALB and Target Group reside"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for internet-facing ALB placement"
}

variable "alb_security_group_id" {
  type        = string
  description = "Security group ID allowing inbound HTTP/HTTPS traffic to the ALB"
}

variable "health_check_path" {
  type        = string
  default     = "/health"
  description = "Target group health check probe path"
}

variable "enable_ssl" {
  type        = bool
  default     = false
  description = "Enable HTTPS listener (requires valid certificate_arn)"
}

variable "certificate_arn" {
  type        = string
  default     = null
  description = "ACM Certificate ARN for the HTTPS listener"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
