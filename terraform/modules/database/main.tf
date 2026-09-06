# ==============================================================================
# Amazon RDS PostgreSQL 16 Module
# Isolated Data Subnets, KMS Encryption, Multi-AZ High Availability
# ==============================================================================

resource "aws_db_parameter_group" "main" {
  name_prefix = "${var.project_name}-${var.environment}-pg16-"
  family      = "postgres16"
  description = "Floework custom parameter group for PostgreSQL 16 (${var.environment})"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "500"
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-pg-params"
    Environment = var.environment
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-postgres"

  engine                = "postgres"
  engine_version        = "16.3"
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username

  # Native AWS Secrets Manager integration for master password
  manage_master_user_password   = true
  master_user_secret_kms_key_id = var.kms_key_arn

  multi_az               = var.multi_az
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.rds_security_group_id]
  parameter_group_name   = aws_db_parameter_group.main.name
  publicly_accessible    = false

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:30-Mon:05:30"

  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-rds-final"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  performance_insights_enabled          = true
  performance_insights_kms_key_id       = var.kms_key_arn
  performance_insights_retention_period = 7

  copy_tags_to_snapshot = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-rds-postgres"
    Environment = var.environment
  })
}
