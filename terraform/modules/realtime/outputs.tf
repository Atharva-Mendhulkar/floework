output "websocket_api_id" {
  value       = aws_apigatewayv2_api.ws.id
  description = "ID of the WebSocket API"
}

output "websocket_api_endpoint" {
  value       = "${aws_apigatewayv2_api.ws.api_endpoint}/${aws_apigatewayv2_stage.ws.name}"
  description = "WebSocket connection URL endpoint (wss://...)"
}

output "websocket_api_execution_arn" {
  value       = aws_apigatewayv2_api.ws.execution_arn
  description = "Execution ARN of the WebSocket API"
}

output "websocket_stage_name" {
  value       = aws_apigatewayv2_stage.ws.name
  description = "Name of the WebSocket stage"
}

output "connections_table_name" {
  value       = aws_dynamodb_table.connections.name
  description = "Name of the DynamoDB table storing active WebSocket connections"
}

output "connections_table_arn" {
  value       = aws_dynamodb_table.connections.arn
  description = "ARN of the DynamoDB connections table"
}
