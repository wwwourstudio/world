'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, ArrowUp, Loader2, Undo2, AlertCircle, CheckCircle2,
  Mic, MicOff, Zap, Globe, Trees, Lightbulb, Camera, Wand2,
  ChevronDown,
} from 'lucide-react'
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

// ─── Suggestion sets ──────────────────────────────────────────────────────────

const WORLD_SUGGESTIONS = [
  { label: 'Ancient Forest',   icon: '🌲', cat: 'scene', prompt: 'Build a dense ancient forest with towering trees, mossy rocks, atmospheric fog, and dappled golden light filtering through the canopy. Add fallen logs and scattered wildflowers.' },
  { label: 'Sci-Fi Base',      icon: '🛸', cat: 'scene', prompt: 'Create a sci-fi military base with metal structures, glowing emissive control panels, blue neon lighting, and animated holographic displays. Add mechanical details and exhaust vents.' },
  { label: 'Medieval Village', icon: '🏰', cat: 'scene', prompt: 'Build a medieval village with a stone castle, market stalls, warm torchlight, cobblestone streets, and animated lanterns swaying in the wind. Add a well and hay bales.' },
  { label: 'Cyberpunk City',   icon: '🏙️', cat: 'scene', prompt: 'Create a cyberpunk city district at night with towering neon-lit skyscrapers, rain-slicked reflective streets, pink/cyan advertising holograms, and atmospheric rain particles.' },
  { label: 'Space Station',    icon: '🚀', cat: 'scene', prompt: 'Build a space station with a ring structure, solar panels, floating debris particles, docking bay, and a stunning view of a glowing nebula in the deep black background.' },
  { label: 'Golden Sunset',    icon: '🌅', cat: 'scene', prompt: 'Create a cinematic golden sunset with rolling hills, warm directional light casting long shadows, silhouette trees, and golden dust particle motes floating in the light.' },
  { label: 'Underwater Reef',  icon: '🐠', cat: 'scene', prompt: 'Build a vibrant coral reef with colorful corals, swaying kelp, caustic light patterns, and schools of fish particle effects. Deep blue ambient with volumetric light shafts.' },
  { label: 'Winter Cabin',     icon: '🏔️', cat: 'scene', prompt: 'Build a cozy winter cabin with snow-covered terrain, warm glowing windows, pine trees dusted in snow, a frozen pond, and softly falling snow particles.' },
  { label: 'Jungle Temple',    icon: '🏛️', cat: 'scene', prompt: 'Ancient jungle temple with moss-covered stone pillars, overgrown vines, mystical glowing runes, torch flames with emissive pulse, tropical particle effects and god rays.' },
  { label: 'Volcano Island',   icon: '🌋', cat: 'scene', prompt: 'Dramatic volcanic island with glowing lava terrain, dark rocky landscape, emissive lava flows with orange-red glow, billowing smoke particles, and fire sparks.' },
  { label: 'Product Showcase', icon: '💎', cat: 'scene', prompt: 'Build a premium product showcase with a dark dramatic background, three-point studio lighting (key, fill, rim), a chrome pedestal, and subtle particle shimmer. Perfect for product visualization.' },
  { label: 'Zen Garden',       icon: '🎋', cat: 'scene', prompt: 'Serene Japanese zen garden with raked sand plane, stone lanterns with warm glow, bamboo clusters, and cherry blossom petal particles drifting softly in a calm morning light.' },
]

