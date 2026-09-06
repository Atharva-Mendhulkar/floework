output "alb_id" {
  value       = aws_lb.main.id
  description = "ID of the Application Load Balancer"
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "ARN of the Application Load Balancer"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "Canonical hosted zone ID of the load balancer"
}

output "target_group_arn" {
  value       = aws_lb_target_group.app.arn
  description = "ARN of the ECS target group"
}

output "target_group_name" {
  value       = aws_lb_target_group.app.name
  description = "Name of the ECS target group"
}

output "alb_arn_suffix" {
  value       = aws_lb.main.arn_suffix
  description = "ARN suffix of the ALB for CloudWatch metrics"
}

output "target_group_arn_suffix" {
  value       = aws_lb_target_group.app.arn_suffix
  description = "ARN suffix of the Target Group for CloudWatch metrics"
}
