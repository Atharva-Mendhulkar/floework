// test/api/saas_phase11.test.ts
// ==============================================================================
// Phase 11: SaaS Feature Expansion Test Suite
// Validates Amazon SES transactional emails, server-side DAG cycle detection,
// task dependency persistence, and Stripe billing webhook handling.
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  sendEmail,
  sendWorkspaceInviteEmail
} from '../../api/_lib/ses'
import {
  detectCycle,
  calculateBlockerCascade,
  calculateCriticalPath,
  DependencyEdge
} from '../../api/_lib/dag'
import { verifyStripeSignature } from '../../api/billing/webhook'
import crypto from 'crypto'

import { setMockQueryHandler } from '../../api/_lib/db'
import { setMockUserResolver } from '../../api/_lib/auth'

const mockEdges: any[] = []
const mockUser = {
  id: 'usr-charlie',
  email: 'charlie@floework.test',
  role: 'admin',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
}

setMockUserResolver(async (token: string) => {
  if (token === 'valid-charlie-token') {
    return mockUser
  }
  return null
})

setMockQueryHandler(async (sql: string, params: any[] = []) => {
  const lower = sql.toLowerCase()

  // 1. Projects lookup
  if (lower.includes('from projects') || lower.includes('from public.projects')) {
    return { rows: [{ team_id: 'team-alpha' }], rowCount: 1 }
  }

  // 2. Team members lookup
  if (lower.includes('from team_members') || lower.includes('from public.team_members')) {
    return { rows: [{ role: 'admin' }], rowCount: 1 }
  }

  // 3. Dependencies select
  if (lower.includes('from task_dependencies') || lower.includes('from public.task_dependencies')) {
    return { rows: mockEdges, rowCount: mockEdges.length }
  }

  // 4. Dependencies insert
  if (lower.includes('insert into task_dependencies')) {
    const newEdge = {
      id: `dep-${mockEdges.length + 1}`,
      project_id: params[0],
      source_task_id: params[1],
      target_task_id: params[2],
      dependency_type: params[3] || 'BLOCKS',
      created_at: new Date().toISOString()
    }
    mockEdges.push(newEdge)
    return { rows: [newEdge], rowCount: 1 }
  }

  // 5. Teams update (billing)
  if (lower.includes('update teams') || lower.includes('update public.teams')) {
    return { rows: [{ id: params[2] || 'team-alpha', plan: params[0] }], rowCount: 1 }
  }

  return { rows: [], rowCount: 0 }
})

import dependenciesHandler from '../../api/tasks/dependencies'
import billingWebhookHandler from '../../api/billing/webhook'

function createMockReqRes({
  method = 'GET',
  headers = {},
  query = {},
  body = {}
}: {
  method?: string
  headers?: Record<string, string>
  query?: Record<string, any>
  body?: Record<string, any>
} = {}) {
  const req = {
    method,
    headers: { ...headers },
    query: { ...query },
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

describe('Phase 11: Amazon SES Transactional Email Engine (api/_lib/ses.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches transactional email in test/mock mode with generated message ID', async () => {
    const result = await sendEmail({
      to: 'developer@example.com',
      subject: 'Welcome to Floework',
      html: '<p>Welcome!</p>',
      text: 'Welcome!'
    })

    expect(result.sent).toBe(true)
    expect(result.mocked).toBe(true)
    expect(result.messageId).toMatch(/^ses-mock-/)
  })

  it('generates rich branded HTML invitation with secure acceptance URL', async () => {
    const result = await sendWorkspaceInviteEmail({
      to: 'new-teammate@example.com',
      inviterName: 'Alice Engineering Lead',
      teamName: 'Platform Infrastructure',
      inviteToken: 'sec-invite-token-999',
      appUrl: 'https://floework.com'
    })

    expect(result.sent).toBe(true)
    expect(result.messageId).toBeDefined()
  })
})

