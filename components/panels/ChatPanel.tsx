'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, ArrowUp, Loader2, Undo2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { parseCommands, executeCommands } from '@/lib/ai/CommandParser'
import { buildSystemPrompt, buildSceneContext, enhancePrompt } from '@/lib/ai/PromptEnhancer'
import { WORLD_TEMPLATES } from '@/lib/ai/WorldTemplates'

interface UserMessage { role: 'user'; content: string }
interface AssistantMessage {
  role: 'assistant'
  content: string
  commandCount: number
  status: 'streaming' | 'complete' | 'error'
}
type Message = UserMessage | AssistantMessage

const ALL_SUGGESTIONS = [
  { label: 'Ancient Forest', icon: '🌲', prompt: 'Build a dense ancient forest with towering trees, mossy rocks, atmospheric fog, and dappled light filtering through the canopy' },
  { label: 'Sci-Fi Base', icon: '🛸', prompt: 'Create a sci-fi military base with metal structures, glowing emissive panels, blue neon lighting, and animated holographic displays' },
  { label: 'Medieval Village', icon: '🏰', prompt: 'Build a medieval village with a stone castle, market stalls, warm torchlight, and cobblestone streets with animated lanterns' },
  { label: 'Cyberpunk City', icon: '🏙️', prompt: 'Create a cyberpunk city district at night with towering skyscrapers, neon signs, rain-slicked streets, and pink/cyan lighting' },
  { label: 'Space Station', icon: '🚀', prompt: 'Build a space station with a ring structure, solar panels, floating debris, and a stunning view of a nebula in the background' },
  { label: 'Golden Sunset', icon: '🌅', prompt: 'Create a cinematic golden sunset scene with rolling hills, warm directional light, silhouette trees, and floating dust particles' },
  { label: 'Underwater Reef', icon: '🐠', prompt: 'Build a vibrant coral reef underwater scene with colorful corals, swaying kelp, caustic lighting, and schools of fish particles' },
  { label: 'Volcano Island', icon: '🌋', prompt: 'Create a dramatic volcanic island with a glowing lava crater, dark rocky terrain, emissive lava flows, and billowing smoke particles' },
  { label: 'Winter Cabin', icon: '🏔️', prompt: 'Build a cozy winter cabin scene with snow-covered ground, warm glowing windows, pine trees, and falling snow particles' },
  { label: 'Jungle Temple', icon: '🏛️', prompt: 'Create an ancient jungle temple with moss-covered stone pillars, overgrown vines, mystical glowing runes, and torch flames' },
  { label: 'City Rooftop', icon: '🌃', prompt: 'Build a futuristic city rooftop at night with a helipad, neon-lit skyline, holographic billboards, and stars overhead' },
  { label: 'Zen Garden', icon: '🎋', prompt: 'Create a serene Japanese zen garden with raked sand patterns, stone lanterns, bamboo, cherry blossom petals, and soft morning light' },
]

function getRotatingSuggestions() {
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 6))
  const start = seed % ALL_SUGGESTIONS.length
  const out = []
  for (let i = 0; i < 6; i++) out.push(ALL_SUGGESTIONS[(start + i) % ALL_SUGGESTIONS.length])
  return out
}

const SUGGESTIONS = getRotatingSuggestions()

