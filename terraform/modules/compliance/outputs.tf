output "audit_bucket_id" {
  description = "The name of the S3 bucket used for security audit logs"
  value       = aws_s3_bucket.audit_logs.id
}

output "audit_bucket_arn" {
  description = "The ARN of the S3 bucket used for security audit logs"
  value       = aws_s3_bucket.audit_logs.arn
}

output "cloudtrail_id" {
  description = "The name of the provisioned CloudTrail"
  value       = try(aws_cloudtrail.main[0].id, "")
}

output "cloudtrail_arn" {
  description = "The ARN of the provisioned CloudTrail"
  value       = try(aws_cloudtrail.main[0].arn, "")
}

output "cloudwatch_log_group_arn" {
  description = "The ARN of the CloudWatch Log Group for CloudTrail security logs"
  value       = aws_cloudwatch_log_group.cloudtrail.arn
}

output "config_recorder_id" {
  description = "The ID of the AWS Config configuration recorder"
  value       = try(aws_config_configuration_recorder.main[0].id, "")
}

output "config_rules" {
  description = "List of enabled AWS Config compliance rule names"
  value = var.enable_config ? [
    aws_config_config_rule.s3_bucket_public_read_prohibited[0].name,
    aws_config_config_rule.rds_storage_encrypted[0].name,
    aws_config_config_rule.encrypted_volumes[0].name,
    aws_config_config_rule.restricted_ssh[0].name,
    aws_config_config_rule.iam_root_access_key_check[0].name
  ] : []
}
