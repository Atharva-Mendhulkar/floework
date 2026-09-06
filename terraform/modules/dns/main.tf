# ==============================================================================
# Amazon Route 53 DNS & ACM SSL/TLS Module
# Configures authoritative public DNS routing, alias records for ALB/CloudFront,
# and managed ACM SSL certificates for zero-downtime cutover.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Route 53 Public Hosted Zone (Conditional)
# ------------------------------------------------------------------------------

resource "aws_route53_zone" "main" {
  count = var.enable_custom_domain ? 1 : 0

  name          = var.domain_name
  comment       = "Authoritative public DNS zone for ${var.project_name} (${var.environment})"
  force_destroy = false

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-zone"
    Environment = var.environment
  })
}

# ------------------------------------------------------------------------------
# 2. Managed SSL/TLS Certificate with DNS Validation
# ------------------------------------------------------------------------------

resource "aws_acm_certificate" "cert" {
  count = var.enable_custom_domain ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-cert"
    Environment = var.environment
  })
}

# ------------------------------------------------------------------------------
# 3. DNS Alias Records for API & Web Ingress
# ------------------------------------------------------------------------------

# API Subdomain Alias -> Application Load Balancer
resource "aws_route53_record" "api" {
  count = var.enable_custom_domain ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Apex Domain Alias -> CloudFront Distribution (Web Frontend)
resource "aws_route53_record" "web" {
  count = var.enable_custom_domain ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name != "" ? var.cloudfront_domain_name : "d111111abcdef8.cloudfront.net"
    zone_id                = "Z2FDTNDATAQYW2" # Canonical CloudFront Hosted Zone ID
    evaluate_target_health = false
  }
}
