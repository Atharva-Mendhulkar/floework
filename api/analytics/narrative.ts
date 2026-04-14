import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Initialize Clients
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  try {
    // 2. Aggregate Data for Context (Last 24 Hours)
    const twentyFourHrsAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('duration_secs, started_at')
      .gte('started_at', twentyFourHrsAgo)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, title')

    const totalSecs = (focusSessions || []).reduce((acc, curr) => acc + (curr.duration_secs || 0), 0)
    const hrs = (totalSecs / 3600).toFixed(1)
    const doneCount = (tasks || []).filter(t => t.status === 'done').length
    const activeCount = (tasks || []).filter(t => t.status === 'in_progress' || t.status === 'review').length

    // 3. Craft the AI Prompt
    const prompt = `
      You are an Executive Productivity Analyst for a high-end SaaS platform called Floework.
      Your goal is to write a sophisticated, concise executive summary for a workspace dashboard.

      Context (Last 24 Hours):
      - Total Deep Focus Time: ${hrs} hours
      - Tasks Successfully Executed (Done): ${doneCount}
      - Tasks Currently in Motion (In Focus/Review): ${activeCount}
      
      Requirements:
      - Length: Exactly 3 sentences.
      - Tone: Professional, data-driven, yet encouraging. Like a high-end personal assistant.
      - Highlights: Mention current momentum and any potential bottlenecks if active tasks are high (>5).
      - Style: Avoid corporate jargon; use sleek, modern executive language.

      Response Format (JSON only):
      {
        "summary": "Full 3-sentence summary here",
        "highlights": ["1-2 key achievements in short bullet format"],
        "warnings": ["1 potential risk or advice if applicable, else empty"]
      }
    `

    // 4. Call Gemini
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
    const aiData = JSON.parse(responseText)

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
