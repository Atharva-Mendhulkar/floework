# ==============================================================================
# Outputs: Frontend Static Web Hosting & CloudFront CDN
# ==============================================================================

output "s3_bucket_name" {
  description = "Identifier of the static frontend asset S3 bucket"
  value       = aws_s3_bucket.frontend.id
}

output "s3_bucket_arn" {
  description = "ARN of the static frontend asset S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "s3_bucket_regional_domain_name" {
  description = "Regional endpoint domain of the static frontend asset S3 bucket"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "cloudfront_distribution_id" {
  description = "Identifier of the CloudFront distribution caching frontend traffic"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution caching frontend traffic"
  value       = aws_cloudfront_distribution.frontend.arn
}

output "cloudfront_domain_name" {
  description = "Canonical domain name of the CloudFront distribution (e.g., d1234.cloudfront.net)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Route 53 hosted zone ID for CloudFront alias records"
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
}
