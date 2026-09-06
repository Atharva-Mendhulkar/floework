import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { validateBody, MemberUpdateSchema } from '../../_lib/validate'
import { requireMember, requireAdmin, logAudit } from '../../_lib/auth'
import { rateLimit } from '../../_lib/rateLimit'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id: workspaceId, userId } = req.query

  if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' })

  // 1. List Members
  if (req.method === 'GET') {
    if (!await requireMember(req, res, workspaceId as string)) return

    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(full_name, avatar_url)')
      .eq('team_id', workspaceId as string)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // 2. Update Member Role (Admin Only)
  if (req.method === 'PATCH') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 20 })) return
    if (!userId) return res.status(400).json({ error: 'User ID required' })
    
    const adminUser = await requireAdmin(req, res, workspaceId as string)
    if (!adminUser) return

    const validatedBody = validateBody(req, res, MemberUpdateSchema)
    if (!validatedBody) return

    const { role } = validatedBody

    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .match({ team_id: workspaceId, user_id: userId })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    await logAudit(workspaceId as string, adminUser.id, 'MEMBER_ROLE_UPDATE', 'team_members', userId as string, { role, workspaceId })

    return res.status(200).json(data)
  }

  // 3. Remove Member (Admin Only)
  if (req.method === 'DELETE') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 20 })) return
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const adminUser = await requireAdmin(req, res, workspaceId as string)
    if (!adminUser) return

    const { error } = await supabase
      .from('team_members')
      .delete()
      .match({ team_id: workspaceId, user_id: userId })

    if (error) return res.status(400).json({ error: error.message })

    await logAudit(workspaceId as string, adminUser.id, 'MEMBER_REMOVE', 'team_members', userId as string, { workspaceId })

    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
