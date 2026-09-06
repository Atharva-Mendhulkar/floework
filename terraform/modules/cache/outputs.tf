output "primary_endpoint_address" {
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  description = "Primary endpoint address for read/write Redis connections"
}

output "reader_endpoint_address" {
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
  description = "Reader endpoint address for read-only Redis connections"
}

output "port" {
  value       = aws_elasticache_replication_group.main.port
  description = "Port number on which the cache accepts connections (6379)"
}

output "replication_group_id" {
  value       = aws_elasticache_replication_group.main.id
  description = "ID of the ElastiCache replication group"
}

output "parameter_group_id" {
  value       = aws_elasticache_parameter_group.main.id
  description = "ID of the ElastiCache parameter group"
}
