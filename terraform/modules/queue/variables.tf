variable "project_name" {
  type        = string
  description = "Project name identifier (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. staging, prod)"
}

variable "ecs_task_role_id" {
  type        = string
  description = "ID of the ECS Task Runtime Role for attaching SQS policies"
}

variable "kms_key_arn" {
  type        = string
  default     = ""
  description = "Optional KMS Key ARN for SQS server-side encryption"
}

variable "max_receive_count" {
  type        = number
  default     = 3
  description = "Maximum number of times a message is delivered before being sent to DLQ"
}

variable "message_retention_seconds" {
  type        = number
  default     = 86400 # 1 day for primary queues
  description = "Number of seconds Amazon SQS retains a message"
}

variable "dlq_retention_seconds" {
  type        = number
  default     = 1209600 # 14 days for DLQ investigation
  description = "Number of seconds Amazon SQS retains a dead-letter message"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
