// api/bff/tasks.ts
// ==============================================================================
// Backend-For-Frontend (BFF) Tasks Aggregation Endpoint
// Queries Amazon RDS PostgreSQL, orchestrates task records with profile details,
// focus metrics, and caller-specific starred indicators.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUser } from '../_lib/auth'
import { trace } from '@opentelemetry/api'
import { query } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tracer = trace.getTracer('floework-bff')

  if (req.method === 'GET') {
    return tracer.startActiveSpan('BFF GET /tasks', async (span) => {
      try {
        const { projectId, sprintId } = req.query

        const user = await getUser(req)
        if (!user) {
          res.status(401).json({ error: 'Unauthorized' })
          return span.end()
        }

        const conditions: string[] = []
        const values: any[] = []
        let paramIdx = 1

        if (projectId && projectId !== 'fallback-id') {
          conditions.push(`t.project_id = $${paramIdx++}`)
          values.push(projectId)
        }

        if (sprintId !== undefined && sprintId !== '') {
          if (sprintId === 'null' || sprintId === null) {
            conditions.push('t.sprint_id IS NULL')
          } else {
            conditions.push(`t.sprint_id = $${paramIdx++}`)
            values.push(sprintId)
          }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        const sql = `
          SELECT t.*,
            p.full_name AS assignee_name,
            p.avatar_url AS assignee_avatar_url,
            COALESCE((SELECT COUNT(*)::int FROM focus_sessions fs WHERE fs.task_id = t.id), 0) AS focus_count
          FROM tasks t
          LEFT JOIN profiles p ON t.assignee_id = p.id
          ${whereClause}
          ORDER BY t.created_at DESC
        `

        const tasksRes = await query(sql, values)
        const tasks = tasksRes.rows || []

        // Query user's starred tasks for fast in-memory decoration
        let starredIds = new Set<string>()
        try {
          const starredRes = await query(
            'SELECT task_id FROM starred_tasks WHERE user_id = $1',
            [user.id]
          )
          starredIds = new Set((starredRes.rows || []).map((s: any) => s.task_id))
        } catch {
          // starred_tasks table optional
        }

        const enriched = tasks.map((t: any) => ({
          ...t,
          is_starred: starredIds.has(t.id)
        }))

        res.status(200).json(enriched)
        span.end()
      } catch (e: any) {
        span.recordException(e)
        span.end()
        res.status(500).json({ error: 'Internal Server Error' })
      }
    })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
