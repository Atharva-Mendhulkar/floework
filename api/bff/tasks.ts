import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireMember } from '../_lib/auth'
import { trace } from '@opentelemetry/api'

// We configure a read replica for GET requests
const SUPABASE_READ_REPLICA_URL = process.env.SUPABASE_READ_REPLICA_URL || process.env.SUPABASE_URL!

function getReadReplicaClient() {
  return createClient(
    SUPABASE_READ_REPLICA_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getWriterClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tracer = trace.getTracer('floework-bff')
  
  if (req.method === 'GET') {
    return tracer.startActiveSpan('BFF GET /tasks', async (span) => {
      try {
        const { projectId, sprintId } = req.query
        if (!projectId) return res.status(400).json({ error: 'Project ID required' })
        
        const user = await requireMember(req, res, projectId as string)
        if (!user) return span.end()

        // Use Read Replica for GET
        const supabase = getReadReplicaClient()
        let q = supabase
          .from('tasks')
          .select('*, profiles(full_name, avatar_url), focus_sessions(count)')
          .eq('project_id', projectId as string)

        if (sprintId !== undefined && sprintId !== '') {
            if (sprintId === 'null' || sprintId === null) {
                q = q.is('sprint_id', null);
            } else {
                q = q.eq('sprint_id', sprintId as string);
            }
        }

        const { data, error } = await q.order('created_at', { ascending: false })

        if (error) {
          res.status(500).json({ error: error.message })
          return span.end()
        }

        // Orchestrate second call for starred tasks
        const { data: starredData } = await supabase
            .from('starred_tasks')
            .select('task_id')
            .eq('user_id', user.id);
        
        const starredIds = new Set(starredData?.map(s => s.task_id) || []);

        const enrichedData = (data || []).map(t => ({
            ...t,
            is_starred: starredIds.has(t.id)
        }))

        res.status(200).json(enrichedData)
        span.end()
      } catch (e) {
        span.recordException(e as Error)
        span.end()
        res.status(500).json({ error: 'Internal Server Error' })
      }
    })
  }

  // Forward POST, PATCH, DELETE to writer client...
  // In a full implementation we would duplicate/proxy the logic from api/tasks/index.ts
  // or simply have api/tasks/index.ts BE the writer and this BFF calls it.
  
  res.status(405).json({ error: 'Method not allowed' })
}
