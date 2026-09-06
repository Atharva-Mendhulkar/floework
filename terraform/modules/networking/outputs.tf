output "vpc_id" {
  description = "The ID of the provisioned VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs for the public subnets (ALB / Ingress)"
  value       = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  description = "List of IDs for the private application subnets (ECS Fargate tasks)"
  value       = aws_subnet.private_app[*].id
}

output "private_data_subnet_ids" {
  description = "List of IDs for the private isolated data subnets (RDS / Redis)"
  value       = aws_subnet.private_data[*].id
}

output "nat_gateway_ips" {
  description = "Public IP addresses of the NAT Gateway(s)"
  value       = aws_eip.nat[*].public_ip
}

output "db_subnet_group_name" {
  description = "Name of the RDS DB subnet group"
  value       = aws_db_subnet_group.rds.name
}

output "redis_subnet_group_name" {
  description = "Name of the ElastiCache Redis subnet group"
  value       = aws_elasticache_subnet_group.redis.name
}
