output "storage_bucket_id" {
  description = "Name/ID of the Floework S3 storage bucket"
  value       = aws_s3_bucket.storage.id
}

output "storage_bucket_arn" {
  description = "ARN of the Floework S3 storage bucket"
  value       = aws_s3_bucket.storage.arn
}

output "storage_bucket_domain_name" {
  description = "Regional domain name of the S3 storage bucket"
  value       = aws_s3_bucket.storage.bucket_regional_domain_name
}

output "cloudfront_oac_id" {
  description = "ID of the CloudFront Origin Access Control"
  value       = aws_cloudfront_origin_access_control.storage_oac.id
}
