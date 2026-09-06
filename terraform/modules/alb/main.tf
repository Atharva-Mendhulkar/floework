# ==============================================================================
# Application Load Balancer Module
# Internet-facing ALB in Public Subnets with Health-Checked Target Group
# ==============================================================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false
  drop_invalid_header_fields = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-alb"
    Environment = var.environment
  })
}

resource "aws_lb_target_group" "app" {
  name                 = "${var.project_name}-${var.environment}-tg"
  port                 = 3000
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = var.health_check_path
    port                = "3000"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-tg"
    Environment = var.environment
  })

  lifecycle {
    create_before_destroy = true
  }
}

# HTTP Listener (Port 80)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = var.enable_ssl ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.enable_ssl ? [] : [1]
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.app.arn
    }
  }
}

# HTTPS Listener (Port 443, conditionally provisioned when certificate is provided)
resource "aws_lb_listener" "https" {
  count             = var.enable_ssl && var.certificate_arn != null ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
