import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { rateLimit } from '../_lib/rateLimit'
import { validateQuery, ProjectIdQuerySchema } from '../_lib/validate'
import { requireMember } from '../_lib/auth'
import { trace } from '@opentelemetry/api'
import { v4 as uuidv4 } from 'uuid'
import CircuitBreaker from 'opossum'
import { redis } from '../_lib/redis'
import { generateNarrative, parseNarrativeResponse } from './bedrockClient'

async function fetchAI(prompt: string) {
  const aiPromise = generateNarrative(prompt)
  const timeoutPromise = new Promise<string>((_, reject) => 
    setTimeout(() => reject(new Error('AI generation timeout')), 25000)
  )
  return Promise.race([aiPromise, timeoutPromise])
}

const breaker = new CircuitBreaker(fetchAI, {
  timeout: 25000, // 25s timeout
  errorThresholdPercentage: 50, // trip if 50% fail
  volumeThreshold: 5, // minimum 5 requests before tripping
  resetTimeout: 60000 // half-open after 60s
})

breaker.fallback(() => {
  return JSON.stringify({
    summary: "Momentum is building across the workspace. Focus density is stable as the team moves through current objectives.",
    highlights: ["Workspace synchronized.", "Steady focus velocity."],
    warnings: []
  })
})



export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tracer = trace.getTracer('floework-api')
  const requestId = uuidv4()
  res.setHeader('X-Request-ID', requestId)

  // 0. Rate Limiting
  if (!rateLimit(req, res, { windowMs: 60_000, max: 10 })) return

  // 0.1 Input Validation
  const validatedQuery = validateQuery(req, res, ProjectIdQuerySchema)
  if (!validatedQuery) return

  const { projectId } = validatedQuery

  // 1. Initialize Clients
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Auth & Membership Check
  // First, find the team_id for this project to check membership
  const { data: project } = await supabase
    .from('projects')
    .select('team_id')
    .eq('id', projectId as string)
    .single()

  if (!project) return res.status(404).json({ error: 'Project not found' })

  const user = await requireMember(req, res, project.team_id)
  if (!user) return

  return tracer.startActiveSpan('GET /api/analytics/narrative', async (span) => {
  try {
    const cacheKey = `narrative_cache:${projectId}:${user.id}`
    // 3. Check Cache (1 hour TTL) using Redis
    const cachedText = await redis.get<string>(cacheKey)

    if (cachedText) {
      res.status(200).json({
        success: true,
        data: typeof cachedText === 'string' ? JSON.parse(cachedText) : cachedText
      })
      return span.end()
    }

    // 4. Aggregate Data for Context (Last 24 Hours)
    const twentyFourHrsAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('duration_secs')
      .eq('user_id', user.id)
      .gte('started_at', twentyFourHrsAgo)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, title')
      .eq('project_id', projectId)

    const totalSecs = (focusSessions || []).reduce((acc, curr) => acc + (curr.duration_secs || 0), 0)
    const hrs = (totalSecs / 3600).toFixed(1)
    const doneCount = (tasks || []).filter(t => t.status === 'done').length
    const activeCount = (tasks || []).filter(t => t.status === 'in_progress' || t.status === 'review').length

    const prompt = `
      You are an Executive Productivity Analyst for Floework. Write a concise 3-sentence summary.
      Context: ${hrs} focus hours, ${doneCount} tasks done, ${activeCount} active tasks.
      Project Context: This is for project ID ${projectId}.
      Format (JSON): { "summary": "...", "highlights": ["..."], "warnings": ["..."] }
    `

    // 5. Call AI Narrative Generator with Timeout and Circuit Breaker
    const responseText = await tracer.startActiveSpan('ai-narrative-generation', async (aiSpan) => {
      try {
        const text = await breaker.fire(prompt)
        aiSpan.end()
        return text
      } catch (e) {
        aiSpan.recordException(e as Error)
        aiSpan.end()
        throw e
      }
    })

    const aiData = parseNarrativeResponse(responseText)

    // 6. Update Cache in Redis with 1 hour TTL (3600 seconds)
    await redis.setex(cacheKey, 3600, JSON.stringify(aiData))

    res.status(200).json({
      success: true,
      data: aiData
    })
    span.end()

  } catch (error: any) {
    console.error("AI Narrative Error:", error)
    res.status(500).json({ 
      success: false, 
      error: error.message,
      requestId,
      data: {
        summary: "Momentum is building across the workspace. Focus density is stable as the team moves through current objectives.",
        highlights: ["Workspace synchronized.", "Steady focus velocity."],
        warnings: []
      }
    })
    span.recordException(error as Error)
    span.end()
  }
  })
}
