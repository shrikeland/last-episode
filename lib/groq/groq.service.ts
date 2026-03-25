const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()
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
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.8 }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Groq API error ${res.status}: ${body}`)
  }

  return res
}

/** Parse an SSE line and extract the text content delta */
export function parseSseDelta(line: string): string {
  if (!line.startsWith('data: ')) return ''
  const data = line.slice(6).trim()
  if (data === '[DONE]') return ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = JSON.parse(data)
    return parsed.choices?.[0]?.delta?.content ?? ''
  } catch {
    return ''
  }
}
