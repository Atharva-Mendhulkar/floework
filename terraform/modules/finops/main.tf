# ==============================================================================
# Floework AWS FinOps & Cost Governance Module - Main Configuration
# Continuous cost control, AWS Budgets, Cost Anomaly Detection, and Alert Bus
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. AWS Monthly Cost Budget with Multi-Tier Alarm Triggers
# ------------------------------------------------------------------------------

resource "aws_budgets_budget" "monthly_cost" {
  name         = "${var.project_name}-${var.environment}-monthly-cost-budget"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_amount)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_types {
    include_tax                = true
    include_subscription       = true
    use_blended                = false
    include_refund             = false
    include_credit             = false
    include_upfront            = true
    include_recurring          = true
    include_other_subscription = true
    include_support            = true
    include_discount           = true
    use_amortized              = false
  }

  # Alert Tier 1: Early Warning at 50% of monthly budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [var.sns_alert_topic_arn]
    subscriber_email_addresses = var.notification_emails
  }

  # Alert Tier 2: Operational Threshold at 80% of monthly budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [var.sns_alert_topic_arn]
    subscriber_email_addresses = var.notification_emails
  }

  # Alert Tier 3: Budget Exhausted at 100% of monthly budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [var.sns_alert_topic_arn]
    subscriber_email_addresses = var.notification_emails
  }

  # Alert Tier 4: Forecasted Breach Alert at 100% projected spend
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [var.sns_alert_topic_arn]
    subscriber_email_addresses = var.notification_emails
  }
}

# ------------------------------------------------------------------------------
# 2. AWS Cost Anomaly Detection (Dimensional Service-Level Monitor)
# ------------------------------------------------------------------------------

resource "aws_ce_anomaly_monitor" "service_monitor" {
  count             = var.enable_cost_anomaly_detection ? 1 : 0
  name              = "${var.project_name}-${var.environment}-service-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-service-anomaly-monitor"
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Infrastructure"
  })
}

# ------------------------------------------------------------------------------
# 3. AWS Cost Anomaly Alert Subscription (Dispatch to SNS Alert Bus)
# ------------------------------------------------------------------------------

resource "aws_ce_anomaly_subscription" "sns_subscription" {
  count            = var.enable_cost_anomaly_detection ? 1 : 0
  name             = "${var.project_name}-${var.environment}-cost-anomaly-subscription"
  frequency        = "DAILY"
  monitor_arn_list = [aws_ce_anomaly_monitor.service_monitor[0].arn]

  subscriber {
    type    = "SNS"
    address = var.sns_alert_topic_arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = [tostring(var.anomaly_threshold_amount)]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cost-anomaly-subscription"
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Infrastructure"
  })
}
