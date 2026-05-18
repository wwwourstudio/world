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
          description: '[x, y, z] world position',
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
    description: 'Search Sketchfab for a 3D model and add it to the scene',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search term for Sketchfab (e.g. "oak tree", "wooden bench")' },
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
    description: 'Change the scene environment: sky, time of day, or weather',
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
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local.' },
      { status: 500 }
    )
  }

  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are an AI assistant for a 3D world builder application similar to Blender.
Current scene: ${sceneContext.objects.length} objects, environment: ${sceneContext.currentHDRI}, time: ${sceneContext.timeOfDay}h, weather: ${sceneContext.weather}.
Use the provided tools to modify the scene based on the user's request.
Place objects thoughtfully — spread them across the terrain, avoid exact overlaps.
After using tools, respond with a brief, friendly description of what you created.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: [{ role: 'user', content: prompt }],
  })

  const actions = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    .map((block) => ({ tool: block.name, input: block.input }))

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  return Response.json({ text, actions })
}
