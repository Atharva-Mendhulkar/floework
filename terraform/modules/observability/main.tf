# ==============================================================================
# Observability & Telemetry Hardening Module
# Centralized APM, Distributed Tracing (AWS X-Ray), CloudWatch Alarms,
# Dead-Letter Queue Depth Monitoring, and SNS Notification Bus
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Amazon SNS Alerting Bus
# ------------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  name              = "${var.project_name}-${var.environment}-alerts"
  kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : "alias/aws/sns"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-alerts"
    Environment = var.environment
  })
}

# ------------------------------------------------------------------------------
# 2. CloudWatch Alarms: Compute & Infrastructure Saturation
# ------------------------------------------------------------------------------

# ECS Service CPU Utilization > 80%
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Triggers when ECS container CPU utilization exceeds 80% for 2 consecutive periods"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  tags = var.tags
}

# ECS Service Memory Utilization > 80%
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-memory-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Triggers when ECS container memory utilization exceeds 80% for 2 consecutive periods"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 3. CloudWatch Alarms: Ingress Gateway & 5XX Failure Rates
# ------------------------------------------------------------------------------

# ALB Target Group HTTP 5XX Count >= 5 in 1 minute
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Triggers when the ALB Target Group reports 5 or more HTTP 5XX responses in 60s"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.target_group_arn_suffix
  }

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 4. CloudWatch Alarms: Dead-Letter Queue (DLQ) Depth Monitoring
# ------------------------------------------------------------------------------

# Focus Completion DLQ Depth > 0 (Message failure / poison pill detection)
resource "aws_cloudwatch_metric_alarm" "sqs_focus_dlq" {
  alarm_name          = "${var.project_name}-${var.environment}-sqs-focus-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Triggers when any message arrives in the Focus Completion Dead-Letter Queue"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = var.focus_completion_dlq_name
  }

  tags = var.tags
}

# Audit Logs DLQ Depth > 0
resource "aws_cloudwatch_metric_alarm" "sqs_audit_dlq" {
  alarm_name          = "${var.project_name}-${var.environment}-sqs-audit-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Triggers when any message arrives in the Audit Logs Dead-Letter Queue"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = var.audit_logs_dlq_name
  }

  tags = var.tags
}

# Notifications DLQ Depth > 0
resource "aws_cloudwatch_metric_alarm" "sqs_notifications_dlq" {
  alarm_name          = "${var.project_name}-${var.environment}-sqs-notifications-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Triggers when any message arrives in the Notifications Dead-Letter Queue"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = var.notifications_dlq_name
  }

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 5. CloudWatch Alarms: Database Connection Exhaustion
# ------------------------------------------------------------------------------

# RDS Database Connections > 80
resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-connections"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Triggers when RDS database connection count exceeds 80"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 6. IAM Permissions: AWS X-Ray & CloudWatch Telemetry for ECS Task Role
# ------------------------------------------------------------------------------

resource "aws_iam_role_policy" "ecs_telemetry" {
  name = "${var.project_name}-${var.environment}-ecs-telemetry"
  role = var.ecs_task_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowXRayDaemon"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchMetricsAndLogs"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}
