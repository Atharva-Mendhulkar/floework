# ==============================================================================
# Floework AWS FinOps & Cost Governance Module - Variables
# ==============================================================================

variable "project_name" {
  description = "Project name identifier used for resource naming"
  type        = string
  default     = "floework"
}

variable "environment" {
  description = "Target deployment environment (staging or production)"
  type        = string
}

variable "monthly_budget_amount" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 50
}

variable "sns_alert_topic_arn" {
  description = "Target SNS topic ARN for budget alarms and anomaly notifications"
  type        = string
}

variable "notification_emails" {
  description = "Optional list of subscriber email addresses for budget alerts"
  type        = list(string)
  default     = []
}

variable "enable_cost_anomaly_detection" {
  description = "Enable AWS Cost Anomaly Detection monitor and alert subscription"
  type        = bool
  default     = true
}

variable "anomaly_threshold_amount" {
  description = "Absolute dollar impact threshold to trigger cost anomaly notifications"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Resource tags to merge with default tags"
  type        = map(string)
  default     = {}
}
