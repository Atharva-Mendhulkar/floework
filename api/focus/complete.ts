import type { VercelRequest, VercelResponse } from '@vercel/node'
import { publishEvent } from '../_lib/kafka'
import { trace } from '@opentelemetry/api'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const tracer = trace.getTracer('floework-api')
  
  return tracer.startActiveSpan('POST /api/focus/complete', async (span) => {
    try {
      const { userId, durationSecs, projectId } = req.body

      if (!userId || !durationSecs) {
        res.status(400).json({ error: 'Missing required fields' })
        return span.end()
      }

      // Publish to Kafka topic instead of synchronously calculating stability
      await publishEvent('focus.events', userId, {
        type: 'FOCUS_SESSION_COMPLETED',
        userId,
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
