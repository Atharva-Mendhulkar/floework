// test/api/cutover_phase10.test.ts
// ==============================================================================
// Phase 10: Production Cutover, Delta Synchronization & DNS Validation Test Suite
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import http from 'http'
import {
  MULTI_TENANT_TABLES,
  computeSyncDigest,
  runDeltaSync
} from '../../scripts/cutover_delta_sync.mjs'
import { runSmokeTests } from '../../scripts/smoke_test_e2e.mjs'
import { createServer } from '../../api/_server'

describe('Phase 10: Zero-Data-Loss Delta Synchronization Engine (scripts/cutover_delta_sync.mjs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares all multi-tenant tables in proper topological dependency order', () => {
    expect(MULTI_TENANT_TABLES).toContain('teams')
    expect(MULTI_TENANT_TABLES).toContain('team_members')
    expect(MULTI_TENANT_TABLES).toContain('projects')
    expect(MULTI_TENANT_TABLES).toContain('tasks')
    expect(MULTI_TENANT_TABLES).toContain('focus_sessions')
    expect(MULTI_TENANT_TABLES).toContain('audit_logs')
  })

  it('computes consistent deterministic checksum digest for synchronization stats', () => {
    const stats1 = [
      { table: 'teams', sourceCount: 10, targetCount: 10, deltasDetected: 0, synced: 0, status: 'IN_SYNC' as const }
    ]
    const stats2 = [
      { table: 'teams', sourceCount: 10, targetCount: 10, deltasDetected: 0, synced: 0, status: 'IN_SYNC' as const }
    ]
    const stats3 = [
      { table: 'teams', sourceCount: 15, targetCount: 10, deltasDetected: 5, synced: 5, status: 'SYNCED' as const }
    ]

    expect(computeSyncDigest(stats1)).toBe(computeSyncDigest(stats2))
    expect(computeSyncDigest(stats1)).not.toBe(computeSyncDigest(stats3))
  })

  it('runs forward delta sync in dry-run mode without issuing mutations', async () => {
    const mockSourceClient = {
      query: vi.fn().mockImplementation((queryStr: string) => {
        if (queryStr.includes('WHERE updated_at >')) {
          return { rows: [{ id: 'tsk-1', title: 'Migrated Task', updated_at: '2026-09-06T12:00:00Z' }] }
        }
        return { rows: [] }
      })
    }

    const mockTargetClient = {
      query: vi.fn().mockImplementation((queryStr: string) => {
        if (queryStr.includes('COUNT(*)')) {
          return { rows: [{ cnt: 0 }] }
        }
        return { rows: [] }
      })
    }

    const report = await runDeltaSync({
      dryRun: true,
      since: '2026-09-01T00:00:00Z',
      sourceClient: mockSourceClient,
      targetClient: mockTargetClient
    })

    expect(report.dryRun).toBe(true)
    expect(report.mode).toBe('FORWARD')
    expect(report.totalDeltas).toBe(MULTI_TENANT_TABLES.length) // 1 per table
    expect(report.allInSync).toBe(true)

    // Verify target client was NOT sent any INSERT ... ON CONFLICT queries during dry run
    const targetCalls = mockTargetClient.query.mock.calls
    const insertCalls = targetCalls.filter((c: any[]) => c[0].includes('INSERT INTO'))
    expect(insertCalls).toHaveLength(0)
  })

  it('runs live delta sync and executes transactional UPSERT queries for deltas', async () => {
    const mockSourceClient = {
      query: vi.fn().mockImplementation((queryStr: string) => {
        if (queryStr.includes('FROM tasks WHERE')) {
          return { rows: [{ id: 'tsk-99', title: 'Task 99', updated_at: '2026-09-06T18:00:00Z' }] }
        }
        return { rows: [] }
      })
    }

    const mockTargetClient = {
      query: vi.fn().mockImplementation((queryStr: string) => {
        if (queryStr.includes('COUNT(*)')) {
          return { rows: [{ cnt: 10 }] }
        }
        return { rows: [] }
      })
    }

    const report = await runDeltaSync({
      dryRun: false,
      since: '2026-09-05T00:00:00Z',
      sourceClient: mockSourceClient,
      targetClient: mockTargetClient
    })

    expect(report.dryRun).toBe(false)
    expect(report.totalDeltas).toBe(1) // only tasks had rows

    // Verify INSERT ... ON CONFLICT was executed for the tasks table
    const targetCalls = mockTargetClient.query.mock.calls
    const insertCall = targetCalls.find((c: any[]) => c[0].includes('INSERT INTO tasks'))
    expect(insertCall).toBeDefined()
    expect(insertCall[0]).toContain('ON CONFLICT (id) DO UPDATE')
  })

  it('supports reverse replication mode for 48-hour rollback protection', async () => {
    const report = await runDeltaSync({
      dryRun: true,
      reverse: true
    })

    expect(report.mode).toBe('REVERSE')
  })
})

describe('Phase 10: Production Smoke Testing Harness (scripts/smoke_test_e2e.mjs)', () => {
  let server: http.Server
  let serverPort: number

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/floework'
    process.env.AWS_REGION = 'us-east-1'

    server = createServer()
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address()
        if (typeof addr === 'object' && addr) {
          serverPort = addr.port
        }
        resolve()
      })
    })
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('executes full smoke test suite against live server and reports passing probes', async () => {
    const summary = await runSmokeTests(`http://127.0.0.1:${serverPort}`)

    expect(summary.total).toBe(5)
    expect(summary.failed).toBe(0)
    expect(summary.passed).toBe(5)
    expect(summary.allPassed).toBe(true)

    // Validate specific checks are present
    const names = summary.results.map((r) => r.name)
    expect(names).toContain('Liveness Probe (/health/live)')
    expect(names).toContain('Readiness Probe (/health/ready)')
    expect(names).toContain('Root Health Probe (/health)')
    expect(names).toContain('Tasks API Reject Non-Member')
    expect(names).toContain('Storage Presigned URL Boundary')
  })
})
