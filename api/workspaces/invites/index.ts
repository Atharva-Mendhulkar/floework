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
  const { token } = req.query

  // 1. Create Invite (POST - Admin Only)
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

  // 2. Accept Invite (PUT)
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

  return res.status(405).json({ error: 'Method not allowed' })
}
