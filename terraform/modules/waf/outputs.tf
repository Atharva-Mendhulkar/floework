# ==============================================================================
# AWS WAF v2 Module Outputs
# ==============================================================================

output "web_acl_arn" {
  description = "ARN of the provisioned WAF Regional Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "web_acl_id" {
  description = "ID of the provisioned WAF Regional Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "web_acl_name" {
  description = "Name of the provisioned WAF Regional Web ACL"
  value       = aws_wafv2_web_acl.main.name
}

output "web_acl_capacity" {
  description = "Web ACL capacity units (WCU) consumed by configured rules"
  value       = aws_wafv2_web_acl.main.capacity
}
