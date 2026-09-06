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

variable "tags" {
  description = "Default resource tags"
  type        = map(string)
  default = {
    Project   = "floework"
    ManagedBy = "terraform"
  }
}
