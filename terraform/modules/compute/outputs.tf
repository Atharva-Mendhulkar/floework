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
