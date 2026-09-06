// workers/sqs-worker.ts
// ==============================================================================
// Amazon SQS Background Worker
// Consumes focus completion events from focus-completion.fifo,
// performs sequential stability calculations, and acknowledges completed tasks.
// ==============================================================================

import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message
} from '@aws-sdk/client-sqs'
import { sqsClient, QUEUE_URLS, FocusCompletionEvent } from '../api/_lib/sqs'

export interface ProcessedResult {
  messageId: string
  userId: string
  stabilityScore: number
  status: 'PROCESSED' | 'FAILED'
  error?: string
}

/**
 * Calculates a stability score from a focus session
 */
export function calculateFocusStability(durationSecs: number): number {
  // Ideal focus block is between 1500s (25min) and 3000s (50min)
  if (durationSecs < 300) return 0.2 // < 5 mins = fragmented
  if (durationSecs >= 1500 && durationSecs <= 3600) return 0.95 // Deep work sweet spot
  if (durationSecs > 3600) return 0.85 // Diminishing returns after 1 hour
  return 0.6
}

/**
 * Processes a single SQS message, updates stats, and deletes from queue
 */
export async function processMessage(
  message: Message,
  queueUrl: string = QUEUE_URLS.focusCompletion
): Promise<ProcessedResult> {
  const messageId = message.MessageId || 'unknown'

  if (!message.Body) {
    throw new Error(`Message ${messageId} is empty`)
  }

  let payload: FocusCompletionEvent
  try {
    payload = JSON.parse(message.Body)
  } catch {
    throw new Error(`Invalid JSON in message ${messageId}: ${message.Body}`)
  }

  if (payload.type !== 'FOCUS_SESSION_COMPLETED' || !payload.userId) {
    throw new Error(`Unexpected message type or missing userId in message ${messageId}`)
  }

  // 1. Calculate Focus Stability Score
  const stabilityScore = calculateFocusStability(payload.durationSecs || 0)

  // 2. Delete message from queue to prevent redelivery
  if (message.ReceiptHandle) {
    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle
      })
    )
  }

  return {
    messageId,
    userId: payload.userId,
    stabilityScore,
    status: 'PROCESSED'
  }
}

/**
 * Polls SQS for a batch of messages and processes them
 */
export async function pollAndProcessBatch(
  queueUrl: string = QUEUE_URLS.focusCompletion,
  maxMessages: number = 10,
  waitTimeSeconds: number = 20
): Promise<ProcessedResult[]> {
  const response = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      AttributeNames: ['All']
    })
  )

  const messages = response.Messages || []
  const results: ProcessedResult[] = []

  for (const message of messages) {
    try {
      const res = await processMessage(message, queueUrl)
      results.push(res)
    } catch (err: any) {
      console.error(`[Worker Error] Processing failed for message ${message.MessageId}:`, err.message)
      results.push({
        messageId: message.MessageId || 'unknown',
        userId: 'unknown',
        stabilityScore: 0,
        status: 'FAILED',
        error: err.message
      })
      // Message is NOT deleted, allowing SQS visibility timeout to expire
      // and redrive to DLQ after maxReceiveCount attempts.
    }
  }

  return results
}

/**
 * Continuous polling loop for ECS background worker container
 */
export async function startWorker(queueUrl: string = QUEUE_URLS.focusCompletion) {
  console.log(`[SQS Worker] Started listening on queue: ${queueUrl}`)
  let running = true

  const shutdown = () => {
    console.log('[SQS Worker] Received shutdown signal. Terminating gracefully...')
    running = false
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  while (running) {
    try {
      const results = await pollAndProcessBatch(queueUrl, 10, 20)
      if (results.length > 0) {
        console.log(`[SQS Worker] Processed batch of ${results.length} focus completion messages`)
      }
    } catch (err: any) {
      console.error('[SQS Worker] Batch polling error:', err.message)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }

  console.log('[SQS Worker] Worker stopped cleanly')
}

// Run if executed directly as entrypoint
if (process.argv[1] && process.argv[1].endsWith('sqs-worker.ts')) {
  startWorker().catch(console.error)
}
