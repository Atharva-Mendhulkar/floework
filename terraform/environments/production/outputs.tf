# ==============================================================================
# Production Environment Outputs
# ==============================================================================

# ------------------------------------------------------------------------------
# Networking Outputs
# ------------------------------------------------------------------------------

output "vpc_id" {
  description = "Production VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "List of private application subnet IDs (ECS Fargate)"
  value       = module.networking.private_app_subnet_ids
}

output "private_data_subnet_ids" {
  description = "List of isolated private data subnet IDs (RDS & Redis)"
  value       = module.networking.private_data_subnet_ids
}

output "nat_gateway_ips" {
  description = "Public IP addresses of the NAT Gateway(s) across multi-AZ topology"
  value       = module.networking.nat_gateway_ips
}

# ------------------------------------------------------------------------------
# Application Load Balancer Outputs
# ------------------------------------------------------------------------------

output "alb_arn" {
  description = "ARN of the production Application Load Balancer"
  value       = module.alb.alb_arn
}

output "alb_dns_name" {
  description = "Public DNS hostname of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Canonical hosted zone ID of the ALB"
  value       = module.alb.alb_zone_id
}

output "alb_target_group_arn" {
  description = "ARN of the default ALB target group"
  value       = module.alb.target_group_arn
}

# ------------------------------------------------------------------------------
# AWS WAF v2 Outputs
# ------------------------------------------------------------------------------

output "waf_web_acl_arn" {
  description = "ARN of the production AWS WAF Regional Web ACL"
  value       = module.waf.web_acl_arn
}

output "waf_web_acl_id" {
  description = "ID of the production AWS WAF Regional Web ACL"
  value       = module.waf.web_acl_id
}

output "waf_web_acl_name" {
  description = "Name of the production AWS WAF Regional Web ACL"
  value       = module.waf.web_acl_name
}

# ------------------------------------------------------------------------------
# Database Outputs (Amazon RDS PostgreSQL 16 Multi-AZ)
# ------------------------------------------------------------------------------

output "rds_endpoint" {
  description = "DNS hostname of the production RDS PostgreSQL instance"
  value       = module.database.db_instance_address
}

output "rds_port" {
  description = "Port of the production RDS PostgreSQL instance"
  value       = module.database.db_instance_port
}

output "rds_database_name" {
  description = "Name of the production default database"
  value       = module.database.db_name
}

output "rds_master_user_secret_arn" {
  description = "ARN of AWS Secrets Manager secret managing the RDS master password"
  value       = module.database.master_user_secret_arn
}

# ------------------------------------------------------------------------------
# Cache Outputs (Amazon ElastiCache Redis)
# ------------------------------------------------------------------------------

output "redis_endpoint" {
  description = "Primary endpoint address for the Redis replication group"
  value       = module.cache.primary_endpoint_address
}

output "redis_port" {
  description = "Port number on which the cache cluster accepts connections"
  value       = module.cache.port
}

# ------------------------------------------------------------------------------
# Compute Outputs (Amazon ECS Fargate)
# ------------------------------------------------------------------------------

output "ecs_cluster_name" {
  description = "Production ECS cluster name"
  value       = module.compute.cluster_name
}

output "ecs_service_name" {
  description = "Production ECS Fargate API service name"
  value       = module.compute.service_name
}

# ------------------------------------------------------------------------------
# Auth Outputs (Amazon Cognito)
# ------------------------------------------------------------------------------

output "cognito_user_pool_id" {
  description = "Amazon Cognito User Pool ID"
  value       = module.auth.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Amazon Cognito Web App Client ID for React SPA"
  value       = module.auth.user_pool_client_id
}

# ------------------------------------------------------------------------------
# Storage & Frontend Outputs (Amazon S3 & CloudFront CDN)
# ------------------------------------------------------------------------------

output "s3_storage_bucket_name" {
  description = "Private Amazon S3 media and user storage bucket name"
  value       = module.storage.storage_bucket_id
}

output "frontend_s3_bucket_name" {
  description = "Name of the private S3 bucket hosting frontend static web assets"
  value       = module.frontend.s3_bucket_name
}

output "frontend_cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution delivering the production frontend"
  value       = module.frontend.cloudfront_distribution_id
}

output "frontend_cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution delivering frontend assets"
  value       = module.frontend.cloudfront_domain_name
}

# ------------------------------------------------------------------------------
# Asynchronous Messaging (Amazon SQS FIFO)
# ------------------------------------------------------------------------------

output "focus_completion_queue_url" {
  description = "URL of the focus completion SQS FIFO queue"
  value       = module.queue.focus_completion_queue_url
}

output "audit_logs_queue_url" {
  description = "URL of the audit logs SQS FIFO queue"
  value       = module.queue.audit_logs_queue_url
}

output "notifications_queue_url" {
  description = "URL of the transactional notifications SQS FIFO queue"
  value       = module.queue.notifications_queue_url
}

# ------------------------------------------------------------------------------
# Observability & Alerts (Amazon CloudWatch & SNS)
# ------------------------------------------------------------------------------

output "sns_alerts_topic_arn" {
  description = "ARN of the production SNS alert bus topic"
  value       = module.observability.sns_alerts_topic_arn
}

output "alarm_arns" {
  description = "Map of all provisioned CloudWatch metric alarm ARNs"
  value       = module.observability.alarm_arns
}

# ------------------------------------------------------------------------------
# DNS Outputs (Amazon Route 53 & ACM)
# ------------------------------------------------------------------------------

output "dns_hosted_zone_id" {
  description = "Route 53 hosted zone ID when custom domain is active"
  value       = module.dns.hosted_zone_id
}

output "dns_api_record" {
  description = "API domain alias DNS record FQDN"
  value       = module.dns.api_dns_record
}

output "dns_web_record" {
  description = "Web frontend apex domain alias DNS record FQDN"
  value       = module.dns.web_dns_record
}

output "dns_certificate_arn" {
  description = "ARN of the managed ACM SSL/TLS certificate"
  value       = module.dns.certificate_arn
}

output "dns_name_servers" {
  description = "Name servers for the public Route 53 hosted zone"
  value       = module.dns.name_servers
}

# ------------------------------------------------------------------------------
# Email Outputs (Amazon SES)
# ------------------------------------------------------------------------------

output "ses_sender_email" {
  description = "Verified SES sender email address"
  value       = module.email.sender_email_address
}

# ------------------------------------------------------------------------------
# CI/CD Outputs (GitHub Actions OIDC & Amazon ECR)
# ------------------------------------------------------------------------------

output "github_actions_role_arn" {
  description = "IAM Role ARN assumed by GitHub Actions via AWS OIDC federation"
  value       = module.ci_cd.github_actions_role_arn
}

output "ecr_repository_url" {
  description = "Amazon ECR repository URL for production API container images"
  value       = module.ci_cd.ecr_repository_url
}

# ------------------------------------------------------------------------------
# Compliance & Governance Outputs (AWS CloudTrail & AWS Config)
# ------------------------------------------------------------------------------

output "compliance_audit_bucket_id" {
  description = "Name of the dedicated S3 compliance audit bucket"
  value       = module.compliance.audit_bucket_id
}

output "compliance_cloudtrail_arn" {
  description = "ARN of the production multi-region CloudTrail"
  value       = module.compliance.cloudtrail_arn
}

output "compliance_config_recorder_id" {
  description = "ID of the AWS Config configuration recorder"
  value       = module.compliance.config_recorder_id
}

output "compliance_config_rules" {
  description = "List of active AWS Config continuous compliance rules"
  value       = module.compliance.config_rules
}
