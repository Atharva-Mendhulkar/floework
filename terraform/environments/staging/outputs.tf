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

# ==============================================================================
# Database Outputs (Phase 3 RDS PostgreSQL 16)
# ==============================================================================

output "rds_endpoint" {
  description = "Connection endpoint of the RDS PostgreSQL instance (host:port)"
  value       = module.database.db_instance_endpoint
}

output "rds_address" {
  description = "DNS hostname of the RDS PostgreSQL instance"
  value       = module.database.db_instance_address
}

output "rds_port" {
  description = "Port for the RDS PostgreSQL instance"
  value       = module.database.db_instance_port
}

output "rds_database_name" {
  description = "Default database name"
  value       = module.database.db_name
}

output "rds_master_username" {
  description = "Master username for database administration"
  value       = module.database.master_username
}

output "rds_master_user_secret_arn" {
  description = "ARN of AWS Secrets Manager secret managing the RDS master password"
  value       = module.database.master_user_secret_arn
}

# ==============================================================================
# Auth Outputs (Amazon Cognito User Pool & SPA Client)
# ==============================================================================

output "cognito_user_pool_id" {
  description = "Amazon Cognito User Pool ID"
  value       = module.auth.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "Amazon Cognito User Pool ARN"
  value       = module.auth.user_pool_arn
}

output "cognito_user_pool_client_id" {
  description = "Amazon Cognito Web App Client ID for React SPA"
  value       = module.auth.user_pool_client_id
}

output "cognito_user_pool_domain" {
  description = "Amazon Cognito hosted domain prefix"
  value       = module.auth.user_pool_domain
}

# ==============================================================================
# AI Engine Outputs (Amazon Bedrock)
# ==============================================================================

output "bedrock_model_id" {
  description = "Configured Amazon Bedrock foundation model ID"
  value       = var.bedrock_model_id
}

output "bedrock_region" {
  description = "Configured Amazon Bedrock AWS region"
  value       = var.bedrock_region
}

# ==============================================================================
# ALB Outputs (Phase 4 Public Ingress)
# ==============================================================================

output "alb_dns_name" {
  description = "Public DNS hostname of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.alb.alb_arn
}

output "target_group_arn" {
  description = "ARN of the ECS target group"
  value       = module.alb.target_group_arn
}

# ==============================================================================
# Cache Outputs (Phase 4 ElastiCache Redis)
# ==============================================================================

output "redis_primary_endpoint" {
  description = "Primary endpoint address for ElastiCache Redis"
  value       = module.cache.primary_endpoint_address
}

output "redis_port" {
  description = "Port for ElastiCache Redis"
  value       = module.cache.port
}

# ==============================================================================
# Compute Outputs (Phase 4 ECS Fargate)
# ==============================================================================

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.compute.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS Fargate service"
  value       = module.compute.service_name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = module.compute.task_definition_arn
}

output "ecs_worker_service_name" {
  description = "Name of the ECS Fargate background worker service"
  value       = module.compute.worker_service_name
}

output "ecs_worker_task_definition_arn" {
  description = "ARN of the ECS background worker task definition"
  value       = module.compute.worker_task_definition_arn
}

output "ecs_migration_task_definition_arn" {
  description = "ARN of the ephemeral database migration task definition"
  value       = module.compute.migration_task_definition_arn
}

# ==============================================================================
# Realtime Outputs (Phase 6 WebSocket API & DynamoDB Connection Store)
# ==============================================================================

output "websocket_api_endpoint" {
  description = "WSS endpoint URL for real-time WebSocket client connections"
  value       = module.realtime.websocket_api_endpoint
}

output "websocket_api_id" {
  description = "API Gateway WebSocket API ID"
  value       = module.realtime.websocket_api_id
}

output "connections_table_name" {
  description = "DynamoDB table name managing active WebSocket client connections"
  value       = module.realtime.connections_table_name
}

# ==============================================================================
# Storage Outputs (Phase 7 Object Storage & CloudFront OAC)
# ==============================================================================

output "storage_bucket_id" {
  description = "Name/ID of the Floework S3 storage bucket"
  value       = module.storage.storage_bucket_id
}

output "storage_bucket_arn" {
  description = "ARN of the Floework S3 storage bucket"
  value       = module.storage.storage_bucket_arn
}

output "storage_bucket_domain_name" {
  description = "Regional domain name of the S3 storage bucket"
  value       = module.storage.storage_bucket_domain_name
}

output "cloudfront_oac_id" {
  description = "ID of the CloudFront Origin Access Control for S3"
  value       = module.storage.cloudfront_oac_id
}

# ==============================================================================
# Queue Outputs (Phase 8 Amazon SQS FIFO Queues & DLQs)
# ==============================================================================

output "focus_completion_queue_url" {
  description = "URL of the focus completion SQS FIFO queue"
  value       = module.queue.focus_completion_queue_url
}

output "focus_completion_queue_arn" {
  description = "ARN of the focus completion SQS FIFO queue"
  value       = module.queue.focus_completion_queue_arn
}

output "focus_completion_dlq_arn" {
  description = "ARN of the focus completion Dead-Letter Queue"
  value       = module.queue.focus_completion_dlq_arn
}

output "audit_logs_queue_url" {
  description = "URL of the audit logs SQS FIFO queue"
  value       = module.queue.audit_logs_queue_url
}

output "audit_logs_queue_arn" {
  description = "ARN of the audit logs SQS FIFO queue"
  value       = module.queue.audit_logs_queue_arn
}

output "notifications_queue_url" {
  description = "URL of the notifications SQS FIFO queue"
  value       = module.queue.notifications_queue_url
}

output "notifications_queue_arn" {
  description = "ARN of the notifications SQS FIFO queue"
  value       = module.queue.notifications_queue_arn
}

# ==============================================================================
# Observability Outputs (Phase 9 CloudWatch Alarms & SNS Alert Bus)
# ==============================================================================

output "sns_alerts_topic_arn" {
  description = "ARN of the SNS topic for operational and system alarms"
  value       = module.observability.sns_alerts_topic_arn
}

output "cloudwatch_alarm_arns" {
  description = "Map of CloudWatch Alarm ARNs for system health monitoring"
  value       = module.observability.alarm_arns
}

# ==============================================================================
# DNS Outputs (Phase 10 Route 53 DNS Routing & SSL Certificates)
# ==============================================================================

output "dns_hosted_zone_id" {
  description = "Route 53 hosted zone ID when custom domain is active"
  value       = module.dns.hosted_zone_id
}

output "dns_api_record" {
  description = "API domain alias DNS record FQDN"
  value       = module.dns.api_dns_record
}

# ==============================================================================
# Email Outputs (Phase 11 Amazon SES Transactional Email)
# ==============================================================================

output "ses_sender_email" {
  description = "Verified SES sender email address"
  value       = module.email.sender_email_address
}

output "ses_sender_identity_arn" {
  description = "ARN of the verified SES sender email identity"
  value       = module.email.sender_email_identity_arn
}

# ==============================================================================
# CI/CD Outputs (GitHub Actions OIDC Provider & Amazon ECR)
# ==============================================================================

output "github_actions_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions via OIDC"
  value       = module.ci_cd.github_actions_role_arn
}

output "ecr_repository_url" {
  description = "URL of the Amazon ECR repository for the Floework API image"
  value       = module.ci_cd.ecr_repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the Amazon ECR repository"
  value       = module.ci_cd.ecr_repository_arn
}