const WEBSITE_SUGGESTIONS = [
  { label: 'Product Landing',   icon: '🚀', cat: 'website', prompt: 'Build a stunning 3D product landing page. Create a dark showcase environment with a floating product on a pedestal, add a heading "The Future Is Here", a subheading paragraph, and a CTA button. Set up a scroll camera path from a dramatic wide shot to a close-up hero angle, then to a feature reveal, ending at a call-to-action view. Add bloom and vignette post-processing.' },
  { label: 'Portfolio Site',    icon: '💼', cat: 'website', prompt: 'Create a 3D portfolio website with a modern dark aesthetic. Add my name as a large 3D heading, a paragraph about my work, and project cards. Set up a smooth scroll-driven camera journey through the scene. Use deep space HDRI, add subtle particle scatter, and set up a cinematic camera path with 4 keypoints.' },
  { label: 'Agency Hero',       icon: '✨', cat: 'website', prompt: 'Build a bold 3D agency website hero section. Create a dark futuristic environment with neon accents, add a headline "We Build Worlds", tagline text, and a contact button. Set up a sweeping cinematic scroll camera. Use bloom and chromatic aberration for drama.' },
  { label: 'Tech Startup',      icon: '⚡', cat: 'website', prompt: 'Create a sci-fi tech startup landing page in 3D. Use glowing circuit-board aesthetics, floating geometric shapes with emissive materials, hologram-style text overlays, and an animated particle field. Add 4 scroll camera keypoints for a cinematic product journey.' },
  { label: 'Artist Showcase',   icon: '🎨', cat: 'website', prompt: 'Build a 3D art gallery showcase website. Gallery walls with warm lighting, floating art frames, soft ambient light, and a smooth scroll camera that pans through the gallery space. Add heading and paragraph HTML elements positioned in the 3D space.' },
  { label: 'Game Studio',       icon: '🎮', cat: 'website', prompt: 'Create a game studio website with a dramatic 3D game world preview — mountains, dark sky, neon accents. Add studio name heading, tagline, and a "Play Now" button. Set up a dramatic scroll-driven camera journey revealing the world from above to ground level.' },
]

const QUICK_ACTIONS = [
  { icon: '🌫️', label: 'Add fog', prompt: 'Add atmospheric exponential fog' },
  { icon: '💡', label: 'Better lighting', prompt: 'Improve the scene lighting with three-point setup and HDRI' },
  { icon: '✨', label: 'Add bloom', prompt: 'Enable bloom and vignette post-processing for a cinematic look' },
  { icon: '🌧️', label: 'Add rain', prompt: 'Add rain particle effect to the scene' },
  { icon: '⚡', label: 'Add sparks', prompt: 'Add sparks/fire particle effects' },
  { icon: '🏔️', label: 'Add terrain', prompt: 'Add procedural terrain with natural colors and 5m height variation' },
  { icon: '🌊', label: 'Add water', prompt: 'Add an animated water plane to the scene' },
  { icon: '🌃', label: 'Night mode', prompt: 'Switch scene to dramatic night time with dark sky, moonlight, and warm accent lights' },
  { icon: '🎬', label: 'Cinematic', prompt: 'Make the scene more cinematic: add depth of field, vignette, boost shadows and highlights' },
]

const BEHAVIOR_ICONS: Record<BehaviorConfig['type'], string> = {
  rotate: '↻', sway: '≈', oscillate: '↕', scalePulse: '⊕',
  emissivePulse: '✦', lookAtCamera: '◎', randomWander: '↪',
  patrol: '⬡', follow: '→', lookAt: '◉', onClick: '↖', proximityTrigger: '○',
}

function getRotatingSuggestions(appMode: string) {
  const list = appMode === 'website' ? WEBSITE_SUGGESTIONS : WORLD_SUGGESTIONS
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 6))
  const start = seed % list.length
  const out = []
  for (let i = 0; i < 6; i++) out.push(list[(start + i) % list.length])
  return out
}

