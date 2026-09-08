// api/_lib/db.ts
// ==============================================================================
// Native Amazon RDS PostgreSQL 16 Connection Pool & Query Executor
// Provides connection pooling, parameterized queries, transaction helpers,
// and hermetic mocking hooks for isolated unit/integration tests.
// ==============================================================================

import pg from 'pg'
import { logger } from './logger'

const { Pool } = pg

let pool: pg.Pool | null = null

// Optional mock query handler for hermetic unit testing
type MockQueryHandler = (text: string, params?: any[]) => Promise<any>
let mockQueryHandler: MockQueryHandler | null = null

export function setMockQueryHandler(handler: MockQueryHandler | null): void {
  mockQueryHandler = handler
}

export function getPool(): pg.Pool {
  if (pool) return pool

  const connectionString =
    process.env.DATABASE_URL ||
    (process.env.PGHOST
      ? `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'floework'}`
      : undefined)

  const isTest = process.env.NODE_ENV === 'test'
  const isSslDisabled = process.env.DB_SSL === 'false' || isTest

  pool = new Pool({
    connectionString,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isSslDisabled ? false : { rejectUnauthorized: false }
  })

  pool.on('error', (err) => {
    logger.error('[PostgreSQL Pool Error]', err)
  })

  return pool
}

/**
 * Executes a parameterized SQL query against the RDS PostgreSQL pool
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  if (mockQueryHandler) {
    const result = await mockQueryHandler(text, params)
    if (result && typeof result === 'object' && 'rows' in result) {
      return result
    }
    return {
      rows: Array.isArray(result) ? result : result ? [result] : [],
      rowCount: Array.isArray(result) ? result.length : result ? 1 : 0,
      command: 'SELECT',
      oid: 0,
      fields: []
    }
  }

  const start = Date.now()
  const p = getPool()
  const res = await p.query<T>(text, params)
  const duration = Date.now() - start

  if (duration > 1000) {
    logger.warn(`[Slow Query] ${text.slice(0, 100)}... took ${duration}ms`)
  }

  return res
}

/**
 * Executes operations inside an isolated database transaction
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  if (mockQueryHandler) {
    // In mock mode, emulate client queries
    const mockClient = {
      query: (text: string, params?: any[]) => query(text, params),
      release: () => {}
    } as unknown as pg.PoolClient
    return callback(mockClient)
  }

  const p = getPool()
  const client = await p.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Gracefully closes all pool connections
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
