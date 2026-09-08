terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  # NOTE: In production, configure an S3 remote backend with DynamoDB state locking:
  # backend "s3" {
  #   bucket         = "floework-terraform-state-production"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "floework-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      Environment = var.environment
    })
  }
}

# ==============================================================================
# Module: Networking (VPC, Dual-AZ Subnets, Multi-AZ Redundant NAT Gateways)
# ==============================================================================

module "networking" {
  source = "../../modules/networking"

  project_name              = var.project_name
  environment               = var.environment
  vpc_cidr                  = var.vpc_cidr
  availability_zones        = var.availability_zones
  public_subnet_cidrs       = var.public_subnet_cidrs
  private_app_subnet_cidrs  = var.private_app_subnet_cidrs
  private_data_subnet_cidrs = var.private_data_subnet_cidrs
  enable_multi_az_nat       = var.enable_multi_az_nat
  tags                      = var.tags
}

# ==============================================================================
# Module: Security (Least-Privilege Security Groups, KMS CMK, IAM Execution)
# ==============================================================================

module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  app_port     = 3000
  tags         = var.tags
}

# ==============================================================================
# Module: Auth (Amazon Cognito User Pools, SPA Web Client, Hosted Domain)
# ==============================================================================

module "auth" {
  source = "../../modules/auth"

  project_name = var.project_name
  environment  = var.environment
  tags         = var.tags
}

# ==============================================================================
# Module: Database (Amazon RDS PostgreSQL 16 Multi-AZ with Deletion Protection)
# ==============================================================================

module "database" {
  source = "../../modules/database"

  project_name            = var.project_name
  environment             = var.environment
  vpc_id                  = module.networking.vpc_id
  db_subnet_group_name    = module.networking.db_subnet_group_name
  rds_security_group_id   = module.security.rds_security_group_id
  kms_key_arn             = module.security.kms_key_arn
  instance_class          = var.db_instance_class
  multi_az                = var.db_multi_az
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  backup_retention_period = var.db_backup_retention_period
  deletion_protection     = var.db_deletion_protection
  skip_final_snapshot     = var.db_skip_final_snapshot
  tags                    = var.tags
}

# ==============================================================================
# Module: Secrets (SSM Parameter Store Hierarchy encrypted with KMS)
# ==============================================================================

module "secrets" {
  source = "../../modules/secrets"

  project_name              = var.project_name
  environment               = var.environment
  kms_key_id                = module.security.kms_key_id
  supabase_url              = var.supabase_url
  supabase_anon_key         = var.supabase_anon_key
  supabase_service_role_key = var.supabase_service_role_key
  gemini_api_key            = var.gemini_api_key
  jwt_secret                = var.jwt_secret
  upstash_redis_rest_url    = var.upstash_redis_rest_url
  upstash_redis_rest_token  = var.upstash_redis_rest_token
  bedrock_model_id          = var.bedrock_model_id
  bedrock_region            = var.bedrock_region
  cognito_user_pool_id      = module.auth.user_pool_id
  cognito_client_id         = module.auth.user_pool_client_id
  tags                      = var.tags
}

# ==============================================================================
# Module: Application Load Balancer (Public Ingress & Target Group)
# ==============================================================================

module "alb" {
  source = "../../modules/alb"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
  health_check_path     = "/health"
  tags                  = var.tags
}

# ==============================================================================
# Module: AWS WAF v2 (Layer 7 Perimeter Defense & Rate Limiting)
# ==============================================================================

module "waf" {
  source = "../../modules/waf"

  project_name               = var.project_name
  environment                = var.environment
  alb_arn                    = module.alb.alb_arn
  rate_limit_requests_per_5m = var.waf_rate_limit_per_5m
  tags                       = var.tags
}

# ==============================================================================
# Module: ElastiCache Redis (Multi-Node HA Replication Group & Failover)
# ==============================================================================

module "cache" {
  source = "../../modules/cache"

  project_name            = var.project_name
  environment             = var.environment
  redis_subnet_group_name = module.networking.redis_subnet_group_name
  redis_security_group_id = module.security.redis_security_group_id
  kms_key_arn             = module.security.kms_key_arn
  node_type               = var.redis_node_type
  num_cache_clusters      = var.redis_num_cache_clusters
  tags                    = var.tags
}

# ==============================================================================
# Module: Compute (Amazon ECS Fargate High-Availability Service & Auto-Scaling)
# ==============================================================================

module "compute" {
  source = "../../modules/compute"

  project_name           = var.project_name
  environment            = var.environment
  aws_region             = var.aws_region
  vpc_id                 = module.networking.vpc_id
  private_app_subnet_ids = module.networking.private_app_subnet_ids
  ecs_security_group_id  = module.security.ecs_security_group_id
  ecs_execution_role_arn = module.security.ecs_execution_role_arn
  ecs_task_role_arn      = module.security.ecs_task_role_arn
  alb_target_group_arn   = module.alb.target_group_arn

  container_image = var.container_image
  container_port  = 3000
  cpu             = var.ecs_cpu
  memory          = var.ecs_memory
  desired_count   = var.ecs_desired_count

  database_host     = module.database.db_instance_address
  database_port     = tostring(module.database.db_instance_port)
  database_name     = module.database.db_name
  database_username = module.database.master_username

  redis_endpoint = module.cache.primary_endpoint_address
  redis_port     = tostring(module.cache.port)

