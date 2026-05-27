import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  // B2: Guard against malformed or missing JSON body
  let body: { prompt?: unknown; systemPrompt?: unknown; history?: unknown }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { prompt, systemPrompt, history = [] } = body as {
    prompt: string
    systemPrompt: string
    history?: HistoryMessage[]
  }

  if (!prompt || typeof prompt !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid "prompt" field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid "systemPrompt" field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const encoder = new TextEncoder()

  function makeStream(handler: (send: (payload: object) => void) => Promise<void>) {
    return new ReadableStream({
      async start(controller) {
        const send = (payload: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }
        try {
          await handler(send)
        } catch (e) {
          let errorMessage = 'Unknown error'
          if (e instanceof Anthropic.APIError) {
            const body = e.error as { error?: { message?: string } } | undefined
            errorMessage = body?.error?.message ?? `API error ${e.status}`
          } else if (e instanceof Error) {
            errorMessage = e.message
          }
          send({ type: 'error', error: errorMessage })
        } finally {
          controller.close()
        }
      },
    })
  }

  if (!apiKey) {
    const stream = makeStream(async (send) => {
      send({ type: 'error', error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local.' })
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }

  // Keep last 10 turns (20 messages) to bound context size
  const trimmedHistory = (Array.isArray(history) ? (history as HistoryMessage[]) : []).slice(-20)

  const stream = makeStream(async (send) => {
    // P1: System prompt caching — the system prompt is large and repeated every request.
    // Passing it as an array with cache_control reduces cost ~90% and latency ~40% on cache hits.
    const claudeStream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [
        ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: prompt },
      ],
    })

    for await (const event of claudeStream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send({ type: 'text_delta', text: event.delta.text })
      }
    }

    send({ type: 'done' })
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
