# ==============================================================================
# Observability Module Variables
# ==============================================================================

variable "project_name" {
  description = "Project name prefix for naming resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (staging/prod)"
  type        = string
}

variable "ecs_cluster_name" {
  description = "Name of the ECS Cluster to monitor"
  type        = string
}

variable "ecs_service_name" {
  description = "Name of the ECS Service to monitor"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer for CloudWatch metrics"
  type        = string
}

variable "target_group_arn_suffix" {
  description = "ARN suffix of the Target Group for CloudWatch metrics"
  type        = string
}

variable "db_instance_id" {
  description = "Identifier of the RDS Database instance to monitor"
  type        = string
}

variable "focus_completion_dlq_name" {
  description = "Name of the Focus Completion DLQ to monitor"
  type        = string
}

variable "audit_logs_dlq_name" {
  description = "Name of the Audit Logs DLQ to monitor"
  type        = string
}

variable "notifications_dlq_name" {
  description = "Name of the Notifications DLQ to monitor"
  type        = string
}

variable "ecs_task_role_id" {
  description = "ID / Name of the ECS Task IAM Role to attach telemetry permissions"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the project KMS Key for SNS encryption at rest"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
