# ==============================================================================
# AWS WAF v2 Perimeter Defense Module
# Provides Layer 7 application filtering, OWASP Top 10 mitigation,
# bot and IP reputation filtering, and rate limiting for Application Load Balancer.
# ==============================================================================

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-${var.environment}-waf"
  description = "Regional Layer 7 Web ACL for ${var.project_name} (${var.environment})"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # ----------------------------------------------------------------------------
  # Rule 1: AWS Managed Rules - Common Rule Set (OWASP Top 10 Protections)
  # ----------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-waf-common"
      sampled_requests_enabled   = true
    }
  }

  # ----------------------------------------------------------------------------
  # Rule 2: AWS Managed Rules - Known Bad Inputs
  # ----------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-waf-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # ----------------------------------------------------------------------------
  # Rule 3: AWS Managed Rules - Amazon IP Reputation List
  # ----------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-waf-ip-reputation"
      sampled_requests_enabled   = true
    }
  }

  # ----------------------------------------------------------------------------
  # Rule 4: Custom Rate-Based Statement (Layer 7 DDoS & Brute-Force Defense)
  # ----------------------------------------------------------------------------
  rule {
    name     = "RateLimitPerIP"
    priority = 40

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_requests_per_5m
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-waf-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-${var.environment}-waf-metrics"
    sampled_requests_enabled   = true
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-waf"
    Environment = var.environment
  })
}

# ------------------------------------------------------------------------------
# Regional Web ACL Association with Application Load Balancer
# ------------------------------------------------------------------------------
resource "aws_wafv2_web_acl_association" "alb" {
  count = var.alb_arn != "" ? 1 : 0

  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
