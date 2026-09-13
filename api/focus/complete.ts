import type { VercelRequest, VercelResponse } from '@vercel/node'
import { publishFocusCompletionEvent } from '../_lib/sqs'
import { getUser, requireProjectMember } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // 1. Mandate authentication (SEC-03)
    const user = await getUser(req)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { userId, durationSecs, projectId } = req.body

    if (!durationSecs) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    // Enforce caller identity match (prevent user spoofing)
    const targetUserId = user.id
    if (userId && userId !== user.id) {
      res.status(403).json({ error: 'Forbidden: Cannot complete focus session for another user' })
      return
    }

    // If projectId is specified, ensure user belongs to the project
    if (projectId) {
      if (!await requireProjectMember(req, res, projectId)) {
        return
      }
    }

    // Publish to Amazon SQS FIFO queue instead of synchronously calculating stability
    await publishFocusCompletionEvent(targetUserId, {
      type: 'FOCUS_SESSION_COMPLETED',
      userId: targetUserId,
      projectId,
      durationSecs,
      timestamp: new Date().toISOString()
    })

    res.status(202).json({ success: true, message: 'Focus session completed event queued for processing' })
  } catch (error: any) {
    console.error('Failed to publish focus event', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

