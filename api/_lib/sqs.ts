// api/_lib/sqs.ts
// ==============================================================================
// Amazon SQS FIFO Messaging Engine
// Replaces prototype Kafka publisher with production-ready SQS FIFO queues.
// Guarantees strict per-user / per-tenant ordered event ingestion with deduplication.
// ==============================================================================

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const region = process.env.AWS_REGION || 'us-east-1'

export const sqsClient = new SQSClient({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN
  } : undefined
})

export const QUEUE_URLS = {
  focusCompletion: process.env.FOCUS_COMPLETION_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/474189600194/floework-staging-focus-completion.fifo',
  auditLogs: process.env.AUDIT_LOGS_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/474189600194/floework-staging-audit-logs.fifo',
  notifications: process.env.NOTIFICATIONS_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/474189600194/floework-staging-notifications.fifo'
}

export interface PublishFifoOptions {
  messageGroupId: string
  messageDeduplicationId?: string
}

export interface FocusCompletionEvent {
  type: 'FOCUS_SESSION_COMPLETED'
  userId: string
  projectId?: string
  durationSecs: number
  timestamp: string
}

/**
 * Publishes a structured payload to an Amazon SQS FIFO queue
 */
export async function publishToQueue(
  queueUrl: string,
  message: any,
  options: PublishFifoOptions
): Promise<{ messageId?: string; sequenceNumber?: string }> {
  if (!options.messageGroupId) {
    throw new Error('FIFO SQS queues strictly require a non-empty messageGroupId')
  }

  const body = typeof message === 'string' ? message : JSON.stringify(message)

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: body,
    MessageGroupId: options.messageGroupId,
    ...(options.messageDeduplicationId ? { MessageDeduplicationId: options.messageDeduplicationId } : {})
  })

  const response = await sqsClient.send(command)

  return {
    messageId: response.MessageId,
    sequenceNumber: response.SequenceNumber
  }
}

/**
 * Publishes focus session completion event ordered strictly per-user
 */
export async function publishFocusCompletionEvent(
  userId: string,
  event: FocusCompletionEvent
): Promise<{ messageId?: string; sequenceNumber?: string }> {
  return publishToQueue(QUEUE_URLS.focusCompletion, event, {
    messageGroupId: userId
  })
}

/**
 * Publishes workspace audit log event ordered strictly per-tenant
 */
export async function publishAuditEvent(
  teamId: string,
  event: Record<string, any>
): Promise<{ messageId?: string; sequenceNumber?: string }> {
  return publishToQueue(QUEUE_URLS.auditLogs, event, {
    messageGroupId: teamId
  })
}

/**
 * Publishes notification event ordered strictly per-recipient
 */
export async function publishNotificationEvent(
  recipientId: string,
  event: Record<string, any>
): Promise<{ messageId?: string; sequenceNumber?: string }> {
  return publishToQueue(QUEUE_URLS.notifications, event, {
    messageGroupId: recipientId
  })
}
