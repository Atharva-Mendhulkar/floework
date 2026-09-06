// ==============================================================================
// Amazon Bedrock AI Client Adapter
// Invokes Anthropic Claude / Amazon Titan foundation models via AWS Bedrock
// Falls back cleanly to Google Gemini or structured fallback if AWS is not configured.
// ==============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface NarrativeOutput {
  summary: string
  highlights: string[]
  warnings: string[]
}

const DEFAULT_FALLBACK: NarrativeOutput = {
  summary: "Momentum is building across the workspace. Focus density is stable as the team moves through current objectives.",
  highlights: ["Workspace synchronized.", "Steady focus velocity."],
  warnings: []
}

/**
 * Format prompt for Bedrock Anthropic Claude model payload
 */
export function formatClaudePayload(prompt: string) {
  return JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }]
      }
    ]
  })
}

/**
 * Parses raw LLM text into validated NarrativeOutput structure
 */
export function parseNarrativeResponse(rawText: string): NarrativeOutput {
  try {
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : DEFAULT_FALLBACK.summary,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : DEFAULT_FALLBACK.highlights,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
    }
  } catch {
    return DEFAULT_FALLBACK
  }
}

/**
 * Invokes Bedrock model if AWS credentials/model ID are set;
 * otherwise gracefully uses Gemini or fallback.
 */
export async function generateNarrative(prompt: string): Promise<string> {
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || process.env.AWS_BEDROCK_MODEL_ID
  const awsRegion = process.env.AWS_REGION || process.env.BEDROCK_REGION || 'us-east-1'

  // 1. If Bedrock is configured and AWS SDK is available in environment
  if (bedrockModelId && process.env.AWS_EXECUTION_ENV) {
    try {
      // Dynamic import to support environments without AWS SDK bundled
      // @ts-ignore
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime')
      const client = new BedrockRuntimeClient({ region: awsRegion })
      const command = new InvokeModelCommand({
        modelId: bedrockModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(formatClaudePayload(prompt))
      })
      const response = await client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      if (responseBody?.content?.[0]?.text) {
        return responseBody.content[0].text
      }
    } catch (err) {
      console.warn("Bedrock invocation failed, attempting fallback:", err)
    }
  }

  // 2. Fallback to Gemini if GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const res = await model.generateContent(prompt)
    return res.response.text()
  }

  // 3. Fallback to structured default
  return JSON.stringify(DEFAULT_FALLBACK)
}
