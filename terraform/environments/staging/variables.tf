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
  default     = "staging"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of 2 Availability Zones for multi-AZ topology"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "private_data_subnet_cidrs" {
  description = "CIDR blocks for private isolated data subnets"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "enable_multi_az_nat" {
  description = "Set to false for staging (single NAT in AZ-a) to eliminate idle hourly NAT costs"
  type        = bool
  default     = false
}

variable "supabase_url" {
  description = "Supabase project endpoint URL"
  type        = string
  default     = "https://vlozimkyxyyigclfdntp.supabase.co"
}

variable "supabase_anon_key" {
  description = "Supabase publishable anon key"
  type        = string
  default     = ""
}

variable "supabase_service_role_key" {
  description = "Supabase administrative service role key"
  type        = string
  sensitive   = true
  default     = ""
}

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

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class"
  type        = string
  default     = "db.t4g.small"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ standby for high availability in staging"
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

variable "container_image" {
  description = "Container image URI for the API service"
  type        = string
  default     = "floework-api:staging"
}

variable "ecs_cpu" {
  description = "CPU units allocated to each Fargate task (512 = 0.5 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Memory (in MB) allocated to each Fargate task"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Number of Fargate tasks to run across availability zones"
  type        = number
  default     = 2
}

variable "redis_node_type" {
  description = "ElastiCache Redis node instance type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "tags" {
  description = "Default resource tags"
  default = {
    Project   = "floework"
    ManagedBy = "terraform"
  }
}

variable "enable_custom_domain" {
  description = "Set to true to provision public Route 53 zones, DNS alias records, and ACM SSL certificates"
  type        = bool
  default     = false
}

variable "custom_domain_name" {
  description = "Public domain name for Route 53 DNS and ACM certificate"
  type        = string
  default     = "floework.internal"
}

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



