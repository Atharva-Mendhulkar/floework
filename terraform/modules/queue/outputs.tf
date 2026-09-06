output "focus_completion_queue_url" {
  description = "URL of the focus completion SQS FIFO queue"
  value       = aws_sqs_queue.focus_completion.url
}

output "focus_completion_queue_arn" {
  description = "ARN of the focus completion SQS FIFO queue"
  value       = aws_sqs_queue.focus_completion.arn
}

output "focus_completion_dlq_arn" {
  description = "ARN of the focus completion Dead-Letter Queue"
  value       = aws_sqs_queue.focus_completion_dlq.arn
}

output "audit_logs_queue_url" {
  description = "URL of the audit logs SQS FIFO queue"
  value       = aws_sqs_queue.audit_logs.url
}

output "audit_logs_queue_arn" {
  description = "ARN of the audit logs SQS FIFO queue"
  value       = aws_sqs_queue.audit_logs.arn
}

output "audit_logs_dlq_arn" {
  description = "ARN of the audit logs Dead-Letter Queue"
  value       = aws_sqs_queue.audit_logs_dlq.arn
}

output "notifications_queue_url" {
  description = "URL of the notifications SQS FIFO queue"
  value       = aws_sqs_queue.notifications.url
}

output "notifications_queue_arn" {
  description = "ARN of the notifications SQS FIFO queue"
  value       = aws_sqs_queue.notifications.arn
}

output "notifications_dlq_arn" {
  description = "ARN of the notifications Dead-Letter Queue"
  value       = aws_sqs_queue.notifications_dlq.arn
}

output "focus_completion_dlq_name" {
  description = "Name of the focus completion Dead-Letter Queue"
  value       = aws_sqs_queue.focus_completion_dlq.name
}

output "audit_logs_dlq_name" {
  description = "Name of the audit logs Dead-Letter Queue"
  value       = aws_sqs_queue.audit_logs_dlq.name
}

output "notifications_dlq_name" {
  description = "Name of the notifications Dead-Letter Queue"
  value       = aws_sqs_queue.notifications_dlq.name
}
