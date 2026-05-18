'use client'

import { useState, useRef, useEffect } from 'react'
import { useWorldBuilder } from '@/lib/store'
import { Send, Loader2, Bot, User } from 'lucide-react'
import type { HDRI, Weather } from '@/lib/constants'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Action {
  tool: string
  input: Record<string, unknown>
}

export function AITab() {
  const addObject = useWorldBuilder((s) => s.addObject)
  const setHDRI = useWorldBuilder((s) => s.setHDRI)
  const setTimeOfDay = useWorldBuilder((s) => s.setTimeOfDay)
  const setWeather = useWorldBuilder((s) => s.setWeather)
  const objects = useWorldBuilder((s) => s.objects)
  const currentHDRI = useWorldBuilder((s) => s.currentHDRI)
  const timeOfDay = useWorldBuilder((s) => s.timeOfDay)
  const weather = useWorldBuilder((s) => s.weather)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function executeAction(action: Action) {
    if (action.tool === 'add_object') {
      const inp = action.input as {
        type: 'cube' | 'sphere' | 'cylinder'
        name: string
        position: [number, number, number]
        rotation?: [number, number, number]
        scale?: [number, number, number]
      }
      addObject({
        id: crypto.randomUUID(),
        type: inp.type,
        name: inp.name,
        position: inp.position,
        rotation: inp.rotation ?? [0, 0, 0],
        scale: inp.scale ?? [1, 1, 1],
        visible: true,
        locked: false,
      })
    } else if (action.tool === 'search_model') {
      const inp = action.input as { query: string; position?: [number, number, number] }
      try {
        const searchRes = await fetch(`/api/sketchfab/search?q=${encodeURIComponent(inp.query)}&count=1`)
        const { results } = await searchRes.json()
        if (results?.[0]) {
          const dlRes = await fetch(`/api/sketchfab/download/${results[0].uid}`)
          const { url } = await dlRes.json()
          if (url) {
            addObject({
              id: crypto.randomUUID(),
              type: 'gltf',
              name: results[0].name,
              position: inp.position ?? [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              visible: true,
              locked: false,
              url,
            })
          }
        }
      } catch {
        // skip failed model search
      }
    } else if (action.tool === 'modify_environment') {
      const inp = action.input as { hdri?: string; timeOfDay?: number; weather?: string }
      if (inp.hdri) setHDRI(inp.hdri as HDRI)
      if (inp.timeOfDay !== undefined) setTimeOfDay(inp.timeOfDay)
      if (inp.weather) setWeather(inp.weather as Weather)
    }
  }

  async function send() {
    const prompt = input.trim()
    if (!prompt || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: prompt }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sceneContext: { objects, currentHDRI, timeOfDay, weather },
        }),
      })

      const { text, actions, error } = await res.json()

      if (error) {
        setMessages((m) => [...m, { role: 'assistant', content: `Error: ${error}` }])
        return
      }

      for (const action of (actions ?? []) as Action[]) {
        await executeAction(action)
      }

      setMessages((m) => [...m, { role: 'assistant', content: text || 'Done.' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Failed to reach AI.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-10 leading-relaxed">
            Ask Claude to build your 3D scene.
            <br />
            <span className="text-gray-700">Requires ANTHROPIC_API_KEY in .env.local</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                m.role === 'assistant' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              {m.role === 'assistant' ? <Bot size={12} /> : <User size={12} />}
            </div>
            <div
              className={`max-w-[80%] rounded px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#333] text-gray-200'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Bot size={12} />
            </div>
            <div className="bg-[#333] rounded px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
              <Loader2 size={11} className="animate-spin" />
              Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-[#3a3a3a] shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask Claude to build your scene…"
          disabled={loading}
          className="flex-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 placeholder:text-gray-600 min-w-0"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50 flex items-center gap-1 shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        </button>
      </div>
    </div>
  )
}
