# ==============================================================================
# Amazon SQS FIFO Queues & Dead-Letter Queues Module
# High-throughput FIFO message broker for asynchronous processing & background tasks
# Replaces prototype Kafka with managed, zero-idle-cost ordered AWS SQS queues.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Dead-Letter Queues (DLQs) for Poison Pill Isolation
# ------------------------------------------------------------------------------

resource "aws_sqs_queue" "focus_completion_dlq" {
  name                        = "${var.project_name}-${var.environment}-focus-completion-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = var.dlq_retention_seconds
  kms_master_key_id           = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sqs"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-focus-completion-dlq"
    Environment = var.environment
  })
}

resource "aws_sqs_queue" "audit_logs_dlq" {
  name                        = "${var.project_name}-${var.environment}-audit-logs-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = var.dlq_retention_seconds
  kms_master_key_id           = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sqs"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-audit-logs-dlq"
    Environment = var.environment
  })
}

resource "aws_sqs_queue" "notifications_dlq" {
  name                        = "${var.project_name}-${var.environment}-notifications-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = var.dlq_retention_seconds
  kms_master_key_id           = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sqs"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-notifications-dlq"
    Environment = var.environment
  })
}

# ------------------------------------------------------------------------------
# 2. Primary FIFO Queues with Redrive Policies
# ------------------------------------------------------------------------------

resource "aws_sqs_queue" "focus_completion" {
  name                        = "${var.project_name}-${var.environment}-focus-completion.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = var.message_retention_seconds
  visibility_timeout_seconds  = 60 # 60 seconds processing window
  kms_master_key_id           = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sqs"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.focus_completion_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-focus-completion-queue"
    Environment = var.environment
  })
}

resource "aws_sqs_queue" "audit_logs" {
  name                        = "${var.project_name}-${var.environment}-audit-logs.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = var.message_retention_seconds
  visibility_timeout_seconds  = 30
  kms_master_key_id           = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sqs"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.audit_logs_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-audit-logs-queue"
    Environment = var.environment
  })
}

resource "aws_sqs_queue" "notifications" {
  name                        = "${var.project_name}-${var.environment}-notifications.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = var.message_retention_seconds
  visibility_timeout_seconds  = 30
  kms_master_key_id           = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sqs"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-notifications-queue"
    Environment = var.environment
  })
}

# ------------------------------------------------------------------------------
# 3. IAM Policy for ECS Backend API & Worker Tasks
# ------------------------------------------------------------------------------

resource "aws_iam_role_policy" "ecs_sqs_access" {
  name = "${var.project_name}-${var.environment}-sqs-access"
  role = var.ecs_task_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SQSQueuePermissions"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          aws_sqs_queue.focus_completion.arn,
          aws_sqs_queue.focus_completion_dlq.arn,
          aws_sqs_queue.audit_logs.arn,
          aws_sqs_queue.audit_logs_dlq.arn,
          aws_sqs_queue.notifications.arn,
          aws_sqs_queue.notifications_dlq.arn
        ]
      }
    ]
  })
}