function formatBehaviorParams(b: BehaviorConfig): string {
  const parts: string[] = []
  if (b.axis) parts.push(b.axis.toUpperCase())
  if (b.speed !== undefined) parts.push(`×${b.speed.toFixed(1)}`)
  if (b.amplitude !== undefined) parts.push(`amp:${b.amplitude}`)
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
  for (const t of types) {
    if (t === 'rotate') return ['Make it spin faster', 'Spin on the X axis']
    if (t === 'sway') return ['Make them sway more', 'Increase wind intensity']
    if (t === 'emissivePulse') return ['Make flames flicker faster', 'Add fire particles']
    if (t === 'randomWander') return ['Expand wander range', 'Add patrol path instead']
  }
  return []
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatPanel() {
  const appMode = useScene((s) => s.appMode)
  const objects = useScene((s) => s.objects)
  const environment = useScene((s) => s.environment)
  const cameraFov = useScene((s) => s.cameraFov)
  const cameraNear = useScene((s) => s.cameraNear)
  const cameraFar = useScene((s) => s.cameraFar)
  const viewMode = useScene((s) => s.viewMode)
  const cameraPath = useScene((s) => s.cameraPath)
  const undo = useScene((s) => s.undo)
  const past = useScene((s) => s.past)

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<HistoryMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Client-side only suggestions (avoids hydration mismatch)
  const [startSuggestions, setStartSuggestions] = useState<typeof WORLD_SUGGESTIONS>(() => WORLD_SUGGESTIONS.slice(0, 6))
  useEffect(() => { setStartSuggestions(getRotatingSuggestions(appMode)) }, [appMode])

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
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const t = e.results[0][0].transcript
      setInput((prev) => prev ? `${prev} ${t}` : t)
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
    setShowQuickActions(false)

    // Gallery shortcut
    const showMeMatch = prompt.match(/show\s+(?:me\s+)?(?:some\s+)?(.+?)\s*(hdris?|environments?|textures?|materials?|sketchfab|models?)/i)
    if (showMeMatch) {
      const query = showMeMatch[1].trim()
      const typeRaw = showMeMatch[2].toLowerCase()
      const type = typeRaw.startsWith('hdri') || typeRaw.startsWith('env') ? 'hdri'
        : typeRaw.startsWith('material') ? 'material'
        : typeRaw.startsWith('texture') ? 'texture'
        : 'sketchfab'
      setMessages((m) => [...m,
        { role: 'user', content: prompt },
        { role: 'assistant', content: `Here are some ${type === 'hdri' ? 'HDRI environments' : type} for "${query}". Click to apply.`, commandCount: 0, status: 'complete', gallery: { type, query } },
      ])
      return
    }

    const sceneContext = buildSceneContext(
      objects as Record<string, unknown>,
      environment as unknown as Record<string, unknown>,
      { fov: cameraFov, near: cameraNear, far: cameraFar, viewMode },
      appMode,
      cameraPath,
    )
    const enhancedPrompt = enhancePrompt(prompt, sceneContext)
    const systemPrompt = buildSystemPrompt(sceneContext)

    setMessages((m) => [...m,
      { role: 'user', content: prompt },
      { role: 'assistant', content: '', commandCount: 0, status: 'streaming' },
    ])
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
            const displayText = fullText.replace(/```(?:json)?\s*[\s\S]*?```/g, '').replace(/```[\s\S]*$/, '').trim()
            patchLast({ content: displayText || '…' })
            if (!executed && fullText.includes('```') && fullText.split('```').length > 2) {
              const { commands, actions, text, suggestions, gallery } = parseCommands(fullText)
              if (commands.length > 0 || actions.length > 0) {
                const result = executeCommands(commands, actions)
                const inferred = inferAmbientBehaviors(result.newObjectIds)
                const allBehaviors = [...result.behaviorAttachments, ...inferred]
                executed = true
                patchLast({
                  content: text || fullText.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim(),
                  commandCount: result.executed,
                  actionErrors: result.errors.length > 0 ? result.errors : undefined,
                  suggestions: getBehaviorSuggestions(allBehaviors).length > 0 ? getBehaviorSuggestions(allBehaviors) : suggestions,
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
        patchLast({ content: cleanedText, suggestions: suggestions ?? undefined, gallery: gallery ?? undefined, status: 'complete' })
      }

      const cleanText = text || fullText.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim()
      setConversationHistory((prev) => {
        const updated: HistoryMessage[] = [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: cleanText }]
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
  const isWebsite = appMode === 'website'

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0d0e13' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 h-9 shrink-0" style={{ borderBottom: '1px solid #1E2028', background: '#0b0c11' }}>
        <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #5B6CFF, #8B5CF6)' }}>
          <Sparkles size={10} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-[12px] font-semibold" style={{ color: '#E8E9F0' }}>AI Studio</span>
        {isWebsite && (
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: '#00aa6622', color: '#4ade80', border: '1px solid #00aa6633' }}>
            <Globe size={8} /> Website Mode
          </span>
        )}
        <span className="ml-auto text-[9px] font-mono" style={{ color: '#3a3e50' }}>claude-sonnet-4-6</span>
        {conversationHistory.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
            style={{ background: '#1a2050', color: '#5B6CFF', border: '1px solid #1a2050' }}>
            {conversationHistory.length / 2} turns
          </span>
        )}
      </div>

      {/* ── Messages / Empty state ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {isEmpty ? (
          <div className="flex flex-col gap-4 px-3 py-4">

            {/* Hero */}
            <div className="flex flex-col items-center text-center gap-2 pt-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #5B6CFF, #8B5CF6)', boxShadow: '0 0 30px rgba(91,108,255,0.35)' }}>
                <Wand2 size={24} className="text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[15px] font-bold leading-tight" style={{ color: '#E8E9F0' }}>
                  {isWebsite ? 'Build with AI' : 'World Builder AI'}
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#5a5e75' }}>
                  {isWebsite
                    ? 'Describe a website and I\'ll build it — scenes, text, scroll animation'
                    : 'Describe any scene and I\'ll build it — objects, lighting, particles, animation'}
                </p>
              </div>
            </div>

            {/* Quick actions row */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {QUICK_ACTIONS.slice(0, 5).map((a) => (
                  <button
                    key={a.label}
                    onClick={() => send(a.prompt)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 text-[10px] font-medium transition-all border whitespace-nowrap"
                    style={{ background: '#12141a', borderColor: '#1E2028', color: '#7A7E92' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF44'; e.currentTarget.style.color = '#C8C9D0'; e.currentTarget.style.background = '#0d1022' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.background = '#12141a' }}
                  >
                    <span>{a.icon}</span> {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category label */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#3a3e50' }}>
                {isWebsite ? '🌐 Website Templates' : '🎬 Scene Templates'}
              </span>
            </div>

            {/* Scene grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {startSuggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl text-left transition-all border"
                  style={{ background: '#0B0C0F', borderColor: '#1E2028', minHeight: 56 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF44'; e.currentTarget.style.background = '#0d1022' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.background = '#0B0C0F' }}
                >
                  <span className="text-[18px] leading-none">{s.icon}</span>
                  <span className="text-[10px] font-semibold leading-tight" style={{ color: '#C8C9D0' }}>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Capabilities hint */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#3a3e50' }}>What I can do</div>
              {[
                isWebsite
                  ? { icon: Globe, text: 'Build scroll-driven 3D websites with HTML overlays' }
                  : { icon: Trees, text: 'Generate complex scenes with lighting & atmosphere' },
                { icon: Sparkles, text: 'Add particles, terrain, water, behaviors & animations' },
                { icon: Camera, text: isWebsite ? 'Set up scroll-animated camera paths' : 'Set cinematic camera angles & post-FX' },
                { icon: Lightbulb, text: 'Iterate and refine — "make it darker", "add fog"' },
                { icon: Zap, text: 'Control every setting: materials, physics, particles' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  <Icon size={10} className="shrink-0 mt-0.5" style={{ color: '#5B6CFF' }} strokeWidth={2} />
                  <span className="text-[10px] leading-relaxed" style={{ color: '#5a5e75' }}>{text}</span>
                </div>
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

      {/* ── Quick actions dropdown ── */}
      {showQuickActions && (
        <div className="mx-3 mb-1 rounded-xl border overflow-hidden" style={{ background: '#0d0e13', borderColor: '#1E2028' }}>
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider" style={{ color: '#3a3e50', borderBottom: '1px solid #1E2028' }}>Quick actions</div>
          <div className="flex flex-col max-h-48 overflow-y-auto custom-scrollbar">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => send(a.prompt)}
                className="flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-colors"
                style={{ color: '#C8C9D0' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#12141a' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              >
                <span className="text-[14px] w-5 text-center">{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div className="p-3 pt-2 shrink-0" style={{ borderTop: '1px solid #1E2028' }}>
        <div className="relative rounded-xl transition-colors border"
          style={{ background: '#0B0C0F', borderColor: '#1E2028' }}
          onFocusCapture={(e) => e.currentTarget.style.borderColor = '#5B6CFF55'}
          onBlurCapture={(e) => e.currentTarget.style.borderColor = '#1E2028'}
        >
          {/* Zap quick-action button */}
          <button
            onClick={() => setShowQuickActions((v) => !v)}
            className="absolute left-2.5 bottom-2.5 w-6 h-6 flex items-center justify-center rounded-lg transition-all"
            title="Quick actions"
            style={{ background: showQuickActions ? '#5B6CFF22' : 'transparent', color: showQuickActions ? '#5B6CFF' : '#3a3e50' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#7A7E92' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = showQuickActions ? '#5B6CFF' : '#3a3e50' }}
          >
            <Zap size={11} />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); if (showQuickActions) setShowQuickActions(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } if (e.key === 'Escape') setShowQuickActions(false) }}
            placeholder={isWebsite ? 'Describe your website or page…' : 'Describe a scene, change, or ask anything…'}
            disabled={loading}
            rows={1}
            className="w-full bg-transparent resize-none pl-9 pr-20 py-2.5 text-[12px] leading-relaxed outline-none"
            style={{ color: '#E8E9F0', minHeight: '42px' }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                disabled={loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all relative"
                style={{ background: listening ? '#2a0a3a' : '#1E2028', color: listening ? '#c084fc' : '#7A7E92' }}
              >
                {listening && <span className="absolute inset-0 rounded-lg animate-ping" style={{ background: '#a855f730' }} />}
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
        <div className="flex items-center justify-between mt-1 px-1">
          <p className="text-[9px]" style={{ color: '#2a2e40' }}>Enter to send · Shift+Enter for newline{voiceSupported ? ' · Mic for voice' : ''}</p>
          <button
            onClick={() => setShowQuickActions((v) => !v)}
            className="flex items-center gap-0.5 text-[9px] transition-colors"
            style={{ color: '#3a3e50' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#5B6CFF' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#3a3e50' }}
          >
            <ChevronDown size={9} /> Quick actions
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BehaviorBadge({ attachment, onRemove }: { attachment: BehaviorAttachment; onRemove: () => void }) {
  const icon = BEHAVIOR_ICONS[attachment.behavior.type] ?? '◉'
  const desc = formatBehaviorParams(attachment.behavior)
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] select-none"
      style={{ background: '#071a1a', border: '1px solid #1a4040', color: '#4adece' }}>
      <span className="opacity-70">{icon}</span>
      <span className="font-medium" style={{ color: '#7deae4' }}>{attachment.objectName}</span>
      <span style={{ color: '#1a5050' }}>·</span>
      <span>{attachment.behavior.type}{desc}</span>
      <button onClick={onRemove} className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
        style={{ color: '#f87171', lineHeight: 1 }}>×</button>
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
        <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #5B6CFF, #8B5CF6)' }}>
          <Sparkles size={8} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#7A7E92' }}>Claude</span>
        {msg.commandCount > 0 && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px]"
            style={{ background: '#1a2a1a', color: '#4ade80', border: '1px solid #2a4a2a' }}>
            <CheckCircle2 size={8} strokeWidth={2} />
            {msg.commandCount} action{msg.commandCount !== 1 ? 's' : ''}
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
          <span>Building…</span>
        </div>
      ) : null}

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

      {msg.status === 'complete' && msg.commandCount > 0 && onUndo && (
        <button
          onClick={onUndo}
          className="self-start flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors border"
          style={{ color: '#7A7E92', borderColor: '#1E2028' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.background = '#1E2028' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.background = '' }}
        >
          <Undo2 size={9} strokeWidth={1.75} />
          Undo
        </button>
      )}

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

      {msg.gallery && <ChatAssetCarousel spec={msg.gallery} />}

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
