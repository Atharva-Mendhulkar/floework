# ==============================================================================
# Route 53 DNS Module Outputs
# ==============================================================================

output "hosted_zone_id" {
  description = "ID of the public Route 53 hosted zone"
  value       = var.enable_custom_domain ? aws_route53_zone.main[0].zone_id : ""
}

output "name_servers" {
  description = "Name servers for the public Route 53 hosted zone"
  value       = var.enable_custom_domain ? aws_route53_zone.main[0].name_servers : []
}

output "certificate_arn" {
  description = "ARN of the provisioned ACM SSL/TLS certificate"
  value       = var.enable_custom_domain ? aws_acm_certificate.cert[0].arn : ""
}

output "api_dns_record" {
  description = "FQDN of the API alias DNS record"
  value       = var.enable_custom_domain ? aws_route53_record.api[0].fqdn : ""
}

output "web_dns_record" {
  description = "FQDN of the Web frontend alias DNS record"
  value       = var.enable_custom_domain ? aws_route53_record.web[0].fqdn : ""
}

