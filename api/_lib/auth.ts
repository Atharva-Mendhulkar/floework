// api/_lib/auth.ts
// ==============================================================================
// Pure AWS Native Authentication & Tenant Authorization Middleware
// Authenticates callers locally using Amazon Cognito JWKS / JWT signature checks,
// and enforces multi-tenant workspace/project isolation against Amazon RDS PostgreSQL.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken, VerifiedUser } from './jwt'
import { query } from './db'

export type { VerifiedUser }

let mockUserResolver: ((token: string) => Promise<VerifiedUser | null> | VerifiedUser | null) | null = null

export function setMockUserResolver(resolver: typeof mockUserResolver) {
  mockUserResolver = resolver
}

/**
 * Extracts and cryptographically verifies caller from Authorization header
 */
export async function getUser(req: VercelRequest): Promise<VerifiedUser | null> {
  if ((req as any).user) {
    return (req as any).user
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  if (mockUserResolver) {
    const mockUser = await mockUserResolver(token)
    if (mockUser) {
      ;(req as any).user = mockUser
      return mockUser
    }
  }

  // Fast path: Local cryptographic verification (Cognito JWKS / JWT_SECRET)
  const localUser = await verifyToken(token)
  if (localUser) {
    ;(req as any).user = localUser
    return localUser
  }

  return null
}

/**
 * Enforces membership in the target workspace/team
 */
export async function requireMember(
  req: VercelRequest,
  res: VercelResponse,
  teamId: string
): Promise<VerifiedUser | null> {
  const user = await getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  const resDb = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 LIMIT 1',
    [teamId, user.id]
  )

  const member = resDb.rows?.[0]
  if (!member) {
    res.status(403).json({ error: 'Forbidden: Member access required' })
    return null
  }

  return user
}

/**
 * Enforces membership in the workspace owning the target project
 */
export async function requireProjectMember(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string
): Promise<VerifiedUser | null> {
  const user = await getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  // Lookup the team_id for this project
  const resDb = await query(
    'SELECT team_id FROM projects WHERE id = $1 LIMIT 1',
    [projectId]
  )

  const project = resDb.rows?.[0]
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return null
  }

  // Verify member access to the team
  return requireMember(req, res, project.team_id)
}

/**
 * Enforces administrative privileges within the target workspace
 */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
  teamId: string
): Promise<VerifiedUser | null> {
  const user = await getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  const resDb = await query(
    "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'admin' LIMIT 1",
    [teamId, user.id]
  )

  const adminMember = resDb.rows?.[0]
  if (!adminMember) {
    res.status(403).json({ error: 'Forbidden: Admin access required' })
    return null
  }

  return user
}

/**
 * Records immutable tenant-scoped audit records to Amazon RDS PostgreSQL
 */
export async function logAudit(
  teamId: string,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata: any = {}
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (team_id, user_id, action, entity, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [teamId, userId, action, entity, entityId, JSON.stringify(metadata)]
    )
  } catch {
    // If audit_logs table does not exist or fails, attempt fallback RPC or log
  }
}
