# ==============================================================================
# Floework AWS FinOps & Cost Governance Module - Outputs
# ==============================================================================

output "budget_id" {
  description = "ID of the AWS Cost Budget"
  value       = aws_budgets_budget.monthly_cost.id
}

output "budget_name" {
  description = "Name of the AWS Cost Budget"
  value       = aws_budgets_budget.monthly_cost.name
}

output "budget_limit_amount" {
  description = "Configured monthly budget limit amount in USD"
  value       = aws_budgets_budget.monthly_cost.limit_amount
}

output "anomaly_monitor_arn" {
  description = "ARN of the AWS Cost Anomaly Monitor"
  value       = var.enable_cost_anomaly_detection ? aws_ce_anomaly_monitor.service_monitor[0].arn : null
}

output "anomaly_subscription_arn" {
  description = "ARN of the AWS Cost Anomaly Alert Subscription"
  value       = var.enable_cost_anomaly_detection ? aws_ce_anomaly_subscription.sns_subscription[0].arn : null
}
