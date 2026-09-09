// api/workspaces/invites/index.ts
// ==============================================================================
// Amazon RDS PostgreSQL & Amazon SES Workspace Invitations API
// Generates 256-bit cryptographically secure invitation tokens, records them in RDS,
// and dispatches transactional invitation emails via Amazon SES.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes } from 'crypto'
import { validateBody, InviteSchema } from '../../_lib/validate'
import { getUser, requireAdmin, logAudit } from '../../_lib/auth'
import { rateLimit } from '../../_lib/rateLimit'
import { sendWorkspaceInviteEmail } from '../../_lib/ses'
import { query, withTransaction } from '../../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token, teamId } = req.query

  // 1. Fetch Invite / Pending Invites (GET)
  if (req.method === 'GET') {
    // A. Validate single token (for /join landing page)
    if (token) {
      const inviteRes = await query(
        `SELECT ti.id, ti.team_id, ti.email, ti.role, ti.token, ti.expires_at, ti.created_at, t.name as team_name
         FROM team_invitations ti
         LEFT JOIN teams t ON ti.team_id = t.id
         WHERE ti.token = $1 LIMIT 1`,
        [token as string]
      )
      const invite = inviteRes.rows?.[0]
      if (!invite) {
        return res.status(404).json({ error: 'Invitation not found or expired' })
      }
      const isExpired = new Date(invite.expires_at) < new Date()
      return res.status(200).json({
        valid: !isExpired,
        invite: {
          id: invite.id,
          teamId: invite.team_id,
          teamName: invite.team_name || 'Workspace',
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expires_at,
          isExpired
        }
      })
    }

    // B. List pending invites for a team (Admin)
    if (teamId) {
      const adminUser = await requireAdmin(req, res, teamId as string)
      if (!adminUser) return

      const listRes = await query(
        `SELECT id, team_id, email, role, token, expires_at, created_at
         FROM team_invitations
         WHERE team_id = $1
         ORDER BY created_at DESC`,
        [teamId as string]
      )
      return res.status(200).json({ invites: listRes.rows || [] })
    }

    return res.status(400).json({ error: 'token or teamId query parameter required' })
  }

  // 2. Create Invite (POST - Admin Only)
  if (req.method === 'POST') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 10 })) return
    const validatedBody = validateBody(req, res, InviteSchema)
    if (!validatedBody) return

    const { email, role, team_id } = validatedBody

    const adminUser = await requireAdmin(req, res, team_id)
    if (!adminUser) return

    // Generate secure token (SEC-06: cryptographically secure 256-bit entropy)
    const inviteToken = randomBytes(32).toString('hex')

    const insertRes = await query(
      `INSERT INTO team_invitations (team_id, email, role, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', NOW())
       RETURNING *`,
      [team_id, email, role || 'member', inviteToken]
    )
    const newInvite = insertRes.rows?.[0]

    await logAudit(team_id, adminUser.id, 'INVITE_SEND', 'team_invitations', newInvite.id, {
      email,
      team_id
    })

    // Dispatch transactional email via Amazon SES
    try {
      await sendWorkspaceInviteEmail({
        to: email,
        inviterName: adminUser.email || 'Team Administrator',
        teamName: 'Floework Workspace',
        inviteToken
      })
    } catch (err: any) {
      console.error('[SES Dispatch Warning] Failed to dispatch invite email:', err.message)
    }

    return res.status(201).json(newInvite)
  }

  // 3. Accept Invite (PUT)
  if (req.method === 'PUT') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 30 })) return
    if (!token) return res.status(400).json({ error: 'Token required' })
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const inviteRes = await query(
      'SELECT * FROM team_invitations WHERE token = $1 LIMIT 1',
      [token as string]
    )
    const invite = inviteRes.rows?.[0]

    if (!invite) {
      return res.status(404).json({ error: 'Invalid or expired invitation' })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation expired' })
    }

    // Add member and remove invitation
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [invite.team_id, user.id, invite.role]
      )

      await client.query('DELETE FROM team_invitations WHERE id = $1', [invite.id])
    })

    await logAudit(invite.team_id, user.id, 'INVITE_ACCEPT', 'team_members', user.id, {
      team_id: invite.team_id
    })

    return res.status(200).json({ success: true, teamId: invite.team_id })
  }

  // 4. Revoke Invite (DELETE - Admin Only)
  if (req.method === 'DELETE') {
    const { id, teamId } = req.body || {}
    if (!id || !teamId) {
      return res.status(400).json({ error: 'Missing required fields: id, teamId' })
    }

    const adminUser = await requireAdmin(req, res, teamId)
    if (!adminUser) return

    const deleteRes = await query(
      'DELETE FROM team_invitations WHERE id = $1 AND team_id = $2 RETURNING id',
      [id, teamId]
    )

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    await logAudit(teamId, adminUser.id, 'INVITE_REVOKE', 'team_invitations', id, { teamId })
    return res.status(200).json({ success: true, deletedId: id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
