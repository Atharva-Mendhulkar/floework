# ==============================================================================
# Amazon API Gateway WebSocket & DynamoDB Realtime Module
# Serverless WebSocket API, Connection Registry, and PostToConnection IAM Policy
# ==============================================================================

resource "aws_apigatewayv2_api" "ws" {
  name                       = "${var.project_name}-${var.environment}-websocket-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "\\$request.body.action"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-websocket-api"
    Environment = var.environment
  })
}

resource "aws_apigatewayv2_stage" "ws" {
  api_id      = aws_apigatewayv2_api.ws.id
  name        = var.environment
  auto_deploy = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-ws-stage"
    Environment = var.environment
  })
}

# DynamoDB Active Connection Registry
resource "aws_dynamodb_table" "connections" {
  name         = "${var.project_name}-${var.environment}-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connection_id"

  attribute {
    name = "connection_id"
    type = "S"
  }

  attribute {
    name = "workspace_id"
    type = "S"
  }

  global_secondary_index {
    name            = "workspace_id-index"
    hash_key        = "workspace_id"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-connections-table"
    Environment = var.environment
  })
}

# IAM Policy allowing ECS Fargate tasks to post messages back to connected clients
resource "aws_iam_role_policy" "ecs_manage_connections" {
  name = "${var.project_name}-${var.environment}-ecs-manage-connections"
  role = var.ecs_task_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowManageWebSocketConnections"
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "${aws_apigatewayv2_api.ws.execution_arn}/${var.environment}/POST/@connections/*"
      },
      {
        Sid    = "AllowDynamoDBConnectionRegistryAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.connections.arn,
          "${aws_dynamodb_table.connections.arn}/index/*"
        ]
      }
    ]
  })
}
