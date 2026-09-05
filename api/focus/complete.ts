import type { VercelRequest, VercelResponse } from '@vercel/node'
import { publishEvent } from '../_lib/kafka'
import { trace } from '@opentelemetry/api'
import { getUser, requireProjectMember } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const tracer = trace.getTracer('floework-api')
  
  return tracer.startActiveSpan('POST /api/focus/complete', async (span) => {
    try {
      // 1. Mandate authentication (SEC-03)
      const user = await getUser(req)
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return span.end()
      }

      const { userId, durationSecs, projectId } = req.body

      if (!durationSecs) {
        res.status(400).json({ error: 'Missing required fields' })
        return span.end()
      }

      // Enforce caller identity match (prevent user spoofing)
      const targetUserId = user.id
      if (userId && userId !== user.id) {
        res.status(403).json({ error: 'Forbidden: Cannot complete focus session for another user' })
        return span.end()
      }

      // If projectId is specified, ensure user belongs to the project
      if (projectId) {
        if (!await requireProjectMember(req, res, projectId)) {
          return span.end()
        }
      }

      // Publish to Kafka topic instead of synchronously calculating stability
      await publishEvent('focus.events', targetUserId, {
        type: 'FOCUS_SESSION_COMPLETED',
        userId: targetUserId,
        projectId,
        durationSecs,
        timestamp: new Date().toISOString()
      })

      res.status(202).json({ success: true, message: 'Focus session completed event queued for processing' })
      span.end()
    } catch (error: any) {
      span.recordException(error as Error)
      span.end()
      console.error('Failed to publish focus event', error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  })
}

