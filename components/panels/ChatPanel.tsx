'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, ArrowUp, Loader2, Undo2, AlertCircle, CheckCircle2, Mic, MicOff } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { BehaviorConfig } from '@/lib/scene/SceneStore'
import { parseCommands, executeCommands } from '@/lib/ai/CommandParser'
import type { BehaviorAttachment, GallerySpec } from '@/lib/ai/CommandParser'
import { ChatAssetCarousel } from '@/components/panels/ChatAssetCarousel'
import { buildSystemPrompt, buildSceneContext, enhancePrompt } from '@/lib/ai/PromptEnhancer'

interface UserMessage { role: 'user'; content: string }
interface AssistantMessage {
  role: 'assistant'
  content: string
  commandCount: number
  status: 'streaming' | 'complete' | 'error'
  suggestions?: string[]
  actionErrors?: string[]
  behaviorAttachments?: BehaviorAttachment[]
  gallery?: GallerySpec
}
type Message = UserMessage | AssistantMessage

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

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

// Not computed at module level — would differ between SSR and client, causing React #418 hydration error

const BEHAVIOR_ICONS: Record<BehaviorConfig['type'], string> = {
  rotate: '↻', sway: '≈', oscillate: '↕', scalePulse: '⊕',
  emissivePulse: '✦', lookAtCamera: '◎', randomWander: '↪',
  patrol: '⬡', follow: '→', lookAt: '◉', onClick: '↖', proximityTrigger: '○',
}

function formatBehaviorParams(b: BehaviorConfig): string {
  const parts: string[] = []
  if (b.axis) parts.push(b.axis.toUpperCase())
  if (b.speed !== undefined) parts.push(`×${b.speed.toFixed(1)}`)
  if (b.amplitude !== undefined) parts.push(`amp:${b.amplitude}`)
  if (b.frequency !== undefined) parts.push(`${b.frequency}Hz`)
  if (b.minValue !== undefined && b.maxValue !== undefined) parts.push(`${b.minValue}–${b.maxValue}`)
  if (b.range !== undefined) parts.push(`r:${b.range}`)
  if (b.waypoints) parts.push(`${b.waypoints.length}pts`)
  return parts.length > 0 ? ` · ${parts.join(' ')}` : ''
}

function inferAmbientBehaviors(newObjectIds: string[]): BehaviorAttachment[] {
  const store = useScene.getState()
  const attachments: BehaviorAttachment[] = []
  for (const id of newObjectIds) {
    const obj = store.objects[id]
    if (!obj) continue
    const name = obj.name.toLowerCase()
    if (/tree|pine|oak|fir|bush|shrub|plant/.test(name)) {
      const off = Math.random() * Math.PI * 2
      const bid = store.attachBehavior(id, { type: 'sway', enabled: true, amplitude: 0.05 + Math.random() * 0.05, frequency: 0.6 + Math.random() * 0.4, offset: off })
      const b = useScene.getState().objects[id]?.behaviors?.find((x) => x.id === bid)
      if (b) attachments.push({ objectId: id, objectName: obj.name, behavior: b })
    } else if (/torch|flame|fire|candle|lantern/.test(name)) {
      const bid = store.attachBehavior(id, { type: 'emissivePulse', enabled: true, minValue: 0.5, maxValue: 2.5, frequency: 2 })
      store.attachBehavior(id, { type: 'scalePulse', enabled: true, minValue: 0.95, maxValue: 1.05, frequency: 3 })
      const b = useScene.getState().objects[id]?.behaviors?.find((x) => x.id === bid)
      if (b) attachments.push({ objectId: id, objectName: obj.name, behavior: b })
    } else if (/flag|banner|sail|pennant/.test(name)) {
      const bid = store.attachBehavior(id, { type: 'sway', enabled: true, axis: 'x', amplitude: 0.15, frequency: 1.5 })
      const b = useScene.getState().objects[id]?.behaviors?.find((x) => x.id === bid)
      if (b) attachments.push({ objectId: id, objectName: obj.name, behavior: b })
    } else if (/npc|guard|villager|soldier|wanderer/.test(name)) {
      const bid = store.attachBehavior(id, { type: 'randomWander', enabled: true, speed: 1, range: 5, interval: 3 })
      const b = useScene.getState().objects[id]?.behaviors?.find((x) => x.id === bid)
      if (b) attachments.push({ objectId: id, objectName: obj.name, behavior: b })
    }
  }
  return attachments
}

