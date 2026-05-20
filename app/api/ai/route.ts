import Anthropic from '@anthropic-ai/sdk'

const tools: Anthropic.Tool[] = [
  {
    name: 'add_object',
    description: 'Add a 3D primitive object to the scene at a specific position',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['cube', 'sphere', 'cylinder'], description: 'Primitive type' },
        name: { type: 'string', description: 'Display name for the object' },
        position: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: '[x, y, z] world position. Ground is roughly y=0.5.',
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: '[x, y, z] rotation in radians',
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: '[x, y, z] scale factors',
        },
      },
      required: ['type', 'name', 'position'],
    },
  },
  {
    name: 'search_model',
    description: 'Search Sketchfab for a 3D model by keyword and place it in the scene. Use specific terms like "oak tree", "wooden bench", "stone wall".',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Sketchfab search term' },
        position: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: '[x, y, z] world position to place the model',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'modify_environment',
    description: 'Change the scene environment: sky preset, time of day, or weather',
    input_schema: {
      type: 'object' as const,
      properties: {
        hdri: {
          type: 'string',
          enum: ['forest', 'sunset', 'studio', 'night', 'urban', 'beach'],
          description: 'Environment preset',
        },
        timeOfDay: { type: 'number', minimum: 0, maximum: 24, description: 'Hour of day (0-24)' },
        weather: { type: 'string', enum: ['clear', 'rain', 'fog'], description: 'Weather condition' },
      },
    },
  },
]

export async function POST(request: Request) {
  const { prompt, sceneContext } = await request.json()

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

  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are an AI assistant for a 3D world builder driven by chat.
Current scene: ${sceneContext.objects.length} objects, environment=${sceneContext.currentHDRI}, time=${sceneContext.timeOfDay}h, weather=${sceneContext.weather}.
Use the provided tools to build what the user asks for. Place objects thoughtfully — spread them across the terrain, vary scale and rotation for natural variety, avoid overlaps. Prefer search_model for organic items (trees, plants, props, vehicles, buildings) and add_object for abstract primitives.
After tool calls, write a brief, friendly summary of what you built (1-3 sentences).`

  const stream = makeStream(async (send) => {
    const claudeStream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages: [{ role: 'user', content: prompt }],
    })

    // Track in-flight tool_use blocks: content_block index → { name, id, partialJson }
    const blocks = new Map<number, { name: string; id: string; json: string }>()

    for await (const event of claudeStream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block
        if (block.type === 'tool_use') {
          blocks.set(event.index, { name: block.name, id: block.id, json: '' })
          send({ type: 'tool_use_start', name: block.name, id: block.id })
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta
        if (delta.type === 'text_delta') {
          send({ type: 'text_delta', text: delta.text })
        } else if (delta.type === 'input_json_delta') {
          const b = blocks.get(event.index)
          if (b) b.json += delta.partial_json
        }
      } else if (event.type === 'content_block_stop') {
        const b = blocks.get(event.index)
        if (b) {
          try {
            const input = JSON.parse(b.json || '{}')
            send({ type: 'tool_use_complete', name: b.name, id: b.id, input })
          } catch {
            send({ type: 'tool_use_error', name: b.name, id: b.id })
          }
          blocks.delete(event.index)
        }
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
