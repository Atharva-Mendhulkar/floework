variable "project_name" {
  type        = string
  description = "Project name identifier (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. staging, prod)"
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for CloudWatch logging and services"
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC"
}

variable "private_app_subnet_ids" {
  type        = list(string)
  description = "List of private application subnets for ECS Fargate task placement"
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID allowing port 3000 strictly from ALB"
}

variable "ecs_execution_role_arn" {
  type        = string
  description = "IAM execution role ARN for image pulling and log streaming"
}

variable "ecs_task_role_arn" {
  type        = string
  description = "IAM task runtime role ARN for application permissions (Bedrock, etc.)"
}

variable "alb_target_group_arn" {
  type        = string
  description = "ARN of the ALB target group receiving forwarded traffic"
}

variable "container_image" {
  type        = string
  default     = "floework-api:staging"
  description = "Container image URI for the API service"
}

variable "container_port" {
  type        = number
  default     = 3000
  description = "Container port on which the API listens"
}

variable "cpu" {
  type        = number
  default     = 512
  description = "CPU units allocated to each Fargate task (512 = 0.5 vCPU)"
}

variable "memory" {
  type        = number
  default     = 1024
  description = "Memory (in MB) allocated to each Fargate task"
}

variable "desired_count" {
  type        = number
  default     = 2
  description = "Number of desired tasks across AZs for high availability"
}

variable "min_capacity" {
  type        = number
  default     = 2
  description = "Minimum number of tasks for auto-scaling"
}

variable "max_capacity" {
  type        = number
  default     = 6
  description = "Maximum number of tasks for auto-scaling"
}

variable "database_host" {
  type        = string
  description = "RDS PostgreSQL DNS hostname"
}

variable "database_port" {
  type        = string
  default     = "5432"
  description = "RDS PostgreSQL connection port"
}

variable "database_name" {
  type        = string
  default     = "floework"
  description = "Default database name"
}

variable "database_username" {
  type        = string
  default     = "floework_admin"
  description = "Master database username"
}

variable "redis_endpoint" {
  type        = string
  description = "ElastiCache Redis primary endpoint hostname"
}

variable "redis_port" {
  type        = string
  default     = "6379"
  description = "ElastiCache Redis connection port"
}

variable "cognito_user_pool_id" {
  type        = string
  description = "Amazon Cognito User Pool ID"
}

variable "cognito_client_id" {
  type        = string
  description = "Amazon Cognito Web App Client ID"
}

variable "bedrock_model_id" {
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
  description = "Amazon Bedrock foundation model ID"
}

variable "bedrock_region" {
  type        = string
  default     = "us-east-1"
  description = "Amazon Bedrock runtime AWS region"
}

variable "focus_completion_queue_url" {
  type        = string
  default     = ""
  description = "URL of the focus completion SQS FIFO queue"
}

variable "audit_logs_queue_url" {
  type        = string
  default     = ""
  description = "URL of the audit logs SQS FIFO queue"
}

variable "notifications_queue_url" {
  type        = string
  default     = ""
  description = "URL of the notifications SQS FIFO queue"
}

variable "worker_desired_count" {
  type        = number
  default     = 1
  description = "Desired number of background worker tasks"
}

variable "worker_cpu" {
  type        = number
  default     = 256
  description = "CPU units allocated to background worker task (256 = 0.25 vCPU)"
}

variable "worker_memory" {
  type        = number
  default     = 512
  description = "Memory (MB) allocated to background worker task"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
