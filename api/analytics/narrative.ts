import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { projectId } = req.query as { projectId: string }

  // 1. Initialize Clients
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Auth Check
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // 3. Check Cache (1 hour TTL)
    const { data: cached } = await supabase
      .from('narrative_cache')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (cached) {
      const updatedAt = new Date(cached.updated_at).getTime()
      const now = new Date().getTime()
      if (now - updatedAt < 3600000) { // 1 hour
        return res.status(200).json({
          success: true,
          data: {
            summary: cached.summary,
            highlights: cached.highlights,
            warnings: cached.warnings
          }
        })
      }
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

    // 5. Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      You are an Executive Productivity Analyst for Floework. Write a concise 3-sentence summary.
      Context: ${hrs} focus hours, ${doneCount} tasks done, ${activeCount} active tasks.
      Project Context: This is for project ID ${projectId}.
      Format (JSON): { "summary": "...", "highlights": ["..."], "warnings": ["..."] }
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
    const aiData = JSON.parse(responseText)

    // 6. Update Cache
    await supabase.from('narrative_cache').upsert({
      project_id: projectId,
      user_id: user.id,
      summary: aiData.summary,
      highlights: aiData.highlights,
      warnings: aiData.warnings,
      updated_at: new Date().toISOString()
    })

    return res.status(200).json({
      success: true,
      data: aiData
    })

  } catch (error: any) {
    console.error("AI Narrative Error:", error)
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      data: {
        summary: "Momentum is building across the workspace. Focus density is stable as the team moves through current objectives.",
        highlights: ["Workspace synchronized.", "Steady focus velocity."],
        warnings: []
      }
    })
  }
}
