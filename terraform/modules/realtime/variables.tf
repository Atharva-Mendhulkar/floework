variable "project_name" {
  type        = string
  description = "Project name identifier (e.g. floework)"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (e.g. staging, prod)"
}

variable "ecs_task_role_arn" {
  type        = string
  description = "ARN of the ECS Task Runtime Role requiring ManageConnections permissions"
}

variable "ecs_task_role_id" {
  type        = string
  description = "ID of the ECS Task Runtime Role for attaching inline policies"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
