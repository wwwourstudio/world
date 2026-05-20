'use client'

import { useEffect, useRef } from 'react'
import { Play, Pause, Square, RotateCcw, Clock } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { AnimationPreset } from '@/lib/scene/SceneStore'

const ANIM_PRESETS: { id: AnimationPreset; label: string; desc: string }[] = [
  { id: 'float', label: 'Float', desc: 'Gentle vertical bob' },
  { id: 'spin', label: 'Spin', desc: 'Rotate on axis' },
  { id: 'pulse', label: 'Pulse', desc: 'Scale in/out' },
  { id: 'orbit', label: 'Orbit', desc: 'Circle around center' },
  { id: 'shake', label: 'Shake', desc: 'Rapid jitter' },
  { id: 'wave', label: 'Wave', desc: 'Sinusoidal wave' },
  { id: 'bounce', label: 'Bounce', desc: 'Gravity bounce' },
]

export function AnimationTimeline() {
  const isAnimating = useScene((s) => s.isAnimating)
  const setAnimating = useScene((s) => s.setAnimating)
  const playhead = useScene((s) => s.playhead)
  const setPlayhead = useScene((s) => s.setPlayhead)
  const animDuration = useScene((s) => s.animDuration)
  const selectedIds = useScene((s) => s.selectedIds)
  const objects = useScene((s) => s.objects)
  const updateObject = useScene((s) => s.updateObject)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isAnimating) {
      intervalRef.current = setInterval(() => {
        useScene.setState((s) => ({
          playhead: (s.playhead + 0.033) % s.animDuration,
        }))
      }, 33)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isAnimating])

  const selectedObj = selectedIds[0] ? objects[selectedIds[0]] : null
  const anim = selectedObj?.animation

  function applyPreset(preset: AnimationPreset) {
    if (!selectedIds[0]) return
    updateObject(selectedIds[0], {
      animation: {
        preset,
        speed: 1,
        amplitude: preset === 'spin' ? 1 : 0.5,
        offset: Math.random() * Math.PI * 2,
        axis: 'y',
      },
    })
  }

  function removeAnim() {
    if (!selectedIds[0]) return
    updateObject(selectedIds[0], { animation: null })
  }

  const progress = (playhead / animDuration) * 100

  // Objects with animations
  const animatedObjects = Object.values(objects).filter((o) => o.animation && o.animation.preset !== 'none')

  return (
    <div className="flex flex-col h-full" style={{ background: '#111318', borderTop: '1px solid #1E2028' }}>
      {/* Transport controls */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <div className="flex items-center gap-1">
          <TransportBtn
            icon={isAnimating ? Pause : Play}
            onClick={() => setAnimating(!isAnimating)}
            active={isAnimating}
            label={isAnimating ? 'Pause' : 'Play'}
          />
          <TransportBtn
            icon={Square}
            onClick={() => { setAnimating(false); setPlayhead(0) }}
            label="Stop"
          />
          <TransportBtn
            icon={RotateCcw}
            onClick={() => setPlayhead(0)}
            label="Rewind"
          />
        </div>

        {/* Playhead */}
        <div className="flex items-center gap-2 flex-1 mx-4">
          <span className="text-[10px] font-mono w-10" style={{ color: '#7A7E92' }}>
            {playhead.toFixed(1)}s
          </span>
          <div className="flex-1 relative h-1.5 rounded-full cursor-pointer" style={{ background: '#1E2028' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setPlayhead(((e.clientX - rect.left) / rect.width) * animDuration)
            }}
          >
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ background: '#5B6CFF', width: `${progress}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)', background: '#5B6CFF' }} />
          </div>
          <span className="text-[10px] font-mono w-10 text-right" style={{ color: '#7A7E92' }}>
            {animDuration.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={11} style={{ color: '#7A7E92' }} />
          <span className="text-[10px]" style={{ color: '#7A7E92' }}>Duration</span>
          <input
            type="number"
            value={animDuration}
            min={1} max={60} step={1}
            onChange={(e) => useScene.setState({ animDuration: parseFloat(e.target.value) || 8 })}
            className="w-12 h-6 px-1 rounded text-[11px] font-mono text-center outline-none border"
            style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Preset picker */}
        <div className="w-48 shrink-0 overflow-y-auto custom-scrollbar" style={{ borderRight: '1px solid #1E2028' }}>
          <div className="px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: '#7A7E92' }}>Animation Presets</span>
          </div>
          {ANIM_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="w-full flex flex-col px-3 py-2 text-left transition-colors"
              style={{ borderBottom: '1px solid #1E2028' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              <span className="text-[12px]" style={{ color: anim?.preset === p.id ? '#5B6CFF' : '#E8E9F0' }}>{p.label}</span>
              <span className="text-[10px]" style={{ color: '#7A7E92' }}>{p.desc}</span>
            </button>
          ))}
          {anim && (
            <button
              onClick={removeAnim}
              className="w-full px-3 py-2 text-left text-[11px] transition-colors"
              style={{ color: '#FF5C8A' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              Remove Animation
            </button>
          )}
        </div>

        {/* Track rows */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {animatedObjects.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-[11px]" style={{ color: '#7A7E92' }}>No animated objects — select an object and apply a preset</span>
            </div>
          ) : (
            animatedObjects.map((obj) => (
              <div key={obj.id} className="flex items-center h-9" style={{ borderBottom: '1px solid #1E2028' }}>
                <div className="w-40 px-3 shrink-0" style={{ borderRight: '1px solid #1E2028' }}>
                  <span className="text-[11px] truncate block" style={{ color: '#E8E9F0' }}>{obj.name}</span>
                  <span className="text-[9px]" style={{ color: '#5B6CFF' }}>{obj.animation?.preset}</span>
                </div>
                {/* Simple track visualization */}
                <div className="flex-1 h-full relative overflow-hidden">
                  <div className="absolute inset-y-2 left-2 right-2 rounded-sm opacity-40"
                    style={{ background: `linear-gradient(90deg, #5B6CFF, #8B5CF6)` }}
                  />
                  {/* Playhead indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-px"
                    style={{ left: `${progress}%`, background: '#FF5C8A' }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function TransportBtn({ icon: Icon, onClick, active, label }: {
  icon: typeof Play; onClick: () => void; active?: boolean; label: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="w-7 h-7 flex items-center justify-center rounded-md transition-all"
      style={{
        background: active ? '#5B6CFF' : 'transparent',
        color: active ? '#fff' : '#7A7E92',
        border: '1px solid #1E2028',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = '#1E2028'; e.currentTarget.style.color = '#E8E9F0' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#7A7E92' } }}
    >
      <Icon size={12} strokeWidth={1.75} />
    </button>
  )
}
