output "cluster_id" {
  value       = aws_ecs_cluster.main.id
  description = "ID of the ECS cluster"
}

output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "Name of the ECS cluster"
}

output "cluster_arn" {
  value       = aws_ecs_cluster.main.arn
  description = "ARN of the ECS cluster"
}

output "service_id" {
  value       = aws_ecs_service.api.id
  description = "ID of the ECS service"
}

output "service_name" {
  value       = aws_ecs_service.api.name
  description = "Name of the ECS service"
}

output "task_definition_arn" {
  value       = aws_ecs_task_definition.api.arn
  description = "ARN of the ECS task definition"
}

output "task_definition_family" {
  value       = aws_ecs_task_definition.api.family
  description = "Family name of the task definition"
}

output "log_group_name" {
  value       = aws_cloudwatch_log_group.api.name
  description = "Name of the CloudWatch Log Group for container logs"
}

output "worker_service_id" {
  value       = aws_ecs_service.worker.id
  description = "ID of the worker ECS service"
}

output "worker_service_name" {
  value       = aws_ecs_service.worker.name
  description = "Name of the worker ECS service"
}

output "worker_task_definition_arn" {
  value       = aws_ecs_task_definition.worker.arn
  description = "ARN of the worker ECS task definition"
}

output "worker_log_group_name" {
  value       = aws_cloudwatch_log_group.worker.name
  description = "Name of the CloudWatch Log Group for worker container logs"
}

output "migration_task_definition_arn" {
  value       = aws_ecs_task_definition.migration.arn
  description = "ARN of the ephemeral database migration task definition"
}

output "migration_log_group_name" {
  value       = aws_cloudwatch_log_group.migration.name
  description = "Name of the CloudWatch Log Group for migration logs"
}