  cognito_user_pool_id = module.auth.user_pool_id
  cognito_client_id    = module.auth.user_pool_client_id

  bedrock_model_id = var.bedrock_model_id
  bedrock_region   = var.bedrock_region

  focus_completion_queue_url = module.queue.focus_completion_queue_url
  audit_logs_queue_url       = module.queue.audit_logs_queue_url
  notifications_queue_url    = module.queue.notifications_queue_url

  tags = var.tags
}

# ==============================================================================
# Module: Realtime (Amazon API Gateway WebSocket & DynamoDB Connection Store)
# ==============================================================================

module "realtime" {
  source = "../../modules/realtime"

  project_name      = var.project_name
  environment       = var.environment
  ecs_task_role_arn = module.security.ecs_task_role_arn
  ecs_task_role_id  = module.security.ecs_task_role_id
  tags              = var.tags
}

# ==============================================================================
# Module: Storage (Phase 7 Private S3 Bucket, KMS Encryption & CloudFront OAC)
# ==============================================================================

module "storage" {
  source = "../../modules/storage"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  ecs_task_role_id     = module.security.ecs_task_role_id
  cors_allowed_origins = ["https://${var.custom_domain_name}", "https://api.${var.custom_domain_name}"]
  kms_key_arn          = module.security.kms_key_arn
  tags                 = var.tags
}

# ==============================================================================
# Module: Queue (Phase 8 SQS FIFO Queues, DLQs & Background Task Worker)
# ==============================================================================

module "queue" {
  source = "../../modules/queue"

  project_name     = var.project_name
  environment      = var.environment
  ecs_task_role_id = module.security.ecs_task_role_id
  kms_key_arn      = module.security.kms_key_arn
  tags             = var.tags
}

# ==============================================================================
# Module: Observability (Phase 9 CloudWatch Alarms, SNS Alert Bus & Telemetry)
# ==============================================================================

module "observability" {
  source = "../../modules/observability"

  project_name              = var.project_name
  environment               = var.environment
  ecs_cluster_name          = module.compute.cluster_name
  ecs_service_name          = module.compute.service_name
  alb_arn_suffix            = module.alb.alb_arn_suffix
  target_group_arn_suffix   = module.alb.target_group_arn_suffix
  db_instance_id            = module.database.db_instance_id
  focus_completion_dlq_name = module.queue.focus_completion_dlq_name
  audit_logs_dlq_name       = module.queue.audit_logs_dlq_name
  notifications_dlq_name    = module.queue.notifications_dlq_name
  ecs_task_role_id          = module.security.ecs_task_role_id
  kms_key_arn               = module.security.kms_key_arn
  tags                      = var.tags
}

# ==============================================================================
# Module: Frontend (Phase 16 React Web App S3 Hosting & CloudFront CDN)
# ==============================================================================

module "frontend" {
  source = "../../modules/frontend"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  kms_key_arn          = module.security.kms_key_arn
  enable_custom_domain = var.enable_custom_domain
  custom_domain_name   = var.custom_domain_name
  acm_certificate_arn  = module.dns.certificate_arn
  tags                 = var.tags
}

# ==============================================================================
# Module: DNS (Phase 10 & 17 Route 53 DNS Routing & ACM Certificate Validation)
# ==============================================================================

module "dns" {
  source = "../../modules/dns"

  project_name           = var.project_name
  environment            = var.environment
  domain_name            = var.custom_domain_name
  enable_custom_domain   = var.enable_custom_domain
  alb_dns_name           = module.alb.alb_dns_name
  alb_zone_id            = module.alb.alb_zone_id
  cloudfront_domain_name = module.frontend.cloudfront_domain_name
  tags                   = var.tags
}

# ==============================================================================
# Module: Email (Phase 11 Amazon SES Transactional Messaging)
# ==============================================================================

module "email" {
  source = "../../modules/email"

  project_name      = var.project_name
  environment       = var.environment
  domain_name       = var.custom_domain_name
  sender_email      = "notifications@${var.custom_domain_name}"
  enable_ses_domain = var.enable_ses_domain
  ecs_task_role_id  = module.security.ecs_task_role_id
  tags              = var.tags
}

# ==============================================================================
# Module: CI/CD (GitHub Actions OIDC Provider, IAM Role & Amazon ECR)
# ==============================================================================

module "ci_cd" {
  source = "../../modules/ci_cd"

  project_name                = var.project_name
  environment                 = var.environment
  github_repo                 = var.github_repo
  kms_key_arn                 = module.security.kms_key_arn
  enable_oidc_provider        = var.enable_ci_cd_oidc
  ecs_execution_role_arn      = module.security.ecs_execution_role_arn
  ecs_task_role_arn           = module.security.ecs_task_role_arn
  frontend_bucket_arn         = module.frontend.s3_bucket_arn
  cloudfront_distribution_arn = module.frontend.cloudfront_distribution_arn
  tags                        = var.tags
}

# ==============================================================================
# Module: Compliance (AWS CloudTrail, S3 Audit Bucket, AWS Config Evaluation)
# ==============================================================================

module "compliance" {
  source = "../../modules/compliance"

  project_name      = var.project_name
  environment       = var.environment
  kms_key_arn       = module.security.kms_key_arn
  enable_cloudtrail = var.enable_compliance_logging
  enable_config     = var.enable_config_evaluation
  tags              = var.tags
}
