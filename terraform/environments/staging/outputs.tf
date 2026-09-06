# ==============================================================================
# Networking Outputs (Foundation for Phase 3 RDS & Phase 4 ECS)
# ==============================================================================

output "vpc_id" {
  description = "The ID of the provisioned VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for ALB placement"
  value       = module.networking.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "List of private application subnet IDs for ECS Fargate task placement"
  value       = module.networking.private_app_subnet_ids
}

output "private_data_subnet_ids" {
  description = "List of private data subnet IDs for RDS and ElastiCache placement"
  value       = module.networking.private_data_subnet_ids
}

output "db_subnet_group_name" {
  description = "Name of the RDS DB subnet group (Required for Phase 3)"
  value       = module.networking.db_subnet_group_name
}

output "redis_subnet_group_name" {
  description = "Name of the ElastiCache Redis subnet group (Required for Phase 4)"
  value       = module.networking.redis_subnet_group_name
}

output "nat_gateway_ips" {
  description = "Public IP address(es) of the NAT Gateway(s)"
  value       = module.networking.nat_gateway_ips
}

# ==============================================================================
# Security Outputs (Security Groups, KMS & IAM)
# ==============================================================================

output "alb_security_group_id" {
  description = "Security group ID for Application Load Balancer"
  value       = module.security.alb_security_group_id
}

output "ecs_security_group_id" {
  description = "Security group ID for ECS Fargate tasks (Required for Phase 4)"
  value       = module.security.ecs_security_group_id
}

output "rds_security_group_id" {
  description = "Security group ID for Amazon RDS PostgreSQL (Required for Phase 3)"
  value       = module.security.rds_security_group_id
}

output "redis_security_group_id" {
  description = "Security group ID for ElastiCache Redis (Required for Phase 4)"
  value       = module.security.redis_security_group_id
}

output "kms_key_arn" {
  description = "ARN of the KMS Customer Managed Key"
  value       = module.security.kms_key_arn
}

output "kms_key_id" {
  description = "Key ID of the KMS Customer Managed Key"
  value       = module.security.kms_key_id
}

output "ecs_execution_role_arn" {
  description = "ARN of the ECS Task Execution IAM Role"
  value       = module.security.ecs_execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS Task Runtime IAM Role"
  value       = module.security.ecs_task_role_arn
}

# ==============================================================================
# Secrets Outputs
# ==============================================================================

output "ssm_parameter_prefix" {
  description = "SSM Parameter Store hierarchical path prefix"
  value       = module.secrets.parameter_prefix
}
