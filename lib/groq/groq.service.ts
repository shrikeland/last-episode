const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY is not set')
  return key
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Full (non-streaming) completion — used for pre-summary generation */
export async function generate(
  systemPrompt: string,
  userPrompt: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const res = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: false, temperature: 0.7 }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Groq API error ${res.status}: ${body}`)
  }

   
  const data: any = await res.json()
  if (data.usage) {
    console.log(`[groq] ${model} | prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`)
  }
  return data.choices?.[0]?.message?.content ?? ''
}

/** Streaming completion — returns the raw fetch Response with SSE body */
export async function generateStream(
  systemPrompt: string,
  userPrompt: string,
  model = DEFAULT_MODEL
): Promise<Response> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const res = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.8, stream_options: { include_usage: true } }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Groq API error ${res.status}: ${body}`)
  }

  return res
}

/** Parse an SSE line and extract token usage (present in the final chunk when stream_options.include_usage=true) */
export function parseSseUsage(line: string): { prompt: number; completion: number; total: number } | null {
  if (!line.startsWith('data: ')) return null
  const data = line.slice(6).trim()
  if (data === '[DONE]') return null
  try {
     
    const parsed: any = JSON.parse(data)
    const u = parsed.usage
    if (!u) return null
    return { prompt: u.prompt_tokens, completion: u.completion_tokens, total: u.total_tokens }
  } catch {
    return null
  }
}

/** Parse an SSE line and extract the text content delta */
export function parseSseDelta(line: string): string {
  if (!line.startsWith('data: ')) return ''
  const data = line.slice(6).trim()
  if (data === '[DONE]') return ''
  try {
     
    const parsed: any = JSON.parse(data)
    return parsed.choices?.[0]?.delta?.content ?? ''
  } catch {
    return ''
  }
}
