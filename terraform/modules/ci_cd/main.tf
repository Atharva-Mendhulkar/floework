# ==============================================================================
# CI/CD Infrastructure: GitHub Actions OIDC Provider, IAM Roles & Amazon ECR
# Secure, keyless GitHub Actions federation eliminating long-lived credentials
# ==============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# GitHub Actions OIDC Identity Provider
resource "aws_iam_openid_connect_provider" "github_actions" {
  count = var.enable_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd2d98bab03faadb97b34396831e3780aea1",
    "1c5876984e46a7be81432f7e51f8176fe707eefb"
  ]

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-github-oidc"
    Environment = var.environment
  })
}

# IAM Role assumed by GitHub Actions via OIDC
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-github-actions-role"
    Environment = var.environment
  })
}

# Amazon ECR Container Repository
resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-${var.environment}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-api-ecr"
    Environment = var.environment
  })
}

# ECR Lifecycle Policy - Prevent storage bloat by purging untagged images & keeping last 10
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Retain maximum 10 tagged production/staging images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-", "staging", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Least-privilege IAM Policy: ECR Container Push Permissions
resource "aws_iam_role_policy" "ecr_push" {
  name = "${var.project_name}-${var.environment}-ecr-push"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuthToken"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRRepositoryPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:ListImages"
        ]
        Resource = aws_ecr_repository.api.arn
      }
    ]
  })
}

# Least-privilege IAM Policy: Read-Only Infrastructure Inspection for Speculative Terraform Plan
resource "aws_iam_role_policy" "terraform_plan" {
  name = "${var.project_name}-${var.environment}-tf-plan"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformReadOnlyInspection"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "rds:Describe*",
          "ecs:Describe*",
          "elasticache:Describe*",
          "s3:GetBucket*",
          "s3:GetObject*",
          "s3:ListBucket*",
          "s3:ListAllMyBuckets",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ListQueues",
          "apigateway:GET",
          "dynamodb:DescribeTable",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:ListTables",
          "cloudwatch:DescribeAlarms",
          "cloudwatch:GetMetricData",
          "cloudwatch:ListMetrics",
          "sns:GetTopicAttributes",
          "sns:ListTopics",
          "route53:GetHostedZone",
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets",
          "acm:DescribeCertificate",
          "acm:ListCertificates",
          "ses:GetIdentityVerificationAttributes",
          "ses:GetIdentityDkimAttributes",
          "ses:ListIdentities",
          "kms:DescribeKey",
          "kms:GetKeyPolicy",
          "kms:GetKeyRotationStatus",
          "kms:ListKeys",
          "kms:ListAliases",
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:DescribeParameters",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:GetOpenIDConnectProvider"
        ]
        Resource = "*"
      }
    ]
  })
}

# Least-privilege IAM Policy: Automated ECS Service Deployment & Task Registration
resource "aws_iam_role_policy" "ecs_deploy" {
  name = "${var.project_name}-${var.environment}-ecs-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "ECSDeploymentManagement"
          Effect = "Allow"
          Action = [
            "ecs:DescribeServices",
            "ecs:DescribeTaskDefinition",
            "ecs:RegisterTaskDefinition",
            "ecs:UpdateService",
            "ecs:ListTasks",
            "ecs:DescribeTasks"
          ]
          Resource = "*"
        }
      ],
      var.ecs_execution_role_arn != "" && var.ecs_task_role_arn != "" ? [
        {
          Sid    = "IAMPassRoleToECS"
          Effect = "Allow"
          Action = [
            "iam:PassRole"
          ]
          Resource = [
            var.ecs_execution_role_arn,
            var.ecs_task_role_arn
          ]
        }
      ] : []
    )
  })
}

# Least-privilege IAM Policy: Frontend Static Assets S3 Sync & CloudFront Invalidation
resource "aws_iam_role_policy" "frontend_deploy" {
  count = var.frontend_bucket_arn != "" && var.cloudfront_distribution_arn != "" ? 1 : 0

  name = "${var.project_name}-${var.environment}-frontend-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "FrontendS3Deployment"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          var.frontend_bucket_arn,
          "${var.frontend_bucket_arn}/*"
        ]
      },
      {
        Sid    = "CloudFrontCacheInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation"
        ]
        Resource = var.cloudfront_distribution_arn
      }
    ]
  })
}

