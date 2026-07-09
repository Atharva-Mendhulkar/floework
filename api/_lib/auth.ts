import { createClient, User } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

export async function getUser(req: VercelRequest): Promise<User | null> {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function requireMember(req: VercelRequest, res: VercelResponse, teamId: string): Promise<User | null> {
  const user = await getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    res.status(403).json({ error: 'Forbidden: Member access required' })
    return null
  }

  return user
}

export async function requireAdmin(req: VercelRequest, res: VercelResponse, teamId: string): Promise<User | null> {
  const user = await getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (error || !data) {
    res.status(403).json({ error: 'Forbidden: Admin access required' })
    return null
  }

  return user
}

export async function logAudit(teamId: string, userId: string, action: string, entity: string, entityId: string, metadata: any = {}) {
  await supabaseAdmin.rpc('log_audit_event', {
    p_team_id: teamId,
    p_user_id: userId,
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId,
    p_metadata: metadata
  })
}
