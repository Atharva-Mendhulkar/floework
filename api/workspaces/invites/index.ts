import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id: workspaceId, token } = req.query

  // 1. Create Invite (Admin Only)
  if (req.method === 'POST') {
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' })
    const { email, role } = req.body
    
    // Generate secure token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    const { data, error } = await supabase
      .from('team_invitations')
      .insert({ team_id: workspaceId, email, role: role || 'member', token })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(201).json(data)
  }

  // 2. Accept Invite
  if (req.method === 'PUT') {
    if (!token) return res.status(400).json({ error: 'Token required' })
    const user = (await supabase.auth.getUser(req.headers.authorization?.split(' ')[1] || '')).data.user
    
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

    return res.status(200).json({ success: true, teamId: invite.team_id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
