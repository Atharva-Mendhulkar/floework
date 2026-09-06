// test/api/sqs_phase8.test.ts
// ==============================================================================
// Phase 8: Asynchronous Processing & Workers Test Suite
// Validates Amazon SQS FIFO ordering, deduplication, worker message handling,
// DLQ redrive semantics, and focus completion asynchronous event publishing.
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Track SQS Client calls using vi.hoisted so it is available to hoisted vi.mock
const { mockSqsSend } = vi.hoisted(() => ({
  mockSqsSend: vi.fn()
}))

vi.mock('@aws-sdk/client-sqs', () => {
  return {
    SQSClient: vi.fn().mockImplementation(() => ({
      send: mockSqsSend
    })),
    SendMessageCommand: vi.fn().mockImplementation((params) => ({
      ...params,
      _isSendMessage: true
    })),
    ReceiveMessageCommand: vi.fn().mockImplementation((params) => ({
      ...params,
      _isReceiveMessage: true
    })),
    DeleteMessageCommand: vi.fn().mockImplementation((params) => ({
      ...params,
      _isDeleteMessage: true
    }))
  }
})

// Mock Supabase Auth & DB
const mockUser = { id: 'usr-charlie', email: 'charlie@floework.test' }
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'valid-charlie-token') {
          return { data: { user: mockUser }, error: null }
        }
        return { data: { user: null }, error: { message: 'Invalid token' } }
      })
    },
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        single: async () => {
          if (table === 'projects') {
            return { data: { team_id: 'team-alpha' }, error: null }
          }
          if (table === 'team_members') {
            return { data: { role: 'member' }, error: null }
          }
          return { data: null, error: { message: 'Not found' } }
        }
      }
      return builder
    }
  })
}))

// Import SQS library and worker after mocks
import {
  publishToQueue,
  publishFocusCompletionEvent,
  publishAuditEvent,
  publishNotificationEvent,
  QUEUE_URLS
} from '../../api/_lib/sqs'

import {
  calculateFocusStability,
  processMessage,
  pollAndProcessBatch
} from '../../workers/sqs-worker'

import focusCompleteHandler from '../../api/focus/complete'

function createMockReqRes({
  method = 'POST',
  headers = {},
  body = {}
}: {
  method?: string
  headers?: Record<string, string>
  body?: Record<string, any>
} = {}) {
  const req = {
    method,
    headers: { ...headers },
    body: { ...body }
  } as any

  let statusCode = 200
  let responseBody: any = null

  const res = {
    status(code: number) {
      statusCode = code
      return res
    },
    json(data: any) {
      responseBody = data
      return res
    },
    get statusCode() {
      return statusCode
    },
    get body() {
      return responseBody
    }
  } as any

  return { req, res }
}

