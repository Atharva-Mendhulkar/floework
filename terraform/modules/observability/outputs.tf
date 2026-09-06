# ==============================================================================
# Observability Module Outputs
# ==============================================================================

output "sns_alerts_topic_arn" {
  description = "ARN of the SNS topic for operational and system alarms"
  value       = aws_sns_topic.alerts.arn
}

output "sns_alerts_topic_name" {
  description = "Name of the SNS topic for operational and system alarms"
  value       = aws_sns_topic.alerts.name
}

output "alarm_arns" {
  description = "Map of created CloudWatch Alarm ARNs"
  value = {
    ecs_cpu_high          = aws_cloudwatch_metric_alarm.ecs_cpu_high.arn
    ecs_memory_high       = aws_cloudwatch_metric_alarm.ecs_memory_high.arn
    alb_5xx_errors        = aws_cloudwatch_metric_alarm.alb_5xx_errors.arn
    sqs_focus_dlq         = aws_cloudwatch_metric_alarm.sqs_focus_dlq.arn
    sqs_audit_dlq         = aws_cloudwatch_metric_alarm.sqs_audit_dlq.arn
    sqs_notifications_dlq = aws_cloudwatch_metric_alarm.sqs_notifications_dlq.arn
    rds_high_connections  = aws_cloudwatch_metric_alarm.rds_high_connections.arn
  }
}
