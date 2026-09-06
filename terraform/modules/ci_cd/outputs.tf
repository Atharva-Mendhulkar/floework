output "github_actions_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions via OIDC"
  value       = aws_iam_role.github_actions.arn
}

output "github_actions_role_name" {
  description = "Name of the IAM role assumed by GitHub Actions"
  value       = aws_iam_role.github_actions.name
}

output "ecr_repository_url" {
  description = "URL of the Amazon ECR repository for the Fastify API container"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the Amazon ECR repository"
  value       = aws_ecr_repository.api.arn
}

output "ecr_repository_name" {
  description = "Name of the Amazon ECR repository"
  value       = aws_ecr_repository.api.name
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  value       = try(aws_iam_openid_connect_provider.github_actions[0].arn, "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com")
}
