import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const { prompt, systemPrompt } = await request.json()

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

  const stream = makeStream(async (send) => {
    const claudeStream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
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
