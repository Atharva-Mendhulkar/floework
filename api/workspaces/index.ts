import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { validateBody, WorkspaceCreateSchema } from '../lib/validate'
import { getUser, requireMember, requireAdmin, logAudit } from '../lib/auth'
import { rateLimit } from '../lib/rateLimit'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query

  // 1. Create Workspace
  if (req.method === 'POST') {
    const validatedBody = validateBody(req, res, WorkspaceCreateSchema)
    if (!validatedBody) return

    const { name } = validatedBody
    const user = await getUser(req)
    
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`
    
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({ name, slug })
      .select()
      .single()

    if (teamErr) return res.status(400).json({ error: teamErr.message })

    // Add creator as ADMIN
    await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'admin' })

    return res.status(201).json(team)
  }

  // 2. Get Workspace Details
  if (req.method === 'GET') {
    if (!id) return res.status(400).json({ error: 'Workspace ID required' })
    
    if (!await requireMember(req, res, id as string)) return

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id as string)
      .single()

    if (error) return res.status(404).json({ error: 'Workspace not found' })
    return res.status(200).json(data)
  }

  // 3. Delete Workspace (ADMIN only)
  if (req.method === 'DELETE') {
    if (!rateLimit(req, res, { windowMs: 60000, max: 5 })) return
    if (!id) return res.status(400).json({ error: 'Workspace ID required' })
    
    const user = await requireAdmin(req, res, id as string)
    if (!user) return

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id as string)

    if (error) return res.status(400).json({ error: error.message })

    await logAudit(id as string, user.id, 'WORKSPACE_DELETE', 'teams', id as string)

    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
