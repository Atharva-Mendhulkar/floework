output "db_instance_id" {
  value       = aws_db_instance.main.id
  description = "ID of the RDS instance"
}

output "db_instance_address" {
  value       = aws_db_instance.main.address
  description = "DNS hostname of the RDS instance"
}

output "db_instance_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "Connection endpoint of the RDS instance in format host:port"
}

output "db_instance_port" {
  value       = aws_db_instance.main.port
  description = "Port on which the database accepts connections (5432)"
}

output "db_name" {
  value       = aws_db_instance.main.db_name
  description = "Default database name"
}

output "master_username" {
  value       = aws_db_instance.main.username
  description = "Master username for database administration"
}

output "master_user_secret_arn" {
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
  description = "ARN of the AWS Secrets Manager secret managing the master database password"
}

output "db_parameter_group_id" {
  value       = aws_db_parameter_group.main.id
  description = "ID of the custom parameter group"
}
