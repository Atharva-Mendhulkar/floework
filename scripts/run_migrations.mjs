#!/usr/bin/env node
// scripts/run_migrations.mjs
// ==============================================================================
// Floework PostgreSQL Database Migration Runner
// Applies SQL migrations (000_bootstrap_rds_shim.sql through 040_sec_p0_fixes.sql)
// in database/migrations/ sequentially with transaction safety, tracking table,
// checksum tamper detection, and dry-run capabilities.
// ==============================================================================

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, '../database/migrations')

/**
 * Computes deterministic SHA-256 checksum of SQL file content
 * Normalizes CRLF line endings to LF to ensure cross-platform reproducibility
 */
export function computeFileChecksum(content) {
  const normalized = content.replace(/\r\n/g, '\n')
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex')
}

/**
 * Discovers and sorts all SQL migration files in ascending order
 */
export function getMigrationFiles(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory does not exist: ${migrationsDir}`)
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

  return files.map((filename) => {
    const fullPath = path.join(migrationsDir, filename)
    const content = fs.readFileSync(fullPath, 'utf8')
    const version = filename.replace(/\.sql$/, '')
    const checksum = computeFileChecksum(content)

    return {
      filename,
      version,
      name: filename.replace(/^\d+([a-zA-Z0-9_-]*)_/, '').replace(/\.sql$/, ''),
      path: fullPath,
      checksum,
      sql: content
    }
  })
}

/**
 * Ensures the schema_migrations tracking table exists
 */
export async function ensureTrackingTable(client) {
  const ddl = `
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await client.query(ddl)
}

/**
 * Retrieves list of already applied migrations from tracking table
 */
export async function getAppliedMigrations(client) {
  const res = await client.query(
    'SELECT version, name, checksum, execution_time_ms, applied_at FROM public.schema_migrations ORDER BY id ASC'
  )
  return res.rows || []
}

/**
 * Validates checksums of applied migrations against disk copies to detect tampering
 */
export function validateChecksums(discovered, applied, options = {}) {
  const discoveredMap = new Map(discovered.map((m) => [m.version, m]))
  const mismatches = []

  for (const app of applied) {
    const disc = discoveredMap.get(app.version)
    if (disc && disc.checksum !== app.checksum) {
      mismatches.push({
        version: app.version,
        appliedChecksum: app.checksum,
        diskChecksum: disc.checksum
      })
    }
  }

  if (mismatches.length > 0 && !options.force) {
    const details = mismatches
      .map((m) => `  - ${m.version}: db=${m.appliedChecksum.slice(0, 8)} vs disk=${m.diskChecksum.slice(0, 8)}`)
      .join('\n')
    throw new Error(
      `Migration checksum mismatch detected! Files have been modified after being applied:\n${details}\nUse --force to override this check.`
    )
  }

  return mismatches
}

/**
 * Applies a single migration inside an isolated transaction block
 */
