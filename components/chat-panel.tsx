'use client'

import { useState, useRef, useEffect } from 'react'
import { useWorldBuilder } from '@/lib/store'
import { Loader2, Sparkles, ArrowUp, Box, Package, Sun, CheckCircle2, Undo2 } from 'lucide-react'
import type { HDRI, Weather } from '@/lib/constants'

type ActionStatus = 'pending' | 'running' | 'done' | 'error'

interface ChatAction {
  id: string
  tool: string
  status: ActionStatus
  label: string
  detail?: string
}

interface UserMessage {
  role: 'user'
  content: string
}

interface AssistantMessage {
  role: 'assistant'
  content: string
  actions: ChatAction[]
  status: 'streaming' | 'complete' | 'error'
}

type Message = UserMessage | AssistantMessage

const SUGGESTED_PROMPTS = [
  { label: 'Build a small forest with trees and rocks', short: 'Forest', icon: '🌲' },
  { label: 'Make a sci-fi base on a desert planet', short: 'Sci-fi base', icon: '🛸' },
  { label: 'Create a medieval village with a few houses', short: 'Village', icon: '🏰' },
  { label: 'Set a sunset over the lake with warm light', short: 'Sunset', icon: '🌅' },
]

function actionLabel(tool: string, input: Record<string, unknown>): { label: string; detail?: string } {
  if (tool === 'add_object') {
    const name = input.name as string | undefined
    const type = input.type as string | undefined
    return { label: `Added ${name ?? type ?? 'object'}`, detail: type }
  }
  if (tool === 'search_model') {
    const query = input.query as string | undefined
    return { label: `Imported "${query ?? 'model'}"`, detail: 'Sketchfab' }
  }
  if (tool === 'modify_environment') {
    const bits: string[] = []
    if (input.hdri) bits.push(input.hdri as string)
    if (input.timeOfDay !== undefined) bits.push(`${input.timeOfDay}h`)
    if (input.weather) bits.push(input.weather as string)
    return { label: 'Set environment', detail: bits.join(' · ') || undefined }
  }
  return { label: tool }
}

function ActionIcon({ tool, status }: { tool: string; status: ActionStatus }) {
  if (status === 'running' || status === 'pending') {
    return <Loader2 size={11} className="animate-spin text-zinc-400" strokeWidth={2} />
  }
  if (status === 'error') {
    return <span className="text-red-400 text-[10px]">!</span>
  }
  if (tool === 'add_object') return <Box size={11} className="text-emerald-400" strokeWidth={1.75} />
  if (tool === 'search_model') return <Package size={11} className="text-violet-400" strokeWidth={1.75} />
  if (tool === 'modify_environment') return <Sun size={11} className="text-amber-400" strokeWidth={1.75} />
  return <CheckCircle2 size={11} className="text-zinc-400" strokeWidth={1.75} />
}

