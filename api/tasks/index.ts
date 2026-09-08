// api/tasks/index.ts
// ==============================================================================
// Amazon RDS PostgreSQL Native Tasks API
// Supports tenant-scoped task queries, idempotent creation, and strict
// OCC version-checked updates with conflict auditing.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { trace } from '@opentelemetry/api'
import { v4 as uuidv4 } from 'uuid'
import { redis } from '../_lib/redis'
import { validateBody, TaskCreateSchema } from '../_lib/validate'
import { requireProjectMember } from '../_lib/auth'
import { query } from '../_lib/db'

async function simulateLatencyAndFailure(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') return false

  // Simulation mode (Header-Based for Chaos Testing)
  const simDelay = req.headers['x-sim-delay']
  const simFail = req.headers['x-sim-fail']
  const simStorm = req.headers['x-sim-storm']

  if (simStorm === 'true') {
    const randomDelay = Math.floor(Math.random() * 2000)
    await new Promise((r) => setTimeout(r, randomDelay))
  } else if (simDelay) {
    const delay = parseInt(simDelay as string, 10)
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
  }

  if (simFail === 'true' && Math.random() < 0.2) {
    res.status(500).json({ error: 'Simulated API Failure' })
    return true
  }
  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tracer = trace.getTracer('floework-api')
  const requestId = uuidv4()
  res.setHeader('X-Request-ID', requestId)

  if (await simulateLatencyAndFailure(req, res)) return

  // 1. GET /api/tasks
  if (req.method === 'GET') {
    return tracer.startActiveSpan('GET /api/tasks', async (span) => {
      try {
        const { projectId } = req.query
        if (!projectId) {
          res.status(400).json({ error: 'Project ID required', requestId })
          return span.end()
        }

        if (!(await requireProjectMember(req, res, projectId as string))) {
          return span.end()
        }

        const sql = `
          SELECT t.*,
            p.full_name AS assignee_name,
            p.avatar_url AS assignee_avatar_url,
            COALESCE((SELECT COUNT(*)::int FROM focus_sessions fs WHERE fs.task_id = t.id), 0) AS focus_count
          FROM tasks t
          LEFT JOIN profiles p ON t.assignee_id = p.id
          WHERE t.project_id = $1
          ORDER BY t.created_at DESC
        `
        const dbRes = await query(sql, [projectId])

        res.status(200).json(dbRes.rows || [])
        span.end()
      } catch (e: any) {
        span.recordException(e)
        span.end()
        res.status(500).json({ error: e.message, requestId })
      }
    })
  }

  // 2. POST /api/tasks
  if (req.method === 'POST') {
    return tracer.startActiveSpan('POST /api/tasks', async (span) => {
      try {
        const validatedBody = validateBody(req, res, TaskCreateSchema)
        if (!validatedBody) return span.end()

        if (!(await requireProjectMember(req, res, validatedBody.project_id))) {
          return span.end()
        }

        const idempotencyKey = req.headers['x-idempotency-key'] as string
        if (idempotencyKey) {
          const cachedResponse = await redis.get(`idempotency:task:${idempotencyKey}`)
          if (cachedResponse) {
            res
              .status(201)
              .json(typeof cachedResponse === 'string' ? JSON.parse(cachedResponse) : cachedResponse)
            return span.end()
          }
        }

        const insertSql = `
          INSERT INTO tasks (
            title, description, project_id, status, priority, due_date, assignee_id, sprint_id, version, created_at, updated_at
          )
          VALUES ($1, $2, $3, COALESCE($4, 'backlog'), COALESCE($5, 'M'), $6, $7, $8, 1, NOW(), NOW())
          RETURNING *
        `
        const values = [
          validatedBody.title,
          validatedBody.description || null,
          validatedBody.project_id,
          validatedBody.status || 'backlog',
          validatedBody.priority || 'M',
          validatedBody.due_date || null,
          validatedBody.assignee_id || null,
          validatedBody.sprint_id || null
        ]

        const dbRes = await query(insertSql, values)
        const newTask = dbRes.rows?.[0]

        if (idempotencyKey && newTask) {
          await redis.setex(`idempotency:task:${idempotencyKey}`, 86400, JSON.stringify(newTask))
        }

        res.status(201).json(newTask)
        span.end()
      } catch (e: any) {
        span.recordException(e)
        span.end()
        res.status(500).json({ error: e.message, requestId })
      }
    })
  }

  // 3. PATCH /api/tasks
  if (req.method === 'PATCH') {
    return tracer.startActiveSpan('PATCH /api/tasks', async (span) => {
      try {
        const { id, version: clientVersion, ...updateData } = req.body || {}
        if (!id) {
          res.status(400).json({ error: 'Task ID required', requestId })
          return span.end()
        }

        // 1. Enforce Authentication & Project Membership (SEC-01)
        const existingRes = await query(
          'SELECT id, project_id, version FROM tasks WHERE id = $1 LIMIT 1',
          [id]
        )
        const existingTask = existingRes.rows?.[0]

        if (!existingTask) {
          res.status(404).json({ error: 'Task not found', requestId })
          return span.end()
        }

        const user = await requireProjectMember(req, res, existingTask.project_id)
        if (!user) return span.end()

        // 2. Strict Version-Based OCC
        const updateFields: string[] = []
        const updateValues: any[] = []
        let paramIdx = 1

        const allowedCols = ['title', 'description', 'status', 'priority', 'due_date', 'assignee_id', 'sprint_id']
        for (const col of allowedCols) {
          if (updateData[col] !== undefined) {
            updateFields.push(`${col} = $${paramIdx++}`)
            updateValues.push(updateData[col])
          }
        }

        updateFields.push('version = version + 1')
        updateFields.push('updated_at = NOW()')

        updateValues.push(id)
        const idParamIdx = paramIdx++

        let updateSql = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${idParamIdx}`

        if (clientVersion !== undefined) {
          updateValues.push(clientVersion)
          updateSql += ` AND version = $${paramIdx++}`
        }

        updateSql += ' RETURNING *'

        const updateRes = await query(updateSql, updateValues)
        const updatedTask = updateRes.rows?.[0]

        if (!updatedTask) {
          // Version conflict or concurrently deleted
          const currentRes = await query('SELECT version FROM tasks WHERE id = $1 LIMIT 1', [id])
          const currentTask = currentRes.rows?.[0]

          const projectRes = await query(
            'SELECT team_id FROM projects WHERE id = $1 LIMIT 1',
            [existingTask.project_id]
          )
          const project = projectRes.rows?.[0]

          await query(
            `INSERT INTO concurrency_conflicts (
              entity_type, entity_id, team_id, client_version, server_version, user_id, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              'task',
              id,
              project?.team_id || null,
              clientVersion,
              currentTask?.version,
              user.id,
              JSON.stringify({
                endpoint: 'PATCH /api/tasks',
                method: req.method,
                detected_at: new Date().toISOString()
              })
            ]
          )

          return res.status(409).json({
            error: 'STALE_UPDATE',
            message: 'Conflict detected: Task was modified by another client.',
            serverVersion: currentTask?.version,
            currentTask,
            requestId
          })
        }

        res.status(200).json(updatedTask)
        span.end()
      } catch (e: any) {
        span.recordException(e)
        span.end()
        res.status(500).json({ error: e.message, requestId })
      }
    })
  }

  res.status(405).json({ error: 'Method not allowed', requestId })
}
