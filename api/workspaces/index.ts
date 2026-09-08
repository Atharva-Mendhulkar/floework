// api/workspaces/index.ts
// ==============================================================================
// Amazon RDS PostgreSQL Native Workspaces API
// Manages multi-tenant workspace provisioning, membership binding, and deletion.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBody, WorkspaceCreateSchema } from '../_lib/validate'
import { getUser, requireMember, requireAdmin, logAudit } from '../_lib/auth'
import { rateLimit } from '../_lib/rateLimit'
import { query, withTransaction } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query

  // 1. Create Workspace (POST)
  if (req.method === 'POST') {
    const validatedBody = validateBody(req, res, WorkspaceCreateSchema)
    if (!validatedBody) return

    const { name } = validatedBody
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`

    const team = await withTransaction(async (client) => {
      const teamRes = await client.query(
        'INSERT INTO teams (name, slug, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
        [name, slug]
      )
      const newTeam = teamRes.rows[0]

      // Add creator as ADMIN
      await client.query(
        "INSERT INTO team_members (team_id, user_id, role, created_at) VALUES ($1, $2, 'admin', NOW())",
        [newTeam.id, user.id]
      )

      // Provision default starter project
      await client.query(
        "INSERT INTO projects (team_id, name, sprint_name, created_at, updated_at) VALUES ($1, 'Core Platform', 'Sprint 1', NOW(), NOW())",
        [newTeam.id]
      )

      return newTeam
    })

    await logAudit(team.id, user.id, 'WORKSPACE_CREATE', 'teams', team.id, { name, slug })
    return res.status(201).json(team)
  }

  // 2. Get Workspace Details (GET)
  if (req.method === 'GET') {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    if (id) {
      if (!(await requireMember(req, res, id as string))) return

      const dbRes = await query('SELECT * FROM teams WHERE id = $1 LIMIT 1', [id])
      const team = dbRes.rows?.[0]
      if (!team) return res.status(404).json({ error: 'Workspace not found' })
      return res.status(200).json(team)
    }

    // List all workspaces for authenticated caller
    const listRes = await query(
      `SELECT t.*, tm.role
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at ASC`,
      [user.id]
    )
    return res.status(200).json(listRes.rows || [])
  }

  // 3. Delete Workspace (ADMIN only - DELETE)
  if (req.method === 'DELETE') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 5 })) return
    if (!id) return res.status(400).json({ error: 'Workspace ID required' })

    const user = await requireAdmin(req, res, id as string)
    if (!user) return

    const delRes = await query('DELETE FROM teams WHERE id = $1 RETURNING id', [id])
    if (delRes.rowCount === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    await logAudit(id as string, user.id, 'WORKSPACE_DELETE', 'teams', id as string)
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