function getBehaviorSuggestions(attachments: BehaviorAttachment[]): string[] {
  if (!attachments.length) return []
  const types = [...new Set(attachments.map((a) => a.behavior.type))]
  const out: string[] = []
  for (const t of types) {
    if (t === 'rotate') { out.push('Make it spin faster', 'Spin on the X axis instead'); break }
    if (t === 'sway') { out.push('Make them sway more dramatically', 'Increase sway frequency'); break }
    if (t === 'emissivePulse') { out.push('Make torches flicker faster', 'Add fog for atmosphere'); break }
    if (t === 'randomWander') { out.push('Make them wander a bigger area', 'Add patrol waypoints instead'); break }
    if (t === 'oscillate') { out.push('Increase oscillation amplitude', 'Change oscillation axis'); break }
    if (t === 'patrol') { out.push('Make patrol loop faster', 'Add more patrol waypoints'); break }
    if (t === 'follow') { out.push('Make follower faster', 'Add another follower'); break }
    if (t === 'scalePulse') { out.push('Make pulse more dramatic', 'Add emissive glow to match'); break }
  }
  return out.slice(0, 3)
}

export function ChatPanel() {
  // Computed client-side only via useEffect to avoid SSR/client Date.now() mismatch (React #418)
  const [startSuggestions, setStartSuggestions] = useState<typeof ALL_SUGGESTIONS>(() => ALL_SUGGESTIONS.slice(0, 6))
  useEffect(() => { setStartSuggestions(getRotatingSuggestions()) }, [])

  const objects = useScene((s) => s.objects)
  const environment = useScene((s) => s.environment)
  const cameraFov = useScene((s) => s.cameraFov)
  const cameraNear = useScene((s) => s.cameraNear)
  const cameraFar = useScene((s) => s.cameraFar)
  const viewMode = useScene((s) => s.viewMode)
  const undo = useScene((s) => s.undo)
  const past = useScene((s) => s.past)

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<HistoryMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

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

  const toggleVoice = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = e.results[0][0].transcript
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript)
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening])

  async function send(promptOverride?: string) {
    const prompt = (promptOverride ?? input).trim()
    if (!prompt || loading) return
    setInput('')

    // Detect "show me" gallery requests and respond immediately without API call
    const showMeMatch = prompt.match(/show\s+(?:me\s+)?(?:some\s+)?(.+?)\s*(hdris?|environments?|textures?|materials?|sketchfab|models?)/i)
    if (showMeMatch) {
      const query = showMeMatch[1].trim()
      const typeRaw = showMeMatch[2].toLowerCase()
      const type = typeRaw.startsWith('hdri') || typeRaw.startsWith('env') ? 'hdri'
        : typeRaw.startsWith('material') ? 'material'
        : typeRaw.startsWith('texture') ? 'texture'
        : 'sketchfab'
      const userMsg: UserMessage = { role: 'user', content: prompt }
      const assistantMsg: AssistantMessage = {
        role: 'assistant',
        content: `Here are some ${type === 'hdri' ? 'HDRI environments' : type} matching "${query}". Click to apply.`,
        commandCount: 0,
        status: 'complete',
        gallery: { type, query },
      }
      setMessages((m) => [...m, userMsg, assistantMsg])
      return
    }

    const sceneContext = buildSceneContext(
      objects as Record<string, unknown>,
      environment as unknown as Record<string, unknown>,
      { fov: cameraFov, near: cameraNear, far: cameraFar, viewMode }
    )
    const enhancedPrompt = enhancePrompt(prompt, sceneContext)
    const systemPrompt = buildSystemPrompt(sceneContext)

    const userMsg: UserMessage = { role: 'user', content: prompt }
    const assistantMsg: AssistantMessage = { role: 'assistant', content: '', commandCount: 0, status: 'streaming' }
    setMessages((m) => [...m, userMsg, assistantMsg])
    setLoading(true)

    useScene.getState().pushHistory()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt, systemPrompt, history: conversationHistory }),
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
            // Strip code blocks so users see natural language, not raw JSON
            const displayText = fullText
              .replace(/```(?:json)?\s*[\s\S]*?```/g, '')
              .replace(/```[\s\S]*$/, '')
              .trim()
            patchLast({ content: displayText || '…' })

            // Execute commands eagerly once a complete code block arrives while streaming
            if (!executed && fullText.includes('```') && fullText.split('```').length > 2) {
              const { commands, actions, text, suggestions, gallery } = parseCommands(fullText)
              if (commands.length > 0 || actions.length > 0) {
                const result = executeCommands(commands, actions)
                const inferred = inferAmbientBehaviors(result.newObjectIds)
                const allBehaviors = [...result.behaviorAttachments, ...inferred]
                const bSuggs = getBehaviorSuggestions(allBehaviors)
                executed = true
                const cleanDisplay = text || fullText.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim()
                patchLast({
                  content: cleanDisplay,
                  commandCount: result.executed,
                  actionErrors: result.errors.length > 0 ? result.errors : undefined,
                  suggestions: bSuggs.length > 0 ? bSuggs : suggestions,
                  behaviorAttachments: allBehaviors.length > 0 ? allBehaviors : undefined,
                  gallery: gallery ?? undefined,
                })
              }
            }
          } else if (event.type === 'error') {
            patchLast({ content: event.error as string, status: 'error' })
          }
        }
      }

      // Final pass for remaining commands
      const { commands, actions, text, suggestions, gallery } = parseCommands(fullText)
      const cleanedText = text || fullText.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim()
      if (!executed && (commands.length > 0 || actions.length > 0)) {
        const result = executeCommands(commands, actions)
        const inferred = inferAmbientBehaviors(result.newObjectIds)
        const allBehaviors = [...result.behaviorAttachments, ...inferred]
        const bSuggs = getBehaviorSuggestions(allBehaviors)
        patchLast({
          content: cleanedText,
          commandCount: result.executed,
          actionErrors: result.errors.length > 0 ? result.errors : undefined,
          suggestions: bSuggs.length > 0 ? bSuggs : suggestions,
          behaviorAttachments: allBehaviors.length > 0 ? allBehaviors : undefined,
          gallery: gallery ?? undefined,
          status: 'complete',
        })
      } else {
        // Commands already ran mid-stream — just finalize with clean text, suggestions, and gallery
        patchLast({ content: cleanedText, suggestions: suggestions ?? undefined, gallery: gallery ?? undefined, status: 'complete' })
      }

      // Update conversation history (keep last 10 turns = 20 messages)
      const cleanText = text || fullText.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim()
      setConversationHistory((prev) => {
        const updated: HistoryMessage[] = [
          ...prev,
          { role: 'user', content: prompt },
          { role: 'assistant', content: cleanText },
        ]
        return updated.slice(-20)
      })
    } catch (e) {
      patchLast({ content: e instanceof Error ? e.message : 'Connection failed.', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const voiceSupported = typeof window !== 'undefined' && !!(((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))

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
        {conversationHistory.length > 0 && (
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-mono"
            style={{ background: '#1a2050', color: '#5B6CFF' }}>
            {conversationHistory.length / 2} turn{conversationHistory.length / 2 !== 1 ? 's' : ''}
          </span>
        )}
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
              {startSuggestions.map((s) => (
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
                  onSuggestion={send}
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
            className="w-full bg-transparent resize-none px-3.5 py-2.5 pr-20 text-[12px] leading-relaxed outline-none"
            style={{ color: '#E8E9F0', minHeight: '42px' }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                disabled={loading}
                title={listening ? 'Stop listening' : 'Voice input'}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all relative"
                style={{
                  background: listening ? '#2a0a3a' : '#1E2028',
                  color: listening ? '#c084fc' : '#7A7E92',
                }}
              >
                {listening && (
                  <span className="absolute inset-0 rounded-lg animate-ping"
                    style={{ background: '#a855f730' }} />
                )}
                {listening ? <MicOff size={11} /> : <Mic size={11} />}
              </button>
            )}
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{
                background: loading || !input.trim() ? '#1E2028' : 'linear-gradient(135deg, #5B6CFF, #7c3aed)',
                color: loading || !input.trim() ? '#3a3a4a' : '#ffffff',
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={13} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
        <p className="mt-1 px-1 text-[9px]" style={{ color: '#3a3a4a' }}>
          Enter to send · Shift+Enter for newline{voiceSupported ? ' · Mic for voice' : ''}
        </p>
      </div>
    </div>
  )
}

function BehaviorBadge({ attachment, onRemove }: { attachment: BehaviorAttachment; onRemove: () => void }) {
  const icon = BEHAVIOR_ICONS[attachment.behavior.type] ?? '◉'
  const desc = formatBehaviorParams(attachment.behavior)
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] select-none"
      style={{ background: '#071a1a', border: '1px solid #1a4040', color: '#4adece' }}>
      <span className="opacity-70">{icon}</span>
      <span className="font-medium" style={{ color: '#7deae4' }}>{attachment.objectName}</span>
      <span style={{ color: '#1a5050' }}>·</span>
      <span style={{ color: '#4adece' }}>{attachment.behavior.type}{desc}</span>
      <button
        onClick={onRemove}
        title="Remove behavior"
        className="ml-0.5 transition-opacity opacity-40 hover:opacity-100"
        style={{ color: '#f87171', lineHeight: 1 }}
      >×</button>
    </div>
  )
}

function AssistantBubble({ msg, loading, onUndo, onSuggestion }: {
  msg: AssistantMessage
  isLast: boolean
  loading: boolean
  onUndo?: () => void
  onSuggestion?: (prompt: string) => void
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

      {/* Inline action errors */}
      {msg.actionErrors && msg.actionErrors.length > 0 && (
        <div className="flex flex-col gap-1">
          {msg.actionErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded-md text-[10px]"
              style={{ background: '#1a0808', border: '1px solid #4a1515', color: '#f87171' }}>
              <AlertCircle size={10} className="shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Undo button */}
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

      {/* Behavior badges */}
      {msg.behaviorAttachments && msg.behaviorAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {msg.behaviorAttachments.map((a) => (
            <BehaviorBadge
              key={`${a.objectId}-${a.behavior.id}`}
              attachment={a}
              onRemove={() => useScene.getState().detachBehavior(a.objectId, a.behavior.id)}
            />
          ))}
        </div>
      )}

      {/* Asset gallery carousel */}
      {msg.gallery && (
        <ChatAssetCarousel spec={msg.gallery} />
      )}

      {/* Smart suggestion chips */}
      {msg.status === 'complete' && msg.suggestions && msg.suggestions.length > 0 && onSuggestion && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {msg.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestion(s)}
              className="text-[10px] px-2.5 py-1 rounded-full border transition-all"
              style={{ borderColor: '#2a3060', color: '#8B9CF4', background: '#0d1022' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF'; e.currentTarget.style.background = '#151a40'; e.currentTarget.style.color = '#a5b4fc' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a3060'; e.currentTarget.style.background = '#0d1022'; e.currentTarget.style.color = '#8B9CF4' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
