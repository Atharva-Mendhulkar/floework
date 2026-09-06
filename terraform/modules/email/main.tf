# ==============================================================================
# Amazon Simple Email Service (SES) Module
# Transactional email infrastructure for team invitations, password resets,
# and daily focus digest notifications.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Verified Email Identity
# ------------------------------------------------------------------------------

resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

# ------------------------------------------------------------------------------
# 2. Domain Identity (Conditional)
# ------------------------------------------------------------------------------

resource "aws_ses_domain_identity" "main" {
  count = var.enable_ses_domain ? 1 : 0

  domain = var.domain_name
}

# ------------------------------------------------------------------------------
# 3. ECS Task Role IAM Permissions for Transactional Sending
# ------------------------------------------------------------------------------

resource "aws_iam_role_policy" "ecs_ses" {
  name = "${var.project_name}-${var.environment}-ecs-ses"
  role = var.ecs_task_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowTransactionalEmailSending"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:GetSendQuota",
          "ses:GetSendStatistics"
        ]
        Resource = "*"
      }
    ]
  })
}
