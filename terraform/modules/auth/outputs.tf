output "user_pool_id" {
  value       = aws_cognito_user_pool.main.id
  description = "ID of the Cognito User Pool"
}

output "user_pool_arn" {
  value       = aws_cognito_user_pool.main.arn
  description = "ARN of the Cognito User Pool"
}

output "user_pool_endpoint" {
  value       = aws_cognito_user_pool.main.endpoint
  description = "Endpoint name of the User Pool"
}

output "user_pool_client_id" {
  value       = aws_cognito_user_pool_client.web.id
  description = "Client ID for the web SPA application"
}

output "user_pool_domain" {
  value       = aws_cognito_user_pool_domain.main.domain
  description = "Cognito hosted domain prefix"
}
