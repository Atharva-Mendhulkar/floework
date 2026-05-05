import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { validateBody, TaskCreateSchema } from '../lib/validate'
import { requireMember } from '../lib/auth'

async function simulateLatencyAndFailure(req: VercelRequest, res: VercelResponse) {
  if (process.env.NODE_ENV === 'production') return false;

  // --- SIMULATION MODE (HEADER-BASED) ---
  const simDelay = req.headers['x-sim-delay'];
  const simFail = req.headers['x-sim-fail'];
  const simStorm = req.headers['x-sim-storm']; // Storm Mode: Variable Latency
  
  if (simStorm === 'true') {
    const randomDelay = Math.floor(Math.random() * 2000);
    await new Promise(r => setTimeout(r, randomDelay));
  } else if (simDelay) {
    const delay = parseInt(simDelay as string);
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
  }
  
  if (simFail === 'true' && Math.random() < 0.2) {
    res.status(500).json({ error: 'Simulated API Failure' });
    return true; 
  }
  return false;
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (await simulateLatencyAndFailure(req, res)) return

  if (req.method === 'GET') {
    const { projectId } = req.query
    if (!projectId) return res.status(400).json({ error: 'Project ID required' })
    
    if (!await requireMember(req, res, projectId as string)) return

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles(full_name, avatar_url), focus_sessions(count)')
      .eq('project_id', projectId as string)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const validatedBody = validateBody(req, res, TaskCreateSchema)
    if (!validatedBody) return // validateBody already sent response

    if (!await requireMember(req, res, validatedBody.project_id)) return

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tasks')
      .insert(validatedBody)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'PATCH') {
    const { id, version: clientVersion, ...updateData } = req.body
    if (!id) return res.status(400).json({ error: 'Task ID required' })

    const supabase = getSupabase()
    
    // 2.1 Enforce Strict Version-Based OCC
    const query = supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id);

    if (clientVersion !== undefined) {
      query.eq('version', clientVersion);
    }

    const { data, error } = await query.select().single();

    if (error) {
      // 2.2 Handle stale update
      if (error.code === 'PGRST116') { // No rows returned due to version mismatch
        // 4.0 Log conflict with enriched context
        const { data: currentTask } = await supabase.from('tasks').select('version').eq('id', id).single();
        
        await supabase.from('concurrency_conflicts').insert({
          entity_type: 'task',
          entity_id: id,
          client_version: clientVersion,
          server_version: currentTask?.version,
          user_id: (req as any).user?.id,
          metadata: { 
            endpoint: 'PATCH /api/tasks', 
            method: req.method,
            detected_at: new Date().toISOString()
          }
        });

        return res.status(409).json({ 
          error: 'STALE_UPDATE', 
          message: 'Conflict detected: Task was modified by another client.',
          serverVersion: currentTask?.version,
          currentTask: currentTask
        });
      }
      return res.status(400).json({ error: error.message })
    }
    return res.status(200).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