export function ChatPanel() {
  const objects = useScene((s) => s.objects)
  const environment = useScene((s) => s.environment)
  const undo = useScene((s) => s.undo)
  const past = useScene((s) => s.past)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  function autoResize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  useEffect(autoResize, [input])

  function patchLast(patch: Partial<AssistantMessage>) {
    setMessages((m) => {
      const idx = m.length - 1
      if (idx < 0 || m[idx].role !== 'assistant') return m
      return [...m.slice(0, idx), { ...m[idx], ...patch } as AssistantMessage]
    })
  }

  async function send(promptOverride?: string) {
    const prompt = (promptOverride ?? input).trim()
    if (!prompt || loading) return
    setInput('')

    const sceneContext = buildSceneContext(objects as Record<string, unknown>, environment as unknown as Record<string, unknown>)
    const enhancedPrompt = enhancePrompt(prompt, sceneContext)
    const systemPrompt = buildSystemPrompt(sceneContext)

    const userMsg: UserMessage = { role: 'user', content: prompt }
    const assistantMsg: AssistantMessage = { role: 'assistant', content: '', commandCount: 0, status: 'streaming' }
    setMessages((m) => [...m, userMsg, assistantMsg])
    setLoading(true)

    // Push history snapshot before AI changes
    useScene.getState().pushHistory()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt, systemPrompt }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      let executed = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: { type: string; [k: string]: unknown }
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          if (event.type === 'text_delta') {
            fullText += event.text as string
            patchLast({ content: fullText })

            // Execute commands as they arrive (on completion of code block)
            if (!executed && fullText.includes('```') && fullText.split('```').length > 2) {
              const { commands, text } = parseCommands(fullText)
              if (commands.length > 0) {
                executeCommands(commands)
                executed = true
                patchLast({ content: text || fullText, commandCount: commands.length })
              }
            }
          } else if (event.type === 'error') {
            patchLast({ content: event.error as string, status: 'error' })
          }
        }
      }

      // Final pass for any remaining commands
      if (!executed) {
        const { commands, text } = parseCommands(fullText)
        if (commands.length > 0) {
          executeCommands(commands)
          patchLast({ content: text || fullText, commandCount: commands.length, status: 'complete' })
        } else {
          patchLast({ status: 'complete' })
        }
      } else {
        patchLast({ status: 'complete' })
      }
    } catch (e) {
      patchLast({ content: e instanceof Error ? e.message : 'Connection failed.', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#111318' }}>
      {/* Header */}
      <div className="flex items-center gap-2 h-9 px-3 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <div className="w-4 h-4 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #5B6CFF, #8B5CF6)' }}>
          <Sparkles size={9} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: '#E8E9F0' }}>AI Assistant</span>
        <span className="text-[10px] font-mono" style={{ color: '#7A7E92' }}>claude-sonnet-4-6</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-6 gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #5B6CFF, #8B5CF6)', boxShadow: '0 0 20px rgba(91,108,255,0.3)' }}>
              <Sparkles size={22} className="text-white" strokeWidth={1.75} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold mb-1" style={{ color: '#E8E9F0' }}>Build a world with AI</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#7A7E92' }}>
                Describe a scene and Claude will build it — placing objects, setting the mood, and animating elements.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  className="flex flex-col items-start gap-1 p-2.5 rounded-xl text-left transition-all border"
                  style={{ background: '#0B0C0F', borderColor: '#1E2028' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF44'; e.currentTarget.style.background = '#0d1022' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.background = '#0B0C0F' }}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="text-[10px] font-medium" style={{ color: '#7A7E92' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 flex flex-col gap-4">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm text-[12px] leading-relaxed"
                    style={{ background: '#1a1f3a', color: '#E8E9F0', border: '1px solid #2a3060' }}>
                    {m.content}
                  </div>
                </div>
              ) : (
                <AssistantBubble
                  key={i}
                  msg={m}
                  isLast={i === messages.length - 1}
                  loading={loading && i === messages.length - 1}
                  onUndo={past.length > 0 ? undo : undefined}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid #1E2028' }}>
        <div className="relative rounded-xl transition-colors border"
          style={{ background: '#0B0C0F', borderColor: '#1E2028' }}
          onFocusCapture={(e) => e.currentTarget.style.borderColor = '#5B6CFF55'}
          onBlurCapture={(e) => e.currentTarget.style.borderColor = '#1E2028'}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Describe a world, scene, or change…"
            disabled={loading}
            rows={1}
            className="w-full bg-transparent resize-none px-3.5 py-2.5 pr-11 text-[12px] leading-relaxed outline-none"
            style={{ color: '#E8E9F0', minHeight: '42px' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{
              background: loading || !input.trim() ? '#1E2028' : 'linear-gradient(135deg, #5B6CFF, #7c3aed)',
              color: loading || !input.trim() ? '#3a3a4a' : '#ffffff',
            }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={13} strokeWidth={2.5} />}
          </button>
        </div>
        <p className="mt-1 px-1 text-[9px]" style={{ color: '#3a3a4a' }}>Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}

function AssistantBubble({ msg, loading, onUndo }: {
  msg: AssistantMessage
  isLast: boolean
  loading: boolean
  onUndo?: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #5B6CFF, #8B5CF6)' }}>
          <Sparkles size={8} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#7A7E92' }}>Claude</span>
        {msg.commandCount > 0 && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px]"
            style={{ background: '#1a2a1a', color: '#4ade80', border: '1px solid #2a4a2a' }}>
            <CheckCircle2 size={8} strokeWidth={2} />
            {msg.commandCount} change{msg.commandCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {msg.status === 'error' ? (
        <div className="px-3 py-2 rounded-lg flex items-start gap-2 text-[12px]"
          style={{ background: '#1a0808', border: '1px solid #4a1515', color: '#f87171' }}>
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{msg.content.replace(/^⚠\s*/, '')}</span>
        </div>
      ) : msg.content ? (
        <div className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: '#C8C9D0' }}>
          {msg.content}
          {loading && msg.status === 'streaming' && (
            <span className="inline-block w-0.5 h-3.5 ml-0.5 align-text-bottom rounded-sm animate-pulse"
              style={{ background: '#5B6CFF' }} />
          )}
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#7A7E92' }}>
          <Loader2 size={11} className="animate-spin" />
          <span>Thinking…</span>
        </div>
      ) : null}

      {msg.status === 'complete' && msg.commandCount > 0 && onUndo && (
        <button
          onClick={onUndo}
          className="self-start flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors border"
          style={{ color: '#7A7E92', borderColor: '#1E2028' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.background = '#1E2028' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.background = '' }}
        >
          <Undo2 size={9} strokeWidth={1.75} />
          Undo changes
        </button>
      )}
    </div>
  )
}
