# ==============================================================================
# Production Environment Variables
# ==============================================================================

variable "aws_region" {
  description = "Target AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix identifier for all infrastructure resources"
  type        = string
  default     = "floework"
}

variable "environment" {
  description = "Target deployment environment"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the production VPC (distinct from staging to allow peering)"
  type        = string
  default     = "10.1.0.0/16"
}

variable "availability_zones" {
  description = "List of 2 Availability Zones for multi-AZ topology"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets"
  type        = list(string)
  default     = ["10.1.10.0/24", "10.1.11.0/24"]
}

variable "private_data_subnet_cidrs" {
  description = "CIDR blocks for private isolated data subnets"
  type        = list(string)
  default     = ["10.1.20.0/24", "10.1.21.0/24"]
}

variable "enable_multi_az_nat" {
  description = "Provision 1 NAT Gateway per AZ (high availability for production)"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# Database Variables (Production RDS PostgreSQL 16)
# ------------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ standby for high availability in production"
  type        = bool
  default     = true
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in gigabytes (gp3)"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "Maximum storage limit for autoscaling in gigabytes (gp3)"
  type        = number
  default     = 200
}

variable "db_backup_retention_period" {
  description = "Days of automated backups to retain (30 days for production PITR)"
  type        = number
  default     = 30
}

variable "db_deletion_protection" {
  description = "Prevent accidental deletion of the production database instance"
  type        = bool
  default     = true
}

variable "db_skip_final_snapshot" {
  description = "Take final snapshot on destroy (must be false in production)"
  type        = bool
  default     = false
}

# ------------------------------------------------------------------------------
# Cache Variables (Production ElastiCache Redis)
# ------------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache Redis node instance type"
  type        = string
  default     = "cache.t4g.small"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters (2 for multi-AZ automatic failover replica in production)"
  type        = number
  default     = 2
}

# ------------------------------------------------------------------------------
# Compute Variables (Production ECS Fargate)
# ------------------------------------------------------------------------------

variable "container_image" {
  description = "Container image URI for the production API service"
  type        = string
  default     = "floework-api:production"
}

variable "ecs_cpu" {
  description = "CPU units allocated to each Fargate task (512 = 0.5 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Memory (in MB) allocated to each Fargate task (1024 = 1 GB)"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Number of Fargate tasks to run across availability zones (minimum 2 for HA)"
  type        = number
  default     = 2
}

# ------------------------------------------------------------------------------
# AWS WAF v2 Perimeter Defense
# ------------------------------------------------------------------------------

variable "waf_rate_limit_per_5m" {
  description = "Maximum requests allowed per 5 minutes per IP address before rate limiting blocks"
  type        = number
  default     = 1000
}

# ------------------------------------------------------------------------------
# Domain & DNS Variables
# ------------------------------------------------------------------------------

variable "enable_custom_domain" {
  description = "Set to true to provision public Route 53 zones, DNS alias records, and ACM SSL certificates"
  type        = bool
  default     = true
}

variable "custom_domain_name" {
  description = "Authoritative public domain name for Floework production"
  type        = string
  default     = "floework.com"
}

variable "enable_ses_domain" {
  description = "Enable SES DKIM domain verification for transactional email sending"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# CI/CD & Identity Variables
# ------------------------------------------------------------------------------

variable "github_repo" {
  description = "GitHub repository for Actions OIDC subject binding"
  type        = string
  default     = "Atharva-Mendhulkar/floework"
}

variable "enable_ci_cd_oidc" {
  description = "Set to true to provision GitHub Actions OIDC provider, IAM role, and ECR repository"
  type        = bool
  default     = true
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock Foundation Model ID for AI standup narratives"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "bedrock_region" {
  description = "AWS region for Amazon Bedrock runtime"
  type        = string
  default     = "us-east-1"
}

# ------------------------------------------------------------------------------
# Legacy & Secret Defaults (SSM Hierarchy)
# ------------------------------------------------------------------------------
variable "gemini_api_key" {
  description = "Google Gemini API key for narrative synthesis"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "Secret used to verify session authentication tokens"
  type        = string
  sensitive   = true
  default     = ""
}

variable "upstash_redis_rest_url" {
  description = "Upstash Redis REST endpoint URL"
  type        = string
  default     = ""
}

variable "upstash_redis_rest_token" {
  description = "Upstash Redis REST authentication token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_compliance_logging" {
  description = "Enable AWS CloudTrail and S3 compliance audit log storage"
  type        = bool
  default     = true
}

variable "enable_config_evaluation" {
  description = "Enable AWS Config continuous resource recording and compliance rules"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Default resource tags"
  default = {
    Project   = "floework"
    ManagedBy = "terraform"
  }
}

variable "monthly_budget_amount" {
  description = "Monthly budget limit in USD for production environment"
  type        = number
  default     = 200
}

variable "enable_cost_anomaly_detection" {
  description = "Set to true to provision AWS Cost Anomaly Monitor and SNS alert subscription"
  type        = bool
  default     = true
}

variable "anomaly_threshold_amount" {
  description = "Absolute dollar impact threshold to trigger cost anomaly notifications"
  type        = number
  default     = 20
}

variable "notification_emails" {
  description = "Optional list of subscriber email addresses for budget alerts"
  type        = list(string)
  default     = []
}
