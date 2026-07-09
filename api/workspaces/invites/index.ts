import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { validateBody, InviteSchema } from '../../_lib/validate'
import { getUser, requireAdmin, logAudit } from '../../_lib/auth'
import { rateLimit } from '../../_lib/rateLimit'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id: workspaceId, token } = req.query

  // 1. Create Invite (Admin Only)
  if (req.method === 'POST') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 10 })) return
    const validatedBody = validateBody(req, res, InviteSchema)
    if (!validatedBody) return

    const { email, role, team_id } = validatedBody
    
    const adminUser = await requireAdmin(req, res, team_id)
    if (!adminUser) return

    // Generate secure token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    const { data, error } = await supabase
      .from('team_invitations')
      .insert({ team_id, email, role: role || 'member', token })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    await logAudit(team_id, adminUser.id, 'INVITE_SEND', 'team_invitations', data.id, { email, team_id })

    return res.status(201).json(data)
  }

  // 2. Accept Invite
  if (req.method === 'PUT') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 30 })) return
    if (!token) return res.status(400).json({ error: 'Token required' })
    const user = await getUser(req)
    
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    // Find invite
    const { data: invite, error: inviteErr } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token as string)
      .single()

    if (inviteErr || !invite) return res.status(404).json({ error: 'Invalid or expired invitation' })

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
       return res.status(410).json({ error: 'Invitation expired' })
    }

    // Add member
    const { error: memberErr } = await supabase
      .from('team_members')
      .insert({ team_id: invite.team_id, user_id: user.id, role: invite.role })

    if (memberErr) return res.status(400).json({ error: memberErr.message })

    // Cleanup
    await supabase.from('team_invitations').delete().eq('id', invite.id)

    await logAudit(invite.team_id, user.id, 'INVITE_ACCEPT', 'team_members', user.id, { team_id: invite.team_id })

    return res.status(200).json({ success: true, teamId: invite.team_id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
