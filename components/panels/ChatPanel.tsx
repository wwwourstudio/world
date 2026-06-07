'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Sparkles, ArrowUp, Loader2, Undo2, AlertCircle, CheckCircle2,
  Mic, MicOff, Zap, Globe, Trees, Lightbulb, Camera, Wand2,
  ChevronDown, X, Check,
} from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { BehaviorConfig } from '@/lib/scene/SceneStore'
import { parseCommands, executeCommands, isSketchfabCmd, isTextureCmd, computeLayoutPositions } from '@/lib/ai/CommandParser'
import type { BehaviorAttachment, GallerySpec, AddSketchfabModelCmd, SetTextureCmd } from '@/lib/ai/CommandParser'
import { ChatAssetCarousel } from '@/components/panels/ChatAssetCarousel'
import { buildSystemPrompt, buildSceneContext, enhancePrompt } from '@/lib/ai/PromptEnhancer'
import { cameraFrameFn } from '@/lib/cameraFrame'

interface UserMessage { role: 'user'; content: string }
interface SketchfabPlacedModel { query: string; name: string; thumbnail: string | null }
interface ResolvedSketchfabModel { query: string; uid: string; name: string; url: string; thumbnail: string | null }
interface PendingSketchfab {
  cmds: AddSketchfabModelCmd[]
  resolved: ResolvedSketchfabModel[]
  fallbacks: string[]
  skippedUids?: string[]
}
interface AssistantMessage {
  role: 'assistant'
  content: string
  commandCount: number
  status: 'streaming' | 'resolving' | 'awaiting-confirm' | 'complete' | 'error'
  suggestions?: string[]
  actionErrors?: string[]
  behaviorAttachments?: BehaviorAttachment[]
  gallery?: GallerySpec
  sketchfabResults?: SketchfabPlacedModel[]
  resolveCount?: number
  pendingSketchfab?: PendingSketchfab
}
type Message = UserMessage | AssistantMessage
type HistoryMessage = { role: 'user' | 'assistant'; content: string }

// Infer a sensible real-world size (meters, largest dimension) from a search query
// so Sketchfab models look proportional even when the AI omits targetSize.
function defaultTargetSize(query: string): number | undefined {
  const q = query.toLowerCase()
  if (/\b(skyscraper|tower|high.?rise)\b/.test(q)) return 45
  if (/\b(building|warehouse|factory|hangar|facade|house|cabin|barn|temple|castle)\b/.test(q)) return 22
  if (/\b(crane|silo|windmill)\b/.test(q)) return 18
  if (/\b(truck|bus|train|boat|ship)\b/.test(q)) return 9
  if (/\b(tree|car|vehicle|tank)\b/.test(q)) return 5
  if (/\b(lamp|post|pillar|column|statue|door|fence)\b/.test(q)) return 4
  if (/\b(pipe|barrel|crate|rock|boulder|bush|cart|stall)\b/.test(q)) return 2.5
  if (/\b(prop|debris|tool|box|plant|flower|lantern)\b/.test(q)) return 1
  return undefined // renderer defaults to 2m
}

const SKETCHFAB_MAT = {
  type: 'standard' as const, color: '#ffffff', roughness: 0.5, metalness: 0,
  emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false,
  wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5,
  flatShading: false, side: 'front' as const,
}