export function ChatPanel() {
  const addObject = useWorldBuilder((s) => s.addObject)
  const setHDRI = useWorldBuilder((s) => s.setHDRI)
  const setTimeOfDay = useWorldBuilder((s) => s.setTimeOfDay)
  const setWeather = useWorldBuilder((s) => s.setWeather)
  const beginTransaction = useWorldBuilder((s) => s.beginTransaction)
  const endTransaction = useWorldBuilder((s) => s.endTransaction)
  const undo = useWorldBuilder((s) => s.undo)
  const objects = useWorldBuilder((s) => s.objects)
  const currentHDRI = useWorldBuilder((s) => s.currentHDRI)
  const timeOfDay = useWorldBuilder((s) => s.timeOfDay)
  const weather = useWorldBuilder((s) => s.weather)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    if (!stickToBottomRef.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  function autoSize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  useEffect(autoSize, [input])

  function patchLastAssistant(patch: Partial<AssistantMessage> | ((m: AssistantMessage) => AssistantMessage)) {
    setMessages((m) => {
      const idx = m.length - 1
      if (idx < 0) return m
      const last = m[idx]
      if (last.role !== 'assistant') return m
      const next = typeof patch === 'function' ? patch(last) : { ...last, ...patch }
      return [...m.slice(0, idx), next]
    })
  }

  async function executeAction(actionId: string, tool: string, input: Record<string, unknown>) {
    if (tool === 'add_object') {
      const inp = input as {
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
    } else if (tool === 'search_model') {
      const inp = input as { query: string; position?: [number, number, number] }
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
          return
        }
      }
      throw new Error('No model found')
    } else if (tool === 'modify_environment') {
      const inp = input as { hdri?: string; timeOfDay?: number; weather?: string }
      if (inp.hdri) setHDRI(inp.hdri as HDRI)
      if (inp.timeOfDay !== undefined) setTimeOfDay(inp.timeOfDay)
      if (inp.weather) setWeather(inp.weather as Weather)
    }
    // mark action as done
    patchLastAssistant((msg) => ({
      ...msg,
      actions: msg.actions.map((a) => (a.id === actionId ? { ...a, status: 'done' } : a)),
    }))
  }

  async function send(promptOverride?: string) {
    const prompt = (promptOverride ?? input).trim()
    if (!prompt || loading) return
    setInput('')
    stickToBottomRef.current = true

    const assistant: AssistantMessage = { role: 'assistant', content: '', actions: [], status: 'streaming' }
    setMessages((m) => [...m, { role: 'user', content: prompt }, assistant])
    setLoading(true)
    beginTransaction()

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sceneContext: { objects, currentHDRI, timeOfDay, weather },
        }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder()
      let buffer = ''
      let receivedError = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: { type: string; [k: string]: unknown }
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue
          }

          if (event.type === 'text_delta') {
            const t = event.text as string
            patchLastAssistant((msg) => ({ ...msg, content: msg.content + t }))
          } else if (event.type === 'tool_use_start') {
            const id = event.id as string
            const name = event.name as string
            const { label } = actionLabel(name, {})
            patchLastAssistant((msg) => ({
              ...msg,
              actions: [...msg.actions, { id, tool: name, status: 'pending', label }],
            }))
          } else if (event.type === 'tool_use_complete') {
            const id = event.id as string
            const name = event.name as string
            const input = event.input as Record<string, unknown>
            const { label, detail } = actionLabel(name, input)

            patchLastAssistant((msg) => ({
              ...msg,
              actions: msg.actions.map((a) =>
                a.id === id ? { ...a, status: 'running', label, detail } : a,
              ),
            }))

            try {
              await executeAction(id, name, input)
            } catch {
              patchLastAssistant((msg) => ({
                ...msg,
                actions: msg.actions.map((a) =>
                  a.id === id ? { ...a, status: 'error' } : a,
                ),
              }))
            }
          } else if (event.type === 'error') {
            receivedError = true
            patchLastAssistant({ content: `⚠ ${event.error as string}`, status: 'error' })
          }
        }
      }

      patchLastAssistant((msg) => ({ ...msg, status: receivedError ? 'error' : 'complete' }))
    } catch {
      patchLastAssistant({ content: 'Failed to reach the server. Check your connection and try again.', status: 'error' })
    } finally {
      endTransaction()
      setLoading(false)
    }
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    stickToBottomRef.current = atBottom
  }

  const isEmpty = messages.length === 0

  return (
    <aside className="flex flex-col w-96 border-r border-zinc-800 shrink-0 overflow-hidden" style={{ backgroundColor: '#141416' }}>
      <div className="flex items-center gap-2 h-11 px-4 border-b border-zinc-800 shrink-0">
        <Sparkles size={13} className="text-orange-400" strokeWidth={1.75} />
        <span className="text-[13px] text-zinc-200 font-medium">Chat</span>
        <span className="text-[11px] text-zinc-600 truncate">claude-sonnet-4-6</span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
              <Sparkles size={20} className="text-white" strokeWidth={1.75} />
            </div>
            <h2 className="text-[15px] text-zinc-100 font-medium mb-1.5">Build a world with Claude</h2>
            <p className="text-[12px] text-zinc-500 max-w-[260px] leading-relaxed mb-6">
              Describe a scene. Claude places objects, imports Sketchfab models, and sets the environment.
            </p>
            <div className="grid grid-cols-2 gap-1.5 w-full max-w-[280px]">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p.short}
                  onClick={() => send(p.label)}
                  className="group flex flex-col items-start gap-1.5 px-3 py-2.5 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-150"
                >
                  <span className="text-[18px] leading-none">{p.icon}</span>
                  <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 font-medium leading-tight">{p.short}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-5">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserBubble key={i} content={m.content} />
              ) : (
                <AssistantTurn
                  key={i}
                  msg={m}
                  isLast={i === messages.length - 1}
                  loading={loading && i === messages.length - 1}
                  onUndoTurn={undo}
                />
              ),
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800 shrink-0">
        <div className="relative rounded-xl bg-zinc-800/50 border border-zinc-700 focus-within:border-orange-500/60 focus-within:bg-zinc-800/80 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask Claude to build something…"
            disabled={loading}
            rows={1}
            className="w-full bg-transparent resize-none px-3.5 py-2.5 pr-10 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none leading-relaxed"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="absolute right-1.5 bottom-1.5 w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={14} strokeWidth={2.5} />}
          </button>
        </div>
        <div className="mt-1.5 px-1 text-[10px] text-zinc-600">
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </aside>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-zinc-800 px-3.5 py-2 text-[13px] text-zinc-100 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