describe('Phase 8: Amazon SQS FIFO Messaging Engine (api/_lib/sqs.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('strictly rejects publishing to FIFO queue without a messageGroupId', async () => {
    await expect(
      publishToQueue(QUEUE_URLS.focusCompletion, { test: 123 }, { messageGroupId: '' })
    ).rejects.toThrow('FIFO SQS queues strictly require a non-empty messageGroupId')
  })

  it('publishes JSON payload with correct MessageGroupId and queue URL', async () => {
    mockSqsSend.mockResolvedValueOnce({
      MessageId: 'sqs-msg-1001',
      SequenceNumber: '18828374920'
    })

    const payload = { type: 'FOCUS_SESSION_COMPLETED', durationSecs: 1800 }
    const result = await publishToQueue('https://sqs.us-east-1.amazonaws.com/test-queue.fifo', payload, {
      messageGroupId: 'usr-charlie',
      messageDeduplicationId: 'dedup-001'
    })

    expect(mockSqsSend).toHaveBeenCalledTimes(1)
    const command = mockSqsSend.mock.calls[0][0]
    expect(command.QueueUrl).toBe('https://sqs.us-east-1.amazonaws.com/test-queue.fifo')
    expect(command.MessageGroupId).toBe('usr-charlie')
    expect(command.MessageDeduplicationId).toBe('dedup-001')
    expect(JSON.parse(command.MessageBody)).toEqual(payload)
    expect(result.messageId).toBe('sqs-msg-1001')
    expect(result.sequenceNumber).toBe('18828374920')
  })

  it('publishFocusCompletionEvent targets focus-completion.fifo partitioned by userId', async () => {
    mockSqsSend.mockResolvedValueOnce({
      MessageId: 'focus-msg-1',
      SequenceNumber: '100'
    })

    const event = {
      type: 'FOCUS_SESSION_COMPLETED' as const,
      userId: 'usr-alice',
      durationSecs: 1500,
      timestamp: '2026-09-06T20:00:00Z'
    }

    const res = await publishFocusCompletionEvent('usr-alice', event)
    expect(res.messageId).toBe('focus-msg-1')

    const command = mockSqsSend.mock.calls[0][0]
    expect(command.QueueUrl).toBe(QUEUE_URLS.focusCompletion)
    expect(command.MessageGroupId).toBe('usr-alice')
  })

  it('publishAuditEvent targets audit-logs.fifo partitioned by teamId', async () => {
    mockSqsSend.mockResolvedValueOnce({ MessageId: 'audit-msg-1' })

    await publishAuditEvent('team-alpha', { action: 'TEAM_ROLE_CHANGED', actor: 'usr-admin' })
    const command = mockSqsSend.mock.calls[0][0]
    expect(command.QueueUrl).toBe(QUEUE_URLS.auditLogs)
    expect(command.MessageGroupId).toBe('team-alpha')
  })

  it('publishNotificationEvent targets notifications.fifo partitioned by recipientId', async () => {
    mockSqsSend.mockResolvedValueOnce({ MessageId: 'notif-msg-1' })

    await publishNotificationEvent('usr-bob', { title: 'New Task Assigned', taskId: 'tsk-42' })
    const command = mockSqsSend.mock.calls[0][0]
    expect(command.QueueUrl).toBe(QUEUE_URLS.notifications)
    expect(command.MessageGroupId).toBe('usr-bob')
  })
})

