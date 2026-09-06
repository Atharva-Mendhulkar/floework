variable "project_name" {
  type        = string
  description = "Project name identifier (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. staging, prod)"
}

variable "redis_subnet_group_name" {
  type        = string
  description = "Name of the ElastiCache subnet group created in isolated private subnets"
}

variable "redis_security_group_id" {
  type        = string
  description = "Security group ID allowing port 6379 strictly from ECS tasks"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS Customer Managed Key ARN for at-rest encryption"
}

variable "node_type" {
  type        = string
  default     = "cache.t4g.micro"
  description = "ElastiCache node instance type (Graviton-based for efficiency)"
}

variable "num_cache_clusters" {
  type        = number
  default     = 1
  description = "Number of cache clusters (1 for single-node staging, 2+ for multi-AZ replica prod)"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
