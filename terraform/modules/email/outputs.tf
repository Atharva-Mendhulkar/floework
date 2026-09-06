# ==============================================================================
# Amazon SES Email Module Outputs
# ==============================================================================

output "sender_email_identity_arn" {
  description = "ARN of the verified SES sender email identity"
  value       = aws_ses_email_identity.sender.arn
}

output "sender_email_address" {
  description = "Verified email address used as default sender"
  value       = aws_ses_email_identity.sender.email
}

output "ses_domain_identity_arn" {
  description = "ARN of the verified SES domain identity"
  value       = var.enable_ses_domain ? aws_ses_domain_identity.main[0].arn : ""
}