describe('Phase 8: Background Worker Processing (workers/sqs-worker.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates focus stability correctly based on session duration', () => {
    // Under 5 minutes: fragmented
    expect(calculateFocusStability(120)).toBe(0.2)
    expect(calculateFocusStability(299)).toBe(0.2)

    // Intermediate block: 0.6
    expect(calculateFocusStability(600)).toBe(0.6)
    expect(calculateFocusStability(1200)).toBe(0.6)

    // Deep work sweet spot (25 - 60 minutes): 0.95
    expect(calculateFocusStability(1500)).toBe(0.95)
    expect(calculateFocusStability(2400)).toBe(0.95)
    expect(calculateFocusStability(3600)).toBe(0.95)

    // Extended session (> 60 minutes): 0.85
    expect(calculateFocusStability(4200)).toBe(0.85)
  })

  it('processMessage successfully calculates stability and sends DeleteMessageCommand', async () => {
    mockSqsSend.mockResolvedValueOnce({}) // DeleteMessage response

    const message = {
      MessageId: 'msg-valid-1',
      ReceiptHandle: 'handle-abc-123',
      Body: JSON.stringify({
        type: 'FOCUS_SESSION_COMPLETED',
        userId: 'usr-charlie',
        durationSecs: 1800,
        timestamp: '2026-09-06T21:00:00Z'
      })
    }

    const result = await processMessage(message, QUEUE_URLS.focusCompletion)

    expect(result.status).toBe('PROCESSED')
    expect(result.userId).toBe('usr-charlie')
    expect(result.stabilityScore).toBe(0.95)
    expect(result.messageId).toBe('msg-valid-1')

    // Confirm DeleteMessage was sent with ReceiptHandle
    expect(mockSqsSend).toHaveBeenCalledTimes(1)
    const deleteCommand = mockSqsSend.mock.calls[0][0]
    expect(deleteCommand.QueueUrl).toBe(QUEUE_URLS.focusCompletion)
    expect(deleteCommand.ReceiptHandle).toBe('handle-abc-123')
  })

  it('processMessage throws error on corrupt or non-matching message without deleting', async () => {
    const corruptMsg = {
      MessageId: 'msg-corrupt',
      ReceiptHandle: 'handle-corrupt',
      Body: 'NOT_VALID_JSON{{{'
    }

    await expect(processMessage(corruptMsg)).rejects.toThrow('Invalid JSON in message')
    expect(mockSqsSend).not.toHaveBeenCalled()
  })

  it('pollAndProcessBatch handles mix of successful and failed messages gracefully', async () => {
    mockSqsSend
      // ReceiveMessageCommand response
      .mockResolvedValueOnce({
        Messages: [
          {
            MessageId: 'msg-ok',
            ReceiptHandle: 'handle-ok',
            Body: JSON.stringify({
              type: 'FOCUS_SESSION_COMPLETED',
              userId: 'usr-alice',
              durationSecs: 2000
            })
          },
          {
            MessageId: 'msg-bad',
            ReceiptHandle: 'handle-bad',
            Body: 'MALFORMED'
          }
        ]
      })
      // DeleteMessageCommand response for msg-ok
      .mockResolvedValueOnce({})

    const results = await pollAndProcessBatch(QUEUE_URLS.focusCompletion, 5, 20)

    expect(results).toHaveLength(2)
    expect(results[0].status).toBe('PROCESSED')
    expect(results[0].messageId).toBe('msg-ok')
    expect(results[0].stabilityScore).toBe(0.95)

    expect(results[1].status).toBe('FAILED')
    expect(results[1].messageId).toBe('msg-bad')
    expect(results[1].error).toContain('Invalid JSON')

    // Exactly 2 calls: 1 Receive + 1 Delete (msg-bad is NOT deleted, leaving it for DLQ redrive)
    expect(mockSqsSend).toHaveBeenCalledTimes(2)
  })
})

describe('Phase 8: POST /api/focus/complete SQS Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: {},
      body: { durationSecs: 1800 }
    })

    await focusCompleteHandler(req, res)
    expect(res.statusCode).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
    expect(mockSqsSend).not.toHaveBeenCalled()
  })

  it('rejects user spoofing attempt with 403 Forbidden', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer valid-charlie-token' },
      body: {
        userId: 'usr-victim-attacker-target',
        durationSecs: 1800
      }
    })

    await focusCompleteHandler(req, res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error).toContain('Forbidden: Cannot complete focus session for another user')
    expect(mockSqsSend).not.toHaveBeenCalled()
  })

  it('rejects missing durationSecs with 400 Bad Request', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer valid-charlie-token' },
      body: {}
    })

    await focusCompleteHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBe('Missing required fields')
  })

  it('publishes focus completion event to SQS FIFO and returns 202 Accepted', async () => {
    mockSqsSend.mockResolvedValueOnce({
      MessageId: 'sqs-accepted-1',
      SequenceNumber: '990001'
    })

    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer valid-charlie-token' },
      body: {
        durationSecs: 1800,
        projectId: 'prj-alpha'
      }
    })

    await focusCompleteHandler(req, res)

    expect(res.statusCode).toBe(202)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toContain('Focus session completed event queued for processing')

    expect(mockSqsSend).toHaveBeenCalledTimes(1)
    const command = mockSqsSend.mock.calls[0][0]
    expect(command.QueueUrl).toBe(QUEUE_URLS.focusCompletion)
    expect(command.MessageGroupId).toBe('usr-charlie')
    const sentEvent = JSON.parse(command.MessageBody)
    expect(sentEvent.type).toBe('FOCUS_SESSION_COMPLETED')
    expect(sentEvent.userId).toBe('usr-charlie')
    expect(sentEvent.projectId).toBe('prj-alpha')
    expect(sentEvent.durationSecs).toBe(1800)
  })
})
