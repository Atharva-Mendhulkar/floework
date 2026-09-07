// test/api/migrations_runner.test.ts
// ==============================================================================
// Behavioral Test Suite: PostgreSQL Migration Engine (scripts/run_migrations.mjs)
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import {
  computeFileChecksum,
  getMigrationFiles,
  ensureTrackingTable,
  getAppliedMigrations,
  validateChecksums,
  applyMigration,
  runMigrations
} from '../../scripts/run_migrations.mjs'

describe('PostgreSQL Migration Engine (scripts/run_migrations.mjs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Migration Discovery & Deterministic Checksums', () => {
    it('discovers all 42 migration files in database/migrations/', () => {
      const migrations = getMigrationFiles()
      expect(migrations.length).toBe(42)
    })

    it('orders migrations strictly ascending with RDS bootstrap shim first', () => {
      const migrations = getMigrationFiles()
      expect(migrations[0].version).toBe('000_bootstrap_rds_shim')
      expect(migrations[1].version).toBe('000_repair_pre_hardening')
      expect(migrations[2].version).toBe('001_schema')
      expect(migrations[migrations.length - 1].version).toBe('040_sec_p0_fixes')
    })

    it('populates required metadata for each migration', () => {
      const migrations = getMigrationFiles()
      for (const m of migrations) {
        expect(m.filename).toMatch(/^\d{3}.*\.sql$/)
        expect(m.version).toBeDefined()
        expect(m.name).toBeDefined()
        expect(m.path).toBeDefined()
        expect(m.checksum).toMatch(/^[a-f0-9]{64}$/)
        expect(m.sql.length).toBeGreaterThan(0)
      }
    })

    it('computes deterministic SHA-256 checksums regardless of line endings', () => {
      const contentLF = 'CREATE TABLE test (\n  id UUID PRIMARY KEY\n);\n'
      const contentCRLF = 'CREATE TABLE test (\r\n  id UUID PRIMARY KEY\r\n);\r\n'

      const hashLF = computeFileChecksum(contentLF)
      const hashCRLF = computeFileChecksum(contentCRLF)

      expect(hashLF).toBe(hashCRLF)
      expect(hashLF).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('2. Tracking Table & State Queries', () => {
    it('issues idempotent CREATE TABLE statement for schema_migrations', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] })
      }

      await ensureTrackingTable(mockClient)

      expect(mockClient.query).toHaveBeenCalledTimes(1)
      const queryStr = mockClient.query.mock.calls[0][0]
      expect(queryStr).toContain('CREATE TABLE IF NOT EXISTS public.schema_migrations')
      expect(queryStr).toContain('version VARCHAR(255) UNIQUE NOT NULL')
      expect(queryStr).toContain('checksum VARCHAR(64) NOT NULL')
    })

    it('retrieves previously applied migrations in ascending ID order', async () => {
      const mockRows = [
        {
          id: 1,
          version: '000_bootstrap_rds_shim',
          name: 'bootstrap_rds_shim',
          checksum: 'abc123',
          execution_time_ms: 25,
          applied_at: new Date('2026-09-01')
        }
      ]
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: mockRows })
      }

      const applied = await getAppliedMigrations(mockClient)
      expect(applied).toEqual(mockRows)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT version, name, checksum')
      )
    })
  })

  describe('3. Tamper Detection & Checksum Validation', () => {
    it('passes when disk checksums match database applied records', () => {
      const discovered = [
        { version: '001_schema', checksum: 'checksum-valid-1' },
        { version: '002_rls', checksum: 'checksum-valid-2' }
      ]
      const applied = [
        { version: '001_schema', checksum: 'checksum-valid-1' },
        { version: '002_rls', checksum: 'checksum-valid-2' }
      ]

      const mismatches = validateChecksums(discovered, applied)
      expect(mismatches).toHaveLength(0)
    })

    it('throws error when a previously applied migration file has been modified', () => {
      const discovered = [
        { version: '001_schema', checksum: 'checksum-MODIFIED' }
      ]
      const applied = [
        { version: '001_schema', checksum: 'checksum-ORIGINAL' }
      ]

      expect(() => validateChecksums(discovered, applied)).toThrow(
        /Migration checksum mismatch detected/
      )
    })

    it('allows checksum override when force option is true', () => {
      const discovered = [
        { version: '001_schema', checksum: 'checksum-MODIFIED' }
      ]
      const applied = [
        { version: '001_schema', checksum: 'checksum-ORIGINAL' }
      ]

      const mismatches = validateChecksums(discovered, applied, { force: true })
      expect(mismatches).toHaveLength(1)
      expect(mismatches[0].version).toBe('001_schema')
    })
  })

  describe('4. Transactional Execution & Rollback Safety', () => {
    it('wraps successful migration execution inside BEGIN and COMMIT blocks', async () => {
      const queryHistory: string[] = []
      const mockClient = {
        query: vi.fn().mockImplementation(async (sql: string) => {
          queryHistory.push(sql.trim().split('\n')[0])
          return { rows: [] }
        })
      }

      const testMigration = {
        filename: '001_schema.sql',
        version: '001_schema',
        name: 'schema',
        checksum: 'test-hash-1',
        sql: 'CREATE TABLE public.test_items (id SERIAL PRIMARY KEY);'
      }

      const result = await applyMigration(mockClient, testMigration)

      expect(result.status).toBe('SUCCESS')
      expect(queryHistory[0]).toBe('BEGIN')
      expect(queryHistory[1]).toBe('CREATE TABLE public.test_items (id SERIAL PRIMARY KEY);')
      expect(queryHistory[2]).toContain('INSERT INTO public.schema_migrations')
      expect(queryHistory[3]).toBe('COMMIT')
    })

    it('issues ROLLBACK and halts when SQL statement throws an error', async () => {
      const queryHistory: string[] = []
      const mockClient = {
        query: vi.fn().mockImplementation(async (sql: string) => {
          queryHistory.push(sql.trim().split('\n')[0])
          if (sql.includes('MALFORMED')) {
            throw new Error('syntax error at or near "MALFORMED"')
          }
          return { rows: [] }
        })
      }

      const failingMigration = {
        filename: '005_broken.sql',
        version: '005_broken',
        name: 'broken',
        checksum: 'broken-hash',
        sql: 'MALFORMED SQL SYNTAX;'
      }

      await expect(applyMigration(mockClient, failingMigration)).rejects.toThrow(
        /Migration 005_broken.sql failed: syntax error at or near "MALFORMED"/
      )

      expect(queryHistory).toContain('BEGIN')
      expect(queryHistory).toContain('ROLLBACK')
      expect(queryHistory).not.toContain('COMMIT')
    })
  })

  describe('5. Orchestrator Modes: Dry-Run, Status, Target, and Execute', () => {
    it('runs dry-run mode without issuing mutations', async () => {
      const queries: string[] = []
      const mockClient = {
        query: vi.fn().mockImplementation(async (q: string) => {
          queries.push(q)
          return { rows: [] }
        })
      }

      const report = await runMigrations({
        client: mockClient,
        dryRun: true
      })

      expect(report.mode).toBe('DRY_RUN')
      expect(report.totalDiscovered).toBe(42)
      expect(report.pendingCount).toBe(42)
      expect(report.pendingMigrations).toHaveLength(42)

      // Ensure no BEGIN or INSERT was issued in dry-run
      expect(queries.some((q) => q.includes('BEGIN'))).toBe(false)
      expect(queries.some((q) => q.includes('INSERT INTO public.schema_migrations'))).toBe(false)
    })

    it('runs status mode and accurately segregates applied vs pending migrations', async () => {
      const mockClient = {
        query: vi.fn().mockImplementation(async (q: string) => {
          if (q.includes('SELECT version, name')) {
            return {
              rows: [
                {
                  version: '000_bootstrap_rds_shim',
                  name: 'bootstrap_rds_shim',
                  checksum: '937c2220b845',
                  execution_time_ms: 15,
                  applied_at: new Date('2026-09-01T10:00:00Z')
                }
              ]
            }
          }
          return { rows: [] }
        })
      }

      const report = await runMigrations({
        client: mockClient,
        status: true,
        force: true
      })

      expect(report.mode).toBe('STATUS')
      expect(report.totalDiscovered).toBe(42)
      expect(report.appliedCount).toBe(1)
      expect(report.pendingCount).toBe(41)

      const firstMigration = report.migrations.find((m: any) => m.version === '000_bootstrap_rds_shim')
      expect(firstMigration?.status).toBe('APPLIED')
      expect(firstMigration?.executionTimeMs).toBe(15)

      const secondMigration = report.migrations.find((m: any) => m.version === '000_repair_pre_hardening')
      expect(secondMigration?.status).toBe('PENDING')
    })

    it('respects target cutoff parameter and only plans up to specified version', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] })
      }

      const report = await runMigrations({
        client: mockClient,
        dryRun: true,
        target: '002_rls'
      })

      expect(report.pendingCount).toBe(4) // 000_bootstrap, 000_repair, 001_schema, 002_rls
      expect(report.pendingMigrations[report.pendingMigrations.length - 1].version).toBe('002_rls')
    })

    it('executes all pending migrations sequentially when run in execute mode', async () => {
      const executedMigrations: string[] = []
      const mockClient = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          if (sql.includes('INSERT INTO public.schema_migrations')) {
            executedMigrations.push(params?.[0])
          }
          return { rows: [] }
        })
      }

      const report = await runMigrations({
        client: mockClient,
        target: '001_schema',
        logger: { log: vi.fn() }
      })

      expect(report.mode).toBe('EXECUTE')
      expect(report.executedCount).toBe(3) // 000_bootstrap, 000_repair, 001_schema
      expect(executedMigrations).toEqual([
        '000_bootstrap_rds_shim',
        '000_repair_pre_hardening',
        '001_schema'
      ])
    })
  })
})
