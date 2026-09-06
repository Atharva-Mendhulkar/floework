import { createClient, User } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

import { verifyToken } from './jwt'

export async function getUser(req: VercelRequest): Promise<User | null> {
  if ((req as any).user) {
    return (req as any).user
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  // 1. Fast path: Local cryptographic verification (Cognito JWKS / JWT_SECRET)
  const localUser = await verifyToken(token)
  if (localUser) {
    ;(req as any).user = localUser
    return localUser
  }

  // 2. Fallback path: Remote verification via Supabase Admin (for legacy sessions)
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    ;(req as any).user = user
    return user
  } catch {
    return null
  }
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

export async function requireProjectMember(req: VercelRequest, res: VercelResponse, projectId: string): Promise<User | null> {
  const user = await getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  // Lookup the teamId for this project
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('team_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    res.status(404).json({ error: 'Project not found' })
    return null
  }

  // Now verify member access to the team
  return requireMember(req, res, project.team_id)
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
