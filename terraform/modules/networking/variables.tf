variable "project_name" {
  description = "The prefix name for all provisioned resources"
  type        = string
  default     = "floework"
}

variable "environment" {
  description = "Deployment environment (e.g. staging, production)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of Availability Zones to deploy subnets into"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (ALB & NAT Gateways)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private application subnets (ECS Fargate)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "private_data_subnet_cidrs" {
  description = "CIDR blocks for private isolated data subnets (RDS PostgreSQL & ElastiCache Redis)"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "enable_multi_az_nat" {
  description = "Provision 1 NAT Gateway per AZ (high availability for production). False provisions 1 single NAT Gateway to save staging costs."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Resource tags to append to all networking resources"
  type        = map(string)
  default     = {}
}
