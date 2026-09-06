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
  #   bucket         = "floework-terraform-state-staging"
  #   key            = "staging/terraform.tfstate"
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
# Module: Networking (VPC, Dual-AZ Subnets, Single NAT, Gateway Endpoints)
# ==============================================================================

module "networking" {
  source = "../../modules/networking"

  project_name               = var.project_name
  environment                = var.environment
  vpc_cidr                   = var.vpc_cidr
  availability_zones         = var.availability_zones
  public_subnet_cidrs        = var.public_subnet_cidrs
  private_app_subnet_cidrs   = var.private_app_subnet_cidrs
  private_data_subnet_cidrs  = var.private_data_subnet_cidrs
  enable_multi_az_nat        = var.enable_multi_az_nat
  tags                       = var.tags
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
  tags                      = var.tags
}
