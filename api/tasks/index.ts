import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { trace } from '@opentelemetry/api'
import { v4 as uuidv4 } from 'uuid'
import { redis } from '../lib/redis'

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
  const tracer = trace.getTracer('floework-api')
  const requestId = uuidv4()
  res.setHeader('X-Request-ID', requestId)

  if (await simulateLatencyAndFailure(req, res)) return

  if (req.method === 'GET') {
    return tracer.startActiveSpan('GET /api/tasks', async (span) => {
      try {
        const { projectId } = req.query
        if (!projectId) {
          res.status(400).json({ error: 'Project ID required', requestId })
          return span.end()
        }
        
        if (!await requireMember(req, res, projectId as string)) return span.end()

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles(full_name, avatar_url), focus_sessions(count)')
      .eq('project_id', projectId as string)
      .order('created_at', { ascending: false })

      if (error) {
        res.status(500).json({ error: error.message, requestId })
        return span.end()
      }
      res.status(200).json(data)
      span.end()
    } catch (e) {
      span.recordException(e as Error)
      span.end()
      throw e
    }
    })
  }

  if (req.method === 'POST') {
    return tracer.startActiveSpan('POST /api/tasks', async (span) => {
      try {
        const validatedBody = validateBody(req, res, TaskCreateSchema)
        if (!validatedBody) return span.end() // validateBody already sent response

    if (!await requireMember(req, res, validatedBody.project_id)) return

    const idempotencyKey = req.headers['x-idempotency-key'] as string
    if (idempotencyKey) {
      const cachedResponse = await redis.get(`idempotency:task:${idempotencyKey}`)
      if (cachedResponse) {
        res.status(201).json(typeof cachedResponse === 'string' ? JSON.parse(cachedResponse) : cachedResponse)
        return span.end()
      }
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tasks')
      .insert(validatedBody)
      .select()
      .single()

      if (error) {
        res.status(400).json({ error: error.message, requestId })
        return span.end()
      }

      if (idempotencyKey) {
        // Cache response for 24 hours
        await redis.setex(`idempotency:task:${idempotencyKey}`, 86400, JSON.stringify(data))
      }

      res.status(201).json(data)
      span.end()
    } catch (e) {
      span.recordException(e as Error)
      span.end()
      throw e
    }
    })
  }

  if (req.method === 'PATCH') {
    return tracer.startActiveSpan('PATCH /api/tasks', async (span) => {
      try {
        const { id, version: clientVersion, ...updateData } = req.body
        if (!id) {
          res.status(400).json({ error: 'Task ID required', requestId })
          return span.end()
        }

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
            currentTask: currentTask,
            requestId
          });
        }
        res.status(400).json({ error: error.message, requestId })
        return span.end()
      }
      res.status(200).json(data)
      span.end()
    } catch (e) {
      span.recordException(e as Error)
      span.end()
      throw e
    }
    })
  }

  res.status(405).json({ error: 'Method not allowed', requestId })
}
