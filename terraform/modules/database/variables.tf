variable "project_name" {
  type        = string
  description = "Project name prefix (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. staging, prod)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the database resides"
}

variable "db_subnet_group_name" {
  type        = string
  description = "Name of the DB subnet group created in isolated private subnets"
}

variable "rds_security_group_id" {
  type        = string
  description = "Security group ID for RDS instance allowing ingress strictly from ECS"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS Customer Managed Key ARN for storage and secret encryption"
}

variable "database_name" {
  type        = string
  default     = "floework"
  description = "Name of default PostgreSQL database to create"
}

variable "master_username" {
  type        = string
  default     = "floework_admin"
  description = "Master username for PostgreSQL database"
}

variable "instance_class" {
  type        = string
  default     = "db.t4g.small"
  description = "RDS instance class (Graviton-based for efficiency)"
}

variable "allocated_storage" {
  type        = number
  default     = 20
  description = "Initial allocated storage in gigabytes (gp3)"
}

variable "max_allocated_storage" {
  type        = number
  default     = 100
  description = "Maximum storage limit for storage autoscaling (gp3)"
}

variable "multi_az" {
  type        = bool
  default     = true
  description = "Enable Multi-AZ standby replica for high availability"
}

variable "backup_retention_period" {
  type        = number
  default     = 7
  description = "Days of automated backups to retain"
}

variable "deletion_protection" {
  type        = bool
  default     = false
  description = "Prevent accidental deletion of the database instance"
}

variable "skip_final_snapshot" {
  type        = bool
  default     = true
  description = "Skip final snapshot on destroy (true for non-production environments)"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