function AssistantTurn({
  msg,
  loading,
  onUndoTurn,
}: {
  msg: AssistantMessage
  isLast: boolean
  loading: boolean
  onUndoTurn: () => void
}) {
  const doneCount = msg.actions.filter((a) => a.status === 'done').length
  const showSummary = msg.status === 'complete' && doneCount > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center">
          <Sparkles size={9} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Claude</span>
      </div>

      {msg.status === 'error' && msg.content ? (
        <div className="px-3 py-2 rounded-lg bg-red-950/40 border border-red-900/50 text-[12px] text-red-300 leading-relaxed">
          {msg.content.replace(/^⚠\s*/, '')}
        </div>
      ) : msg.content ? (
        <div className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {msg.content}
          {loading && msg.status === 'streaming' && (
            <span className="inline-block w-1 h-3.5 bg-orange-400 ml-0.5 align-text-bottom animate-pulse rounded-sm" />
          )}
        </div>
      ) : null}

      {!msg.content && loading && (
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <Loader2 size={12} className="animate-spin" />
          <span>Thinking…</span>
        </div>
      )}

      {msg.actions.length > 0 && (
        <div className="flex flex-col gap-1 mt-0.5">
          {msg.actions.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] transition-colors ${
                a.status === 'error'
                  ? 'border-red-900/50 bg-red-950/30 text-red-300'
                  : a.status === 'done'
                    ? 'border-zinc-800 bg-zinc-900/50 text-zinc-300'
                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-400'
              }`}
            >
              <ActionIcon tool={a.tool} status={a.status} />
              <span className="flex-1 truncate">{a.label}</span>
              {a.detail && <span className="text-zinc-600 text-[10px] truncate max-w-[100px]">{a.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {showSummary && (
        <div className="mt-1 flex items-center justify-between px-3 py-2 rounded-md bg-zinc-900/60 border border-zinc-800">
          <span className="text-[11px] text-zinc-400">
            {doneCount} {doneCount === 1 ? 'change' : 'changes'} to scene
          </span>
          <button
            onClick={onUndoTurn}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Undo this turn"
          >
            <Undo2 size={11} strokeWidth={1.75} />
            Undo turn
          </button>
        </div>
      )}
    </div>
  )
}
