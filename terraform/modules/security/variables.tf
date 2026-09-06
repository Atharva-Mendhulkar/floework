variable "project_name" {
  description = "The prefix name for all provisioned resources"
  type        = string
  default     = "floework"
}

variable "environment" {
  description = "Deployment environment (e.g. staging, production)"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC where security groups will be provisioned"
  type        = string
}

variable "app_port" {
  description = "Container port for the ECS Fastify backend application"
  type        = number
  default     = 3000
}

variable "tags" {
  description = "Resource tags to append to all security resources"
  type        = map(string)
  default     = {}
}