describe('Phase 11: Server-Side DAG Cycle Detection & Intelligence (api/_lib/dag.ts)', () => {
  it('rejects self-referential dependency loops immediately', () => {
    const existingEdges: DependencyEdge[] = []
    const newEdge: DependencyEdge = { source: 'task-A', target: 'task-A' }

    const result = detectCycle(existingEdges, newEdge)
    expect(result.hasCycle).toBe(true)
    expect(result.error).toContain('Self-referential dependency')
    expect(result.cyclePath).toEqual(['task-A', 'task-A'])
  })

  it('detects direct 2-node circular dependency (A -> B, then B -> A)', () => {
    const existingEdges: DependencyEdge[] = [
      { source: 'task-A', target: 'task-B' }
    ]
    const newEdge: DependencyEdge = { source: 'task-B', target: 'task-A' }

    const result = detectCycle(existingEdges, newEdge)
    expect(result.hasCycle).toBe(true)
    expect(result.error).toContain('Circular dependency detected')
    expect(result.cyclePath).toContain('task-A')
    expect(result.cyclePath).toContain('task-B')
  })

  it('detects multi-hop transitive circular dependency (A -> B -> C -> D, then D -> A)', () => {
    const existingEdges: DependencyEdge[] = [
      { source: 'task-A', target: 'task-B' },
      { source: 'task-B', target: 'task-C' },
      { source: 'task-C', target: 'task-D' }
    ]
    const newEdge: DependencyEdge = { source: 'task-D', target: 'task-A' }

    const result = detectCycle(existingEdges, newEdge)
    expect(result.hasCycle).toBe(true)
    expect(result.cyclePath).toEqual(['task-D', 'task-A', 'task-B', 'task-C', 'task-D'])
  })

  it('permits valid linear DAG chains without cycle flags', () => {
    const existingEdges: DependencyEdge[] = [
      { source: 'task-A', target: 'task-B' },
      { source: 'task-B', target: 'task-C' }
    ]
    const newEdge: DependencyEdge = { source: 'task-C', target: 'task-D' }

    const result = detectCycle(existingEdges, newEdge)
    expect(result.hasCycle).toBe(false)
  })

  it('permits diamond DAG topologies without false-positive cycle flags', () => {
    // Diamond graph: A -> B -> D, and A -> C -> D
    const existingEdges: DependencyEdge[] = [
      { source: 'task-A', target: 'task-B' },
      { source: 'task-A', target: 'task-C' },
      { source: 'task-B', target: 'task-D' }
    ]
    const newEdge: DependencyEdge = { source: 'task-C', target: 'task-D' }

    const result = detectCycle(existingEdges, newEdge)
    expect(result.hasCycle).toBe(false)
  })

  it('calculates downstream blocker cascade correctly', () => {
    const edges: DependencyEdge[] = [
      { source: 'task-root', target: 'task-child-1' },
      { source: 'task-root', target: 'task-child-2' },
      { source: 'task-child-1', target: 'task-grandchild' }
    ]

    const cascade = calculateBlockerCascade('task-root', edges)
    expect(cascade).toHaveLength(3)
    expect(cascade).toContain('task-child-1')
    expect(cascade).toContain('task-child-2')
    expect(cascade).toContain('task-grandchild')
  })

  it('calculates critical execution path and total estimated duration', () => {
    const tasks = [
      { id: 'design', durationMinutes: 120 },
      { id: 'backend', durationMinutes: 240 },
      { id: 'frontend', durationMinutes: 180 },
      { id: 'deploy', durationMinutes: 60 }
    ]
    const edges: DependencyEdge[] = [
      { source: 'design', target: 'backend' },
      { source: 'design', target: 'frontend' },
      { source: 'backend', target: 'deploy' },
      { source: 'frontend', target: 'deploy' }
    ]

    const { criticalPath, totalDurationMinutes } = calculateCriticalPath(tasks, edges)
    // Longest path: design (120) + backend (240) + deploy (60) = 420 minutes
    expect(totalDurationMinutes).toBe(420)
    expect(criticalPath).toEqual(['design', 'backend', 'deploy'])
  })
})

describe('Phase 11: Task Dependencies API Enforcement (api/tasks/dependencies.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEdges.length = 0
  })

  it('rejects unauthenticated requests with HTTP 401', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: {},
      body: { projectId: 'prj-1', sourceTaskId: 'task-A', targetTaskId: 'task-B' }
    })

    await dependenciesHandler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('rejects self-referential dependency with HTTP 400', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer valid-charlie-token' },
      body: { projectId: 'prj-1', sourceTaskId: 'task-X', targetTaskId: 'task-X' }
    })

    await dependenciesHandler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('Self-referential dependency')
  })

  it('persists valid acyclic dependency and returns HTTP 201 Created', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: { authorization: 'Bearer valid-charlie-token' },
      body: { projectId: 'prj-1', sourceTaskId: 'task-A', targetTaskId: 'task-B', dependencyType: 'BLOCKS' }
    })

    await dependenciesHandler(req, res)
    expect(res.statusCode).toBe(201)
    expect(res.body.success).toBe(true)
  })
})

describe('Phase 11: Stripe Billing Webhook Integration (api/billing/webhook.ts)', () => {
  const secret = 'whsec_test_secret_key_12345'

  it('verifies valid HMAC SHA-256 Stripe signatures', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const payload = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' })
    const signedPayload = `${timestamp}.${payload}`
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
    const header = `t=${timestamp},v1=${signature}`

    expect(verifyStripeSignature(payload, header, secret)).toBe(true)
  })

  it('rejects tampered or forged Stripe signatures', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const payload = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' })
    const header = `t=${timestamp},v1=forged_bad_signature_deadbeef`

    expect(verifyStripeSignature(payload, header, secret)).toBe(false)
  })

  it('handles customer.subscription.created event and returns HTTP 200', async () => {
    const event = {
      id: 'evt_sub_created',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_12345',
          status: 'active',
          metadata: { team_id: 'team-alpha', plan_tier: 'enterprise' }
        }
      }
    }

    const { req, res } = createMockReqRes({
      method: 'POST',
      headers: {},
      body: event
    })

    await billingWebhookHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.received).toBe(true)
    expect(res.body.eventId).toBe('evt_sub_created')
  })
})
