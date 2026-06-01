/**
 * Server-side vision helper. Sends one image + a system/user prompt to whichever
 * provider is configured and returns the model's raw text response.
 *
 * Provider preference: Gemini (free tier) if GEMINI_API_KEY is set, otherwise
 * Anthropic if ANTHROPIC_API_KEY is set. Returns { configured: false } when
 * neither key exists so callers can degrade gracefully.
 */

const GEMINI_MODEL = 'gemini-2.5-flash'
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export type VisionResult =
  | { ok: true; text: string }
  | { ok: false; configured: boolean; status: number; error: string }

type VisionInput = {
  system: string
  userText: string
  image: { mediaType: string; data: string } // base64, no data: prefix
  maxTokens?: number
}

export function visionConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY)
}

export async function runVision(input: VisionInput): Promise<VisionResult> {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  // Build the provider chain: Gemini (free) first, Anthropic as fallback.
  const attempts: (() => Promise<VisionResult>)[] = []
  if (geminiKey) attempts.push(() => runGemini(input, geminiKey))
  if (anthropicKey) attempts.push(() => runAnthropic(input, anthropicKey))

  if (attempts.length === 0) {
    return {
      ok: false,
      configured: false,
      status: 503,
      error: 'AI is not configured on this deployment.',
    }
  }

  // Try each provider; if one fails (quota, billing, outage), fall through to
  // the next. Only if all fail do we return a single, sanitized message so raw
  // provider text (e.g. billing notices) never reaches the UI.
  let last: VisionResult | null = null
  for (const attempt of attempts) {
    const result = await attempt()
    if (result.ok) return result
    last = result
  }

  return {
    ok: false,
    configured: true,
    status: last?.status ?? 502,
    error:
      last?.status === 429
        ? 'The AI service is busy right now. Please try again in a moment.'
        : 'AI assistance is temporarily unavailable.',
  }
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

async function runGemini(input: VisionInput, key: string): Promise<VisionResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: input.system }] },
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: input.image.mediaType, data: input.image.data } },
              { text: input.userText },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: input.maxTokens ?? 1024,
          temperature: 0,
          // 2.5 models spend "thinking" tokens by default, which can swallow
          // the entire output budget. We only need the final JSON, so disable it.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })

    const data = (await res.json()) as GeminiResponse
    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        status: res.status === 429 ? 429 : 502,
        error: data.error?.message ?? 'Gemini request failed',
      }
    }

    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('\n')
    return { ok: true, text }
  } catch (err) {
    return {
      ok: false,
      configured: true,
      status: 500,
      error: err instanceof Error ? err.message : 'Gemini request failed',
    }
  }
}

type AnthropicResponse = {
  content?: { type: string; text?: string }[]
  error?: { message?: string }
}

async function runAnthropic(input: VisionInput, key: string): Promise<VisionResult> {
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: input.maxTokens ?? 1024,
        system: input.system,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data },
              },
              { type: 'text', text: input.userText },
            ],
          },
        ],
      }),
    })

    const data = (await res.json()) as AnthropicResponse
    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        status: 502,
        error: data.error?.message ?? 'Claude request failed',
      }
    }

    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')
    return { ok: true, text }
  } catch (err) {
    return {
      ok: false,
      configured: true,
      status: 500,
      error: err instanceof Error ? err.message : 'Claude request failed',
    }
  }
}