// Build the addObject configs for a set of resolved Sketchfab commands.
// Pure (no store access) so it can be reused by both auto-place and confirm-place.
function buildSketchfabObjects(
  cmds: AddSketchfabModelCmd[],
  resolved: ResolvedSketchfabModel[],
  skippedUids: string[] = [],
): Array<Parameters<ReturnType<typeof useScene.getState>['addObject']>[0]> {
  const configs: Array<Parameters<ReturnType<typeof useScene.getState>['addObject']>[0]> = []
  for (const cmd of cmds) {
    const models = resolved.filter((r) => r.query === cmd.query && !skippedUids.includes(r.uid))
    const totalCount = Math.max(cmd.count ?? 1, 1)
    const positions = computeLayoutPositions(
      totalCount,
      cmd.layout ?? 'grid',
      cmd.position ?? [0, 0, 0],
      cmd.spacing ?? 4,
      cmd.yOffset ?? 0,
    )

    if (models.length === 0) {
      configs.push({
        name: cmd.name ?? cmd.query,
        type: 'mesh',
        geometry: { type: 'box', width: 2, height: 2, depth: 2 },
        material: { ...SKETCHFAB_MAT, color: '#cc3333' },
        transform: { position: positions[0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      })
      continue
    }

    const targetSize = cmd.targetSize ?? defaultTargetSize(cmd.query)
    for (let i = 0; i < totalCount; i++) {
      const model = models[i % models.length]
      // Scatter layout: randomize Y rotation per instance so props don't all face the same way
      const baseRotation = cmd.rotation ?? [0, 0, 0]
      const rotation: [number, number, number] = cmd.layout === 'scatter'
        ? [baseRotation[0], Math.random() * Math.PI * 2, baseRotation[2]]
        : baseRotation
      configs.push({
        name: `${cmd.name ?? model.name}${totalCount > 1 ? ` ${i + 1}` : ''}`,
        type: 'mesh',
        geometry: { type: 'gltf', url: model.url, targetSize },
        material: SKETCHFAB_MAT,
        transform: {
          position: positions[i],
          rotation,
          scale: cmd.scale ?? [1, 1, 1],
        },
        castShadow: true,
        receiveShadow: true,
      })
    }
  }
  return configs
}

// ─── Suggestion sets ──────────────────────────────────────────────────────────

const WORLD_SUGGESTIONS = [
  { label: 'Ancient Forest',   icon: '🌲', cat: 'scene', prompt: 'Build a dense ancient forest using Sketchfab models: pine trees (variety:4, scatter layout), mossy rocks, fallen logs, and fern underbrush. Use forest_slope HDRI, exponential green fog, warm directional light through canopy, and enable ssao for depth. Add dappled point lights through branches.' },
  { label: 'Sci-Fi Base',      icon: '🛸', cat: 'scene', prompt: 'Create a triple-A sci-fi military base with Sketchfab models: sci-fi buildings (targetSize:18), metal corridors, glowing control panels, mechanical pipes and vents. Use satara_night HDRI, blue/cyan neon point lights, bloom with chromatic aberration, ssao, and heavy fog. Emissive materials on panels.' },
  { label: 'Medieval Village', icon: '🏰', cat: 'scene', prompt: 'Build an AAA medieval village with Sketchfab models: medieval houses (variety:4, grid layout), market stalls, wooden carts, stone well, hay bales. Use kloppenheim HDRI, warm directional sun, torch point lights (orange/amber), ssao, light fog. Dirt ground plane. Swaying flags behavior.' },
  { label: 'Cyberpunk City',   icon: '🏙️', cat: 'scene', prompt: 'Create a triple-A cyberpunk city at night with Sketchfab models: city building facades (variety:4, targetSize:25), street lamps, road sections. Use satara_night HDRI, heavy rain particles, pink/cyan neon point lights, glossy wet-street ground (roughness 0.05), bloom + chromatic aberration + ssao + vignette.' },
  { label: 'Space Station',    icon: '🚀', cat: 'scene', prompt: 'Build an epic space station using Sketchfab models: sci-fi corridor panels, solar panels, docking bay components. Deep space background (#000000), no HDRI (use point lights instead), blue/white accent lights, floating debris particles, bloom intensity 0.8, ssao for panel depth.' },
  { label: 'Golden Sunset',    icon: '🌅', cat: 'scene', prompt: 'Create a cinematic golden sunset scene: venice_sunset HDRI, rolling terrain with warm golden colors, Sketchfab trees silhouetted on the horizon, warm orange directional light at low angle, golden dust scatter particles, vignette + ssao. Exposure 1.2.' },
  { label: 'Abandoned Factory',icon: '🏚️', cat: 'scene', prompt: 'Build an abandoned industrial factory with Sketchfab models: warehouse building, rusty pipe sections, cardboard pallets, broken machinery, chain-link fence. Use overcast_soil HDRI, desaturated palette, rust-colored point lights, heavy exponential fog, ssao cranked up (intensity 3.0), noise grain.' },
  { label: 'Winter Cabin',     icon: '🏔️', cat: 'scene', prompt: 'Build a cozy AAA winter cabin scene: snowy_field HDRI, Sketchfab pine trees dusted in snow, cabin building (targetSize:9), frozen pond (water plane, blue-white), snow particles. Warm amber light from windows (point light), cool directional moonlight, ssao, light blue fog.' },
  { label: 'Jungle Temple',    icon: '🏛️', cat: 'scene', prompt: 'Ancient jungle temple scene using Sketchfab models: stone temple ruins (targetSize:15), jungle trees (variety:4, scatter), tropical plants, rocks covered in moss. Use forest_slope HDRI, god-ray spot lights through canopy, mystical emissive runes, ssao for stone depth, green fog.' },
  { label: 'Volcano Island',   icon: '🌋', cat: 'scene', prompt: 'Dramatic volcanic island: terrain with lava colors (lowColor #1a0800, midColor #8B1A00, highColor #ff4400), emissive lava flow objects, Sketchfab volcanic rocks. Orange/red point lights near lava, heavy dark fog (#1a0800), fire + smoke particles, ssao, bloom intensity 0.6.' },
  { label: 'Product Showcase', icon: '💎', cat: 'scene', prompt: 'Build a premium product showcase: brown_photostudio or studio_small HDRI, dark dramatic background, chrome pedestal (box, chrome material), three-point studio lighting (key front-right 2.0, fill left 0.7, rim behind 1.5 blue tint), ssao, subtle dof (focus on object). Perfect for product visualization.' },
  { label: 'Desert Ruins',     icon: '🏜️', cat: 'scene', prompt: 'Build an epic desert ruins scene with Sketchfab models: ancient stone pillars (targetSize:8, scatter), broken walls, archaeological debris. Use golden_bay HDRI, strong warm directional sun at low angle, sand-colored terrain, heat haze via vignette + slight bloom. Ssao for stone crevice depth.' },
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
  { icon: '🎮', label: 'AAA quality', prompt: 'Make this scene look like a triple-A game: enable ambient occlusion (ssao intensity 2.0), add bloom, vignette, and choose the best HDRI for the current mood. Add more detail props via Sketchfab if the scene looks sparse.' },
  { icon: '🌫️', label: 'Add fog', prompt: 'Add atmospheric exponential fog to establish depth and mood' },
  { icon: '💡', label: 'Better lighting', prompt: 'Improve the scene lighting with a directional key light, two accent point lights, and the best HDRI for the current scene theme' },
  { icon: '✨', label: 'Add bloom', prompt: 'Enable bloom and vignette post-processing for a cinematic look' },
  { icon: '🔭', label: 'Enable AO', prompt: 'Enable ambient occlusion (ssao: true, intensity 2.0, radius 0.15) for a realistic grounded look' },
  { icon: '🌧️', label: 'Add rain', prompt: 'Add rain particle effect to the scene' },
  { icon: '⚡', label: 'Add sparks', prompt: 'Add sparks/fire particle effects' },
  { icon: '🏔️', label: 'Add terrain', prompt: 'Add procedural terrain with natural colors and 5m height variation' },
  { icon: '🌊', label: 'Add water', prompt: 'Add an animated water plane to the scene' },
  { icon: '🌃', label: 'Night mode', prompt: 'Switch scene to dramatic night time: satara_night HDRI, moonlight directional, warm point lights, exponential fog, and enable ssao for depth' },
  { icon: '🎬', label: 'Cinematic', prompt: 'Make the scene more cinematic: enable ssao for depth, depth of field, vignette, boost contrast, and set the best HDRI' },
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

  const autoPlaceSketchfab = useScene((s) => s.autoPlaceSketchfab)

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
  // Mirror messages into a ref so handlers can read latest without stale closure
  const messagesRef = useRef<Message[]>([])
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Client-side only suggestions (avoids hydration mismatch)
  const [startSuggestions, setStartSuggestions] = useState<typeof WORLD_SUGGESTIONS>(() => WORLD_SUGGESTIONS.slice(0, 6))
  useEffect(() => { setStartSuggestions(getRotatingSuggestions(appMode)) }, [appMode])

  // Detect SpeechRecognition after mount to avoid SSR/client mismatch (React #418)
  const [voiceSupported, setVoiceSupported] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    setVoiceSupported(!!(win.SpeechRecognition || win.webkitSpeechRecognition))
  }, [])

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

  function patchAt(idx: number, patch: Partial<AssistantMessage>) {
    setMessages((m) => {
      if (idx < 0 || idx >= m.length || m[idx].role !== 'assistant') return m
      return [...m.slice(0, idx), { ...m[idx], ...patch } as AssistantMessage, ...m.slice(idx + 1)]
    })
  }

  const placeSketchfab = useCallback((msgIdx: number) => {
    const msg = messagesRef.current[msgIdx]
    if (!msg || msg.role !== 'assistant' || !msg.pendingSketchfab) return
    const { cmds, resolved, fallbacks, skippedUids = [] } = msg.pendingSketchfab
    const configs = buildSketchfabObjects(cmds, resolved, skippedUids)
    if (configs.length > 0) {
      useScene.getState().addObjectsBatch(configs)
      const positions = configs.map((c) => c.transform?.position ?? ([0, 0, 0] as [number, number, number]))
      const cx = positions.reduce((s, p) => s + p[0], 0) / positions.length
      const cz = positions.reduce((s, p) => s + p[2], 0) / positions.length
      const spread = positions.reduce((s, p) => Math.max(s, Math.hypot(p[0] - cx, p[2] - cz)), 5)
      setTimeout(() => cameraFrameFn.current?.([cx, 0, cz], Math.min(60, spread * 2.5)), 400)
    }
    if (fallbacks?.length) {
      useScene.getState().showNotification(`Sketchfab: no models found for "${fallbacks.join('", "')}" — used placeholders`)
    }
    const placedModels: SketchfabPlacedModel[] = resolved
      .filter((r) => !skippedUids.includes(r.uid))
      .map((r) => ({ query: r.query, name: r.name, thumbnail: r.thumbnail }))
    patchAt(msgIdx, { status: 'complete', pendingSketchfab: undefined, sketchfabResults: placedModels.length ? placedModels : undefined })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skipSketchfab = useCallback((msgIdx: number) => {
    patchAt(msgIdx, { status: 'complete', pendingSketchfab: undefined })
    useScene.getState().showNotification('Sketchfab models skipped')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSkippedUid = useCallback((msgIdx: number, uid: string) => {
    setMessages((m) => {
      const msg = m[msgIdx]
      if (!msg || msg.role !== 'assistant' || !msg.pendingSketchfab) return m
      const prev = msg.pendingSketchfab.skippedUids ?? []
      const skippedUids = prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
      return [
        ...m.slice(0, msgIdx),
        { ...msg, pendingSketchfab: { ...msg.pendingSketchfab, skippedUids } } as AssistantMessage,
        ...m.slice(msgIdx + 1),
      ]
    })
  }, [])

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
      let syncCommandCount = 0

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
              const syncCmdsEarly = commands.filter((cmd) => !isSketchfabCmd(cmd) && !isTextureCmd(cmd))
              if (syncCmdsEarly.length > 0 || actions.length > 0) {
                const result = executeCommands(syncCmdsEarly, actions)
                syncCommandCount = result.executed
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
      const sketchfabCmds = commands.filter(isSketchfabCmd) as AddSketchfabModelCmd[]
      const textureCmds = commands.filter(isTextureCmd) as SetTextureCmd[]
      const syncCmds = commands.filter((cmd) => !isSketchfabCmd(cmd) && !isTextureCmd(cmd))
      const hasSketchfab = sketchfabCmds.length > 0

      if (!executed && (syncCmds.length > 0 || actions.length > 0)) {
        const result = executeCommands(syncCmds, actions)
        syncCommandCount = result.executed
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
          status: hasSketchfab ? 'resolving' : 'complete',
        })
      } else {
        patchLast({ content: cleanedText, suggestions: suggestions ?? undefined, gallery: gallery ?? undefined, status: hasSketchfab ? 'resolving' : 'complete' })
      }

      if (hasSketchfab) {
        try {
          const totalRequested = sketchfabCmds.reduce((s, c) => s + Math.max(c.count ?? 1, 1), 0)
          patchLast({ resolveCount: totalRequested })
          const resolveBody = {
            queries: sketchfabCmds.map((cmd) => ({
              query: cmd.query,
              count: cmd.variety ?? 1,
            })),
          }
          const resolveRes = await fetch('/api/sketchfab/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resolveBody),
          })
          if (!resolveRes.ok) {
            let errorMsg = `Sketchfab resolve failed (${resolveRes.status})`
            try {
              const errData = await resolveRes.json() as { error?: string }
              if (errData.error?.includes('API_KEY'))
                errorMsg = 'Sketchfab is not configured — add SKETCHFAB_API_KEY to your environment variables'
              else if (errData.error) errorMsg = errData.error
            } catch { /* ignore parse error */ }
            throw new Error(errorMsg)
          }

          const resolveData = await resolveRes.json() as {
            results: Array<{ query: string; uid: string; name: string; url: string; thumbnail: string | null }>
            fallbacks: string[]
          }

          if (autoPlaceSketchfab) {
            // Escape hatch: place immediately without preview
            const configs = buildSketchfabObjects(sketchfabCmds, resolveData.results)
            if (configs.length > 0) {
              useScene.getState().addObjectsBatch(configs)
              const positions = configs.map((c) => c.transform?.position ?? ([0, 0, 0] as [number, number, number]))
              const cx = positions.reduce((s, p) => s + p[0], 0) / positions.length
              const cz = positions.reduce((s, p) => s + p[2], 0) / positions.length
              const spread = positions.reduce((s, p) => Math.max(s, Math.hypot(p[0] - cx, p[2] - cz)), 5)
              setTimeout(() => cameraFrameFn.current?.([cx, 0, cz], Math.min(60, spread * 2.5)), 400)
            }
            if (resolveData.fallbacks?.length) {
              useScene.getState().showNotification(`Sketchfab: no models found for "${resolveData.fallbacks.join('", "')}" — used placeholders`)
            }
            const placedModels: SketchfabPlacedModel[] = resolveData.results.map((r) => ({
              query: r.query, name: r.name, thumbnail: r.thumbnail ?? null,
            }))
            patchLast({ commandCount: syncCommandCount + configs.length, status: 'complete', sketchfabResults: placedModels.length ? placedModels : undefined })
          } else {
            // Default: show preview grid and wait for user confirmation
            patchLast({
              status: 'awaiting-confirm',
              pendingSketchfab: {
                cmds: sketchfabCmds,
                resolved: resolveData.results,
                fallbacks: resolveData.fallbacks ?? [],
              },
            })
          }
        } catch (e) {
          useScene.getState().showNotification(`Sketchfab error: ${e instanceof Error ? e.message : 'Failed to load models'}`)
          patchLast({ status: 'complete' })
        }
      }

      // Resolve and apply set_texture commands (async, fire-and-forget per cmd)
      if (textureCmds.length > 0) {
        const store = useScene.getState()
        for (const cmd of textureCmds) {
          try {
            const res = await fetch(`/api/polyhaven/search-texture?q=${encodeURIComponent(cmd.query)}`)
            if (!res.ok) {
              const err = await res.json() as { error?: string }
              store.showNotification(`Texture not found: ${cmd.query}${err.error ? ` — ${err.error}` : ''}`)
              continue
            }
            const data = await res.json() as { id: string; name: string; maps: Record<string, string> }
            const targets = cmd.target
              ? Object.values(store.objects).filter(o => o.name.toLowerCase().includes(cmd.target!.toLowerCase()))
              : store.selectedIds.map(id => store.objects[id]).filter(Boolean)
            if (targets.length === 0) {
              store.showNotification(`set_texture: no objects matched "${cmd.target ?? 'selection'}"`)
              continue
            }
            for (const obj of targets) {
              store.updateObject(obj.id, {
                material: { maps: data.maps, textureRepeat: cmd.repeat ?? [4, 4] },
              })
            }
            store.showNotification(`Texture applied: ${data.name}`)
          } catch (e) {
            useScene.getState().showNotification(`Texture error: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
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
                  msgIdx={i}
                  isLast={i === messages.length - 1}
                  loading={loading && i === messages.length - 1}
                  onUndo={past.length > 0 ? undo : undefined}
                  onSuggestion={send}
                  onPlace={placeSketchfab}
                  onSkip={skipSketchfab}
                  onToggleSkip={toggleSkippedUid}
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

function AssistantBubble({ msg, msgIdx, loading, onUndo, onSuggestion, onPlace, onSkip, onToggleSkip }: {
  msg: AssistantMessage
  msgIdx: number
  isLast: boolean
  loading: boolean
  onUndo?: () => void
  onSuggestion?: (prompt: string) => void
  onPlace?: (idx: number) => void
  onSkip?: (idx: number) => void
  onToggleSkip?: (idx: number, uid: string) => void
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

      {msg.status === 'resolving' && (
        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#8B9CF4' }}>
          <Loader2 size={11} className="animate-spin" />
          <span>Fetching {msg.resolveCount ? `${msg.resolveCount} ` : ''}3D models from Sketchfab…</span>
        </div>
      )}

      {msg.status === 'awaiting-confirm' && msg.pendingSketchfab && onPlace && onSkip && onToggleSkip && (
        <SketchfabPreview
          pending={msg.pendingSketchfab}
          onPlace={() => onPlace(msgIdx)}
          onSkip={() => onSkip(msgIdx)}
          onToggleSkip={(uid) => onToggleSkip(msgIdx, uid)}
        />
      )}

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

      {(msg.status === 'complete') && msg.commandCount > 0 && onUndo && (
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

      {msg.sketchfabResults && msg.sketchfabResults.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#3a3e50' }}>
            {msg.sketchfabResults.length} model{msg.sketchfabResults.length !== 1 ? 's' : ''} placed
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {msg.sketchfabResults.map((r, i) => (
              <div key={i} className="shrink-0 flex flex-col gap-0.5" style={{ width: 56 }}>
                <div className="rounded-md overflow-hidden" style={{ width: 56, height: 42, background: '#12141a', border: '1px solid #1E2028' }}>
                  {r.thumbnail
                    ? <img src={r.thumbnail} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div className="w-full h-full flex items-center justify-center text-base">📦</div>}
                </div>
                <span className="text-[9px] leading-tight truncate" style={{ color: '#7A7E92' }} title={r.name}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

// ─── Sketchfab Preview ────────────────────────────────────────────────────────

function SketchfabPreview({
  pending,
  onPlace,
  onSkip,
  onToggleSkip,
}: {
  pending: PendingSketchfab
  onPlace: () => void
  onSkip: () => void
  onToggleSkip: (uid: string) => void
}) {
  const { resolved, fallbacks, skippedUids = [] } = pending

  // Group resolved models by query
  const byQuery = useMemo(() => {
    const map = new Map<string, ResolvedSketchfabModel[]>()
    for (const r of resolved) {
      const arr = map.get(r.query) ?? []
      arr.push(r)
      map.set(r.query, arr)
    }
    return map
  }, [resolved])

  const activeCount = resolved.filter((r) => !skippedUids.includes(r.uid)).length
  const totalModels = resolved.length + (fallbacks?.length ?? 0)

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0a0b10', borderColor: '#1E2028' }}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid #1E2028', background: '#0d0e13' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#8B9CF4' }}>
          {totalModels} model{totalModels !== 1 ? 's' : ''} ready to place
        </span>
        <span className="ml-auto text-[9px]" style={{ color: '#3a3e50' }}>
          click × to remove before placing
        </span>
      </div>

      {/* Model grid */}
      <div className="px-3 py-2 flex flex-col gap-3">
        {Array.from(byQuery.entries()).map(([query, models]) => (
          <div key={query} className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-wider truncate" style={{ color: '#5a5e75' }} title={query}>
              {query}
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {models.map((r) => {
                const skipped = skippedUids.includes(r.uid)
                return (
                  <div key={r.uid} className="shrink-0 flex flex-col gap-0.5 relative" style={{ width: 56 }}>
                    <div
                      className="rounded-md overflow-hidden relative cursor-pointer transition-opacity"
                      style={{
                        width: 56, height: 42,
                        background: '#12141a',
                        border: `1px solid ${skipped ? '#cc333355' : '#1E2028'}`,
                        opacity: skipped ? 0.4 : 1,
                      }}
                      onClick={() => onToggleSkip(r.uid)}
                      title={skipped ? 'Click to include' : 'Click to remove'}
                    >
                      {r.thumbnail
                        ? <img src={r.thumbnail} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div className="w-full h-full flex items-center justify-center text-base">📦</div>}
                      {/* Toggle overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: skipped ? '#00000066' : '#cc333355' }}>
                        {skipped
                          ? <Check size={14} className="text-white" strokeWidth={2.5} />
                          : <X size={14} className="text-white" strokeWidth={2.5} />}
                      </div>
                    </div>
                    <span className="text-[9px] leading-tight truncate" style={{ color: skipped ? '#3a3e50' : '#7A7E92' }} title={r.name}>
                      {r.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Fallbacks notice */}
        {fallbacks && fallbacks.length > 0 && (
          <div className="text-[9px] px-2 py-1 rounded-md" style={{ background: '#1a0808', border: '1px solid #4a1515', color: '#f87171' }}>
            No results for: {fallbacks.join(', ')} — placeholders will be used
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: '1px solid #1E2028', background: '#0d0e13' }}>
        <button
          onClick={onPlace}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #5B6CFF, #7c3aed)', color: '#ffffff' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <Check size={11} strokeWidth={2.5} />
          Place {activeCount > 0 ? `${activeCount} ` : ''}model{activeCount !== 1 ? 's' : ''}
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-all border"
          style={{ color: '#7A7E92', borderColor: '#1E2028', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.background = '#1E2028' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.background = 'transparent' }}
        >
          Skip all
        </button>
      </div>
    </div>
  )
}
