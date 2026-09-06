# ==============================================================================
# Amazon ElastiCache Redis Module
# Distributed Rate Limiting, Session State & Application Caching
# ==============================================================================

resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-redis7-params"
  family      = "redis7"
  description = "Floework ${var.environment} parameter group for Redis 7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-redis-params"
    Environment = var.environment
  })
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description          = "Floework ${var.environment} Redis for rate limiting and cache"

  node_type                  = var.node_type
  num_cache_clusters         = var.num_cache_clusters
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  port                       = 6379
  subnet_group_name          = var.redis_subnet_group_name
  security_group_ids         = [var.redis_security_group_id]
  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = false

  automatic_failover_enabled = var.num_cache_clusters > 1 ? true : false
  auto_minor_version_upgrade = true
  apply_immediately          = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-redis"
    Environment = var.environment
  })
}
