output "alb_security_group_id" {
  description = "Security group ID for the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "Security group ID for ECS Fargate tasks"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "Security group ID for Amazon RDS PostgreSQL"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security group ID for ElastiCache Redis"
  value       = aws_security_group.redis.id
}

output "kms_key_arn" {
  description = "ARN of the Customer Managed Key (CMK)"
  value       = aws_kms_key.main.arn
}

output "kms_key_id" {
  description = "Key ID of the Customer Managed Key"
  value       = aws_kms_key.main.key_id
}

output "kms_key_alias" {
  description = "Alias of the Customer Managed Key"
  value       = aws_kms_alias.main.name
}

output "ecs_execution_role_arn" {
  description = "ARN of the ECS Task Execution IAM Role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS Task Runtime IAM Role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "ecs_task_role_id" {
  description = "ID of the ECS Task Runtime IAM Role"
  value       = aws_iam_role.ecs_task_role.id
}

output "ecs_task_role_name" {
  description = "Name of the ECS Task Runtime IAM Role"
  value       = aws_iam_role.ecs_task_role.name
}