export async function applyMigration(client, migration) {
  const startTime = Date.now()
  await client.query('BEGIN')

  try {
    // Execute migration DDL/DML
    await client.query(migration.sql)

    const executionTimeMs = Date.now() - startTime

    // Record migration in tracking table
    await client.query(
      `INSERT INTO public.schema_migrations (version, name, checksum, execution_time_ms, applied_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [migration.version, migration.name, migration.checksum, executionTimeMs]
    )

    await client.query('COMMIT')
    return {
      version: migration.version,
      name: migration.name,
      executionTimeMs,
      status: 'SUCCESS'
    }
  } catch (err) {
    await client.query('ROLLBACK')
    const wrappedErr = new Error(`Migration ${migration.filename} failed: ${err.message}`)
    wrappedErr.originalError = err
    wrappedErr.migration = migration
    throw wrappedErr
  }
}

/**
 * Primary migration orchestrator
 */
export async function runMigrations(options = {}) {
  const migrationsDir = options.migrationsDir || DEFAULT_MIGRATIONS_DIR
  const dryRun = Boolean(options.dryRun)
  const statusOnly = Boolean(options.status)
  const target = options.target
  const force = Boolean(options.force)
  const logger = options.logger || console

  const discovered = getMigrationFiles(migrationsDir)

  let client = options.client
  let shouldCloseClient = false

  if (!client) {
    const connectionString =
      options.connectionString ||
      process.env.DATABASE_URL ||
      (process.env.PGHOST
        ? `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'floework'}`
        : null)

    if (!connectionString) {
      if (dryRun || statusOnly) {
        // Offline simulation mode when no live database connection is provided
        logger.log?.('[Migration] Note: Running in offline simulation mode (DATABASE_URL not set).')
        client = {
          query: async (q) => {
            if (typeof q === 'string' && q.includes('CREATE TABLE IF NOT EXISTS')) return { rows: [] }
            if (typeof q === 'string' && q.includes('SELECT version')) return { rows: [] }
            return { rows: [] }
          }
        }
      } else {
        throw new Error(
          'Database connection required. Provide DATABASE_URL environment variable or supply a client instance.'
        )
      }
    } else {
      const { Client } = pg
      client = new Client({
        connectionString,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
      })
      await client.connect()
      shouldCloseClient = true
    }
  }

  try {
    // 1. Ensure tracking table
    await ensureTrackingTable(client)

    // 2. Fetch applied migrations
    const applied = await getAppliedMigrations(client)
    const appliedMap = new Map(applied.map((a) => [a.version, a]))

    // 3. Checksum verification
    const mismatches = validateChecksums(discovered, applied, { force })

    // 4. Calculate pending migrations
    let pending = discovered.filter((m) => !appliedMap.has(m.version))

    if (target) {
      const targetIndex = pending.findIndex((m) => m.version === target || m.version.startsWith(target))
      if (targetIndex !== -1) {
        pending = pending.slice(0, targetIndex + 1)
      }
    }

    // 5. Handle Status Mode
    if (statusOnly) {
      const statusReport = discovered.map((m) => {
        const app = appliedMap.get(m.version)
        return {
          version: m.version,
          name: m.name,
          status: app ? 'APPLIED' : 'PENDING',
          appliedAt: app ? app.applied_at : null,
          executionTimeMs: app ? app.execution_time_ms : null,
          checksum: m.checksum.slice(0, 12)
        }
      })

      return {
        mode: 'STATUS',
        totalDiscovered: discovered.length,
        appliedCount: applied.length,
        pendingCount: pending.length,
        migrations: statusReport
      }
    }

    // 6. Handle Dry-Run Mode
    if (dryRun) {
      return {
        mode: 'DRY_RUN',
        totalDiscovered: discovered.length,
        appliedCount: applied.length,
        pendingCount: pending.length,
        pendingMigrations: pending.map((m) => ({
          version: m.version,
          name: m.name,
          checksum: m.checksum.slice(0, 12)
        }))
      }
    }

    // 7. Execute Migrations
    const executed = []
    for (const migration of pending) {
      logger.log?.(`[Migration] Applying ${migration.filename}...`)
      const result = await applyMigration(client, migration)
      executed.push(result)
      logger.log?.(`[Migration] ✓ Applied ${migration.filename} in ${result.executionTimeMs}ms`)
    }

    return {
      mode: 'EXECUTE',
      totalDiscovered: discovered.length,
      previouslyApplied: applied.length,
      executedCount: executed.length,
      executed,
      allUpToDate: pending.length === 0,
      checksumMismatches: mismatches.length
    }
  } finally {
    if (shouldCloseClient && client) {
      await client.end()
    }
  }
}

// CLI Execution Handler
if (process.argv[1] && process.argv[1].endsWith('run_migrations.mjs')) {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const status = args.includes('--status')
  const force = args.includes('--force')

  const targetArg = args.find((a) => a.startsWith('--target='))
  const target = targetArg ? targetArg.split('=')[1] : undefined

  const dirArg = args.find((a) => a.startsWith('--migrations-dir='))
  const migrationsDir = dirArg ? dirArg.split('=')[1] : undefined

  console.log('='.repeat(70))
  console.log('Floework PostgreSQL Migration Runner')
  console.log('='.repeat(70))

  runMigrations({ dryRun, status, force, target, migrationsDir })
    .then((report) => {
      if (report.mode === 'STATUS') {
        console.log(`\nDiscovered: ${report.totalDiscovered} | Applied: ${report.appliedCount} | Pending: ${report.pendingCount}\n`)
        console.table(
          report.migrations.map((m) => ({
            Version: m.version,
            Status: m.status,
            'Duration (ms)': m.executionTimeMs ?? '-',
            Checksum: m.checksum,
            'Applied At': m.appliedAt ? new Date(m.appliedAt).toLocaleString() : '-'
          }))
        )
      } else if (report.mode === 'DRY_RUN') {
        console.log(`\n[DRY RUN] Would apply ${report.pendingCount} pending migrations:`)
        for (const m of report.pendingMigrations) {
          console.log(`  - ${m.version} (${m.checksum})`)
        }
      } else {
        console.log(`\n[SUCCESS] Applied ${report.executedCount} migrations. Database is up to date.`)
      }
      process.exit(0)
    })
    .catch((err) => {
      console.error('\n[Migration Fatal Error]:', err.message)
      if (err.originalError) {
        console.error(err.originalError)
      }
      process.exit(1)
    })
}
