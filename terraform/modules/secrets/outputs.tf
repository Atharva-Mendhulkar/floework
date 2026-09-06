output "parameter_prefix" {
  description = "SSM Parameter Store hierarchical path prefix for the application"
  value       = local.prefix
}

output "parameter_arns" {
  description = "List of ARNs for all configured SSM parameters"
  value = compact([
    aws_ssm_parameter.supabase_url.arn,
    try(aws_ssm_parameter.supabase_anon_key[0].arn, ""),
    try(aws_ssm_parameter.supabase_service_role_key[0].arn, ""),
    try(aws_ssm_parameter.gemini_api_key[0].arn, ""),
    try(aws_ssm_parameter.jwt_secret[0].arn, ""),
    try(aws_ssm_parameter.upstash_redis_rest_url[0].arn, ""),
    try(aws_ssm_parameter.upstash_redis_rest_token[0].arn, ""),
    aws_ssm_parameter.bedrock_model_id.arn,
    aws_ssm_parameter.bedrock_region.arn,
    aws_ssm_parameter.cognito_user_pool_id.arn,
    aws_ssm_parameter.cognito_client_id.arn
  ])
}

