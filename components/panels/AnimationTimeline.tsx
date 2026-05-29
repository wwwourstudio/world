'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, RotateCcw, Clock, Diamond } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { AnimationPreset, Keyframe } from '@/lib/scene/SceneStore'

const ANIM_PRESETS: { id: AnimationPreset; label: string; desc: string }[] = [
  { id: 'float', label: 'Float', desc: 'Gentle vertical bob' },
  { id: 'spin', label: 'Spin', desc: 'Rotate on axis' },
  { id: 'pulse', label: 'Pulse', desc: 'Scale in/out' },
  { id: 'orbit', label: 'Orbit', desc: 'Circle around center' },
  { id: 'shake', label: 'Shake', desc: 'Rapid jitter' },
  { id: 'wave', label: 'Wave', desc: 'Sinusoidal wave' },
  { id: 'bounce', label: 'Bounce', desc: 'Gravity bounce' },
]

const EASING_OPTIONS: { value: Keyframe['easing']; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In/Out' },
  { value: 'bounce', label: 'Bounce' },
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
  const addKeyframe = useScene((s) => s.addKeyframe)
  const removeKeyframe = useScene((s) => s.removeKeyframe)

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

  // ── Drag scrubbing ──
  const scrubbing = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const scrubTo = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setPlayhead(pct * animDuration)
  }, [animDuration, setPlayhead])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    scrubbing.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    scrubTo(e.clientX)
  }, [scrubTo])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (scrubbing.current) scrubTo(e.clientX)
  }, [scrubTo])

  const onPointerUp = useCallback(() => { scrubbing.current = false }, [])

  const progress = (playhead / animDuration) * 100

  const animatedObjects = Object.values(objects).filter(
    (o) => o.animation && (o.animation.preset !== 'none' || (o.animation.keyframes && o.animation.keyframes.length > 0))
  )

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

        {/* Playhead scrubber */}
        <div className="flex items-center gap-2 flex-1 mx-4">
          <span className="text-[10px] font-mono w-10" style={{ color: '#7A7E92' }}>
            {playhead.toFixed(1)}s
          </span>
          <div
            ref={trackRef}
            className="flex-1 relative h-4 rounded-full cursor-ew-resize select-none"
            style={{ background: '#1E2028' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
              style={{ background: '#5B6CFF', width: `${progress}%` }}
            />
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white pointer-events-none"
              style={{ left: `${progress}%`, top: '50%', transform: 'translate(-50%, -50%)', background: '#5B6CFF' }}
            />
          </div>
          <span className="text-[10px] font-mono w-10 text-right" style={{ color: '#7A7E92' }}>
            {animDuration.toFixed(1)}s
          </span>
        </div>

        {selectedIds[0] && (
          <button
            onClick={() => addKeyframe(selectedIds[0], playhead)}
            title="Add keyframe at playhead"
            className="flex items-center gap-1 px-2.5 h-7 rounded-md text-[10px] font-medium transition-colors border"
            style={{ background: '#1E2028', color: '#facc15', borderColor: '#2a2d3a' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#facc1520'; e.currentTarget.style.borderColor = '#facc1550' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1E2028'; e.currentTarget.style.borderColor = '#2a2d3a' }}
          >
            <Diamond size={10} fill="currentColor" /> Keyframe
          </button>
        )}

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
            animatedObjects.map((obj) => {
              const kfs = obj.animation?.keyframes ?? []
              return (
                <div key={obj.id} className="flex items-center h-9" style={{ borderBottom: '1px solid #1E2028' }}>
                  <div className="w-40 px-3 shrink-0" style={{ borderRight: '1px solid #1E2028' }}>
                    <span className="text-[11px] truncate block" style={{ color: '#E8E9F0' }}>{obj.name}</span>
                    <span className="text-[9px]" style={{ color: kfs.length > 0 ? '#facc15' : '#5B6CFF' }}>
                      {kfs.length > 0 ? `${kfs.length} keyframes` : obj.animation?.preset}
                    </span>
                  </div>
                  {/* Track */}
                  <div className="flex-1 h-full relative overflow-hidden">
                    {kfs.length === 0 && (
                      <div className="absolute inset-y-2 left-2 right-2 rounded-sm opacity-40"
                        style={{ background: 'linear-gradient(90deg, #5B6CFF, #8B5CF6)' }}
                      />
                    )}
                    {kfs.map((kf, ki) => {
                      const pct = (kf.time / animDuration) * 100
                      return (
                        <KeyframeDiamond
                          key={kf.time}
                          kf={kf}
                          pct={pct}
                          onRemove={() => removeKeyframe(obj.id, kf.time)}
                          onEasingChange={(easing) => {
                            const newKfs = kfs.map((k, i) => i === ki ? { ...k, easing } : k) as Keyframe[]
                            updateObject(obj.id, { animation: { ...obj.animation!, keyframes: newKfs } })
                          }}
                        />
                      )
                    })}
                    {/* Playhead line */}
                    <div
                      className="absolute top-0 bottom-0 w-px pointer-events-none"
                      style={{ left: `${progress}%`, background: '#FF5C8A', zIndex: 1 }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function KeyframeDiamond({ kf, pct, onRemove, onEasingChange }: {
  kf: Keyframe
  pct: number
  onRemove: () => void
  onEasingChange: (easing: Keyframe['easing']) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const easingColor = kf.easing === 'bounce' ? '#FF5C8A'
    : kf.easing === 'ease-in-out' ? '#22c55e'
    : kf.easing === 'ease-in' ? '#f97316'
    : kf.easing === 'ease-out' ? '#a78bfa'
    : '#facc15'

  return (
    <div
      ref={ref}
      className="absolute top-1/2 -translate-x-1/2"
      style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)', zIndex: 2 }}
    >
      <button
        title={`${kf.time.toFixed(1)}s · ${kf.easing ?? 'linear'} · right-click to remove`}
        onClick={() => setMenuOpen((o) => !o)}
        onContextMenu={(e) => { e.preventDefault(); onRemove() }}
        style={{ color: easingColor, padding: 2, background: 'none', border: 'none', cursor: 'pointer', display: 'block', lineHeight: 0 }}
      >
        <Diamond size={10} fill="currentColor" />
      </button>
      {menuOpen && (
        <div
          className="absolute bottom-full mb-1 rounded-md overflow-hidden shadow-xl"
          style={{ left: '50%', transform: 'translateX(-50%)', background: '#1A1D26', border: '1px solid #2a2d3a', minWidth: 100, zIndex: 50 }}
        >
          {EASING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onEasingChange(opt.value); setMenuOpen(false) }}
              className="w-full px-3 py-1.5 text-left text-[10px] transition-colors"
              style={{
                color: kf.easing === opt.value || (!kf.easing && opt.value === 'linear') ? '#5B6CFF' : '#E8E9F0',
                fontWeight: kf.easing === opt.value ? '600' : '400',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2d3a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              {opt.label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #2a2d3a' }}>
            <button
              onClick={() => { onRemove(); setMenuOpen(false) }}
              className="w-full px-3 py-1.5 text-left text-[10px] transition-colors"
              style={{ color: '#FF5C8A' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2d3a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
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
