// api/workspaces/members/index.ts
// ==============================================================================
// Amazon RDS PostgreSQL Native Workspace Members API
// Lists members with joined profile details, updates member roles, and removes members.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateBody, MemberUpdateSchema } from '../../_lib/validate'
import { requireMember, requireAdmin, logAudit } from '../../_lib/auth'
import { rateLimit } from '../../_lib/rateLimit'
import { query } from '../../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id: workspaceId, userId } = req.query

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID required' })
  }

  // 1. List Members (GET)
  if (req.method === 'GET') {
    if (!(await requireMember(req, res, workspaceId as string))) return

    const membersRes = await query(
      `SELECT tm.*, p.full_name, p.avatar_url, p.email
       FROM team_members tm
       LEFT JOIN profiles p ON tm.user_id = p.id
       WHERE tm.team_id = $1
       ORDER BY tm.created_at ASC`,
      [workspaceId as string]
    )

    return res.status(200).json(membersRes.rows || [])
  }

  // 2. Update Member Role (PATCH - Admin Only)
  if (req.method === 'PATCH') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 20 })) return
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const adminUser = await requireAdmin(req, res, workspaceId as string)
    if (!adminUser) return

    const validatedBody = validateBody(req, res, MemberUpdateSchema)
    if (!validatedBody) return

    const { role } = validatedBody

    const updateRes = await query(
      `UPDATE team_members
       SET role = $1
       WHERE team_id = $2 AND user_id = $3
       RETURNING *`,
      [role, workspaceId as string, userId as string]
    )

    const updatedMember = updateRes.rows?.[0]
    if (!updatedMember) {
      return res.status(404).json({ error: 'Member not found' })
    }

    await logAudit(
      workspaceId as string,
      adminUser.id,
      'MEMBER_ROLE_UPDATE',
      'team_members',
      userId as string,
      { role, workspaceId }
    )

    return res.status(200).json(updatedMember)
  }

  // 3. Remove Member (DELETE - Admin Only)
  if (req.method === 'DELETE') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 20 })) return
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const adminUser = await requireAdmin(req, res, workspaceId as string)
    if (!adminUser) return

    const deleteRes = await query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING user_id',
      [workspaceId as string, userId as string]
    )

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    await logAudit(
      workspaceId as string,
      adminUser.id,
      'MEMBER_REMOVE',
      'team_members',
      userId as string,
      { workspaceId }
    )

    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
