import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

function getSupabase(req: VercelRequest) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  return supabase
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { projectId } = req.query
    const supabase = getSupabase(req)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles(full_name, avatar_url), focus_sessions(count)')
      .eq('project_id', projectId as string)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const supabase = getSupabase(req)
    const { data, error } = await supabase
      .from('tasks')
      .insert(req.body)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
