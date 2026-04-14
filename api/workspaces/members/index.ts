import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id: workspaceId, userId } = req.query

  if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' })

  // 1. List Members
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(full_name, avatar_url)')
      .eq('team_id', workspaceId as string)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // 2. Update Member Role (Admin Only)
  if (req.method === 'PATCH') {
    if (!userId) return res.status(400).json({ error: 'User ID required' })
    const { role } = req.body

    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .match({ team_id: workspaceId, user_id: userId })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  // 3. Remove Member (Admin Only)
  if (req.method === 'DELETE') {
    if (!userId) return res.status(400).json({ error: 'User ID required' })

    const { error } = await supabase
      .from('team_members')
      .delete()
      .match({ team_id: workspaceId, user_id: userId })

    if (error) return res.status(400).json({ error: error.message })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
