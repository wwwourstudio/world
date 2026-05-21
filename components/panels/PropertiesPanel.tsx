'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronRight, Move3D, RotateCcw, Eye, Lightbulb, Sun,
  Type, Sparkles, Play, Box, Group, Flame, Maximize2,
} from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { AnimationConfig, AnimationPreset, ParticleConfig, GeometryConfig, SceneObject } from '@/lib/scene/SceneStore'

function getNaturalSize(geo: GeometryConfig): number {
  switch (geo.type) {
    case 'sphere': return (geo.radius ?? 0.5) * 2
    case 'cylinder': return Math.max((geo.radiusTop ?? 0.5) * 2, geo.height ?? 1)
    case 'cone': return Math.max((geo.radius ?? 0.5) * 2, geo.height ?? 1)
    case 'torus': return ((geo.radius ?? 0.5) + (geo.tube ?? 0.2)) * 2
    case 'ring': return (geo.radius ?? 0.5) * 2
    case 'capsule': return (geo.radius ?? 0.3) * 2 + (geo.height ?? 1)
    case 'tetrahedron':
    case 'octahedron':
    case 'icosahedron': return (geo.radius ?? 0.5) * 2
    case 'plane': return Math.max(geo.width ?? 1, geo.height ?? 1)
    case 'gltf': return 2 // already auto-normalized to ~2m
    default: return Math.max(geo.width ?? 1, geo.height ?? 1, geo.depth ?? 1)
  }
}

function NumInput({
  label, value, onChange, step = 0.01, color,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number; color?: string
}) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="shrink-0 text-[10px] font-mono font-bold" style={{ color: color ?? '#7A7E92' }}>{label}</span>
      <input
        type="number"
        value={value.toFixed(2)}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="min-w-0 w-full h-6 px-1 rounded text-[11px] font-mono outline-none border text-center"
        style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
      />
    </div>
  )
}

function Vec3Control({
  label, value, onChange, step = 0.01,
}: {
  label: string
  value: [number, number, number]
  onChange: (v: [number, number, number]) => void
  step?: number
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#7A7E92' }}>{label}</span>
      <div className="grid grid-cols-3 gap-1 min-w-0">
        <NumInput label="X" value={value[0]} onChange={(v) => onChange([v, value[1], value[2]])} step={step} color="#ef4444" />
        <NumInput label="Y" value={value[1]} onChange={(v) => onChange([value[0], v, value[2]])} step={step} color="#22c55e" />
        <NumInput label="Z" value={value[2]} onChange={(v) => onChange([value[0], value[1], v])} step={step} color="#3b82f6" />
      </div>
    </div>
  )
}

function SliderRow({ label, value, min = 0, max = 1, step = 0.01, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-24 truncate" style={{ color: '#7A7E92' }}>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-4"
      />
      <input
        type="number"
        value={value.toFixed(2)}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-14 h-6 px-1 rounded text-[11px] font-mono text-center outline-none border"
        style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
      />
    </div>
  )
}

const ANIM_PRESETS: AnimationPreset[] = ['none', 'float', 'spin', 'pulse', 'orbit', 'shake', 'wave', 'bounce']

const DEFAULT_PARTICLE_CFG: ParticleConfig = {
  count: 200, spread: [6, 6, 6], instanceGeometry: 'sphere', instanceScale: 0.08, randomScale: 0.5, preset: 'scatter',
}

function ObjectHeader({ obj }: { obj: SceneObject }) {
  const updateObject = useScene((s) => s.updateObject)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const typeColor =
    obj.type === 'light' ? '#d4b400'
    : obj.type === 'particle' ? '#ff6b35'
    : obj.type === 'group' ? '#7A7E92'
    : '#5B6CFF'
  const typeLabel =
    obj.type === 'mesh' ? (obj.geometry?.type === 'gltf' ? 'gltf' : obj.geometry?.type ?? 'mesh')
    : obj.type
  const TypeIcon =
    obj.type === 'light' ? Lightbulb
    : obj.type === 'particle' ? Flame
    : obj.type === 'group' ? Group
    : obj.geometry?.type === 'text' ? Type
    : Box

  function startEdit() { setDraft(obj.name); setEditing(true) }
  function commit() { if (draft.trim()) updateObject(obj.id, { name: draft.trim() }); setEditing(false) }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 shrink-0"
         style={{ borderBottom: '1px solid #1E2028', background: '#0b0c10' }}>
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
           style={{ background: `${typeColor}18`, border: `1px solid ${typeColor}35` }}>
        <TypeIcon size={14} style={{ color: typeColor }} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="text-[12px] font-semibold bg-transparent outline-none border-b w-full"
            style={{ color: '#E8E9F0', borderColor: '#5B6CFF' }}
          />
        ) : (
          <span
            className="text-[12px] font-semibold truncate leading-tight cursor-pointer"
            style={{ color: '#E8E9F0' }}
            onDoubleClick={startEdit}
            title="Double-click to rename"
          >{obj.name}</span>
        )}
        <span className="text-[10px] font-mono uppercase tracking-wide leading-tight" style={{ color: typeColor }}>
          {typeLabel}
        </span>
      </div>
    </div>
  )
}

function Section({ label, icon, children, defaultOpen = true }: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #1E2028' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 h-7 px-3 transition-colors"
        style={{ background: '#0d0f14' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#12141a' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0d0f14' }}
      >
        {icon && <span className="shrink-0 opacity-80" style={{ color: '#5B6CFF' }}>{icon}</span>}
        <span className="flex-1 text-left text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#5B6CFF' }}>
          {label}
        </span>
        {open
          ? <ChevronDown size={10} style={{ color: '#3a3e50' }} />
          : <ChevronRight size={10} style={{ color: '#3a3e50' }} />}
      </button>
      {open && (
        <div className="px-3 py-2.5">
          {children}
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] w-24 truncate shrink-0" style={{ color: '#7A7E92' }}>{label}</span>
      <div className="flex items-center gap-1 flex-1">{children}</div>
    </div>
  )
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-6 rounded text-[10px] font-medium transition-all border"
      style={{ color: '#7A7E92', borderColor: '#1E2028', background: 'transparent' }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement
        b.style.color = '#E8E9F0'
        b.style.background = '#1E2028'
        b.style.borderColor = '#2a2d3a'
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement
        b.style.color = '#7A7E92'
        b.style.background = 'transparent'
        b.style.borderColor = '#1E2028'
      }}
    >
      {children}
    </button>
  )
}

export function PropertiesPanel() {
  const selectedIds = useScene((s) => s.selectedIds)
  const objects = useScene((s) => s.objects)
  const updateObject = useScene((s) => s.updateObject)

  const id = selectedIds[0]
  const obj = id ? objects[id] : null

  if (!obj) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
        <span className="text-[11px]" style={{ color: '#7A7E92' }}>Select an object to edit properties</span>
      </div>
    )
  }

  const { transform, animation } = obj

  function updateAnim(patch: Partial<AnimationConfig>) {
    const current = animation ?? { preset: 'none', speed: 1, amplitude: 0.5, offset: 0, axis: 'y' as const }
    updateObject(id, { animation: { ...current, ...patch } })
  }

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar flex-1">
      <ObjectHeader obj={obj} />

      {/* Transform */}
      <Section label="Transform" icon={<Move3D size={11} />}>
        <div className="flex flex-col gap-3">
          <Vec3Control
            label="Position"
            value={transform.position}
            onChange={(v) => updateObject(id, { transform: { ...transform, position: v } })}
          />
          <Vec3Control
            label="Rotation"
            value={transform.rotation}
            onChange={(v) => updateObject(id, { transform: { ...transform, rotation: v } })}
          />
          <Vec3Control
            label="Scale"
            value={transform.scale}
            onChange={(v) => updateObject(id, { transform: { ...transform, scale: v } })}
            step={0.05}
          />
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <SmallBtn onClick={() => updateObject(id, { transform: { ...transform, position: [0, 0, 0] } })}>Reset Pos</SmallBtn>
          <SmallBtn onClick={() => updateObject(id, { transform: { ...transform, rotation: [0, 0, 0] } })}>Reset Rot</SmallBtn>
          <SmallBtn onClick={() => updateObject(id, { transform: { ...transform, scale: [1, 1, 1] } })}>Reset Scl</SmallBtn>
          {obj.geometry && (
            <SmallBtn onClick={() => {
              const TARGET = 2
              const nat = getNaturalSize(obj.geometry)
              const currentMax = Math.max(...transform.scale)
              const effectiveDim = nat * currentMax
              const factor = effectiveDim > 0.0001 ? TARGET / effectiveDim : 1
              updateObject(id, { transform: { ...transform, scale: [transform.scale[0] * factor, transform.scale[1] * factor, transform.scale[2] * factor] } })
            }}>Normalize</SmallBtn>
          )}
        </div>
      </Section>

      {/* Light properties */}
      {obj.type === 'light' && obj.light && (
        <Section label="Light" icon={<Lightbulb size={11} />}>
          <div className="flex flex-col gap-2">
            <Row label="Type">
              <select
                value={obj.light.type}
                onChange={(e) => updateObject(id, { light: { ...obj.light!, type: e.target.value as typeof obj.light.type } })}
                className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
              >
                {['ambient', 'directional', 'point', 'spot', 'hemisphere'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
            <Row label="Color">
              <input
                type="color"
                value={obj.light.color}
                onChange={(e) => updateObject(id, { light: { ...obj.light!, color: e.target.value } })}
                className="w-7 h-6 rounded cursor-pointer border-0 p-0"
                style={{ background: 'transparent' }}
              />
              <span className="text-[11px] font-mono ml-1" style={{ color: '#7A7E92' }}>{obj.light.color}</span>
            </Row>
            <SliderRow label="Intensity" value={obj.light.intensity} min={0} max={10} step={0.1}
              onChange={(v) => updateObject(id, { light: { ...obj.light!, intensity: v } })} />
            {(obj.light.type === 'point' || obj.light.type === 'spot') && (
              <SliderRow label="Distance" value={obj.light.distance} min={0} max={100} step={1}
                onChange={(v) => updateObject(id, { light: { ...obj.light!, distance: v } })} />
            )}
            {obj.light.type === 'spot' && (
              <SliderRow label="Angle" value={obj.light.angle} min={0} max={Math.PI / 2} step={0.01}
                onChange={(v) => updateObject(id, { light: { ...obj.light!, angle: v } })} />
            )}
            <Row label="Shadow">
              <input
                type="checkbox"
                checked={obj.light.castShadow}
                onChange={(e) => updateObject(id, { light: { ...obj.light!, castShadow: e.target.checked } })}
              />
            </Row>
          </div>
        </Section>
      )}

      {/* Shadow */}
      {obj.type === 'mesh' && (
        <Section label="Shadow" icon={<Sun size={11} />}>
          <div className="flex flex-col gap-2">
            <Row label="Cast Shadow">
              <input type="checkbox" checked={obj.castShadow} onChange={(e) => updateObject(id, { castShadow: e.target.checked })} />
            </Row>
            <Row label="Receive Shadow">
              <input type="checkbox" checked={obj.receiveShadow} onChange={(e) => updateObject(id, { receiveShadow: e.target.checked })} />
            </Row>
          </div>
        </Section>
      )}

      {/* 3D Text editing */}
      {obj.geometry?.type === 'text' && (
        <Section label="3D Text" icon={<Type size={11} />}>
          <div className="flex flex-col gap-2">
            <textarea
              value={obj.geometry.text ?? 'Text'}
              onChange={(e) => updateObject(id, { geometry: { ...obj.geometry, text: e.target.value } })}
              className="w-full h-16 px-2 py-1.5 rounded text-[12px] outline-none border resize-none"
              style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
            />
            <SliderRow label="Font Size" value={obj.geometry.fontSize ?? 0.5} min={0.1} max={5} step={0.05}
              onChange={(v) => updateObject(id, { geometry: { ...obj.geometry, fontSize: v } })} />
          </div>
        </Section>
      )}

      {/* Particle Emitter */}
      {obj.type === 'particle' && (
        <Section label="Particle Emitter" icon={<Sparkles size={11} />}>
          <div className="flex flex-col gap-2">
            <Row label="Preset">
              <select
                value={obj.particle?.preset ?? 'scatter'}
                onChange={(e) => updateObject(id, { particle: { ...(obj.particle ?? DEFAULT_PARTICLE_CFG), preset: e.target.value as ParticleConfig['preset'] } })}
                className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
              >
                {['scatter', 'rain', 'snow', 'leaves', 'sparks', 'custom'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Row>
            <Row label="Shape">
              <select
                value={obj.particle?.instanceGeometry ?? 'sphere'}
                onChange={(e) => updateObject(id, { particle: { ...(obj.particle ?? DEFAULT_PARTICLE_CFG), instanceGeometry: e.target.value as ParticleConfig['instanceGeometry'] } })}
                className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
              >
                {['sphere', 'box', 'cone', 'tetrahedron'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Row>
            <SliderRow label="Count" value={obj.particle?.count ?? 200} min={10} max={2000} step={10}
              onChange={(v) => updateObject(id, { particle: { ...(obj.particle ?? DEFAULT_PARTICLE_CFG), count: Math.round(v) } })} />
            <SliderRow label="Scale" value={obj.particle?.instanceScale ?? 0.08} min={0.01} max={1} step={0.01}
              onChange={(v) => updateObject(id, { particle: { ...(obj.particle ?? DEFAULT_PARTICLE_CFG), instanceScale: v } })} />
            <SliderRow label="Random Scale" value={obj.particle?.randomScale ?? 0.5} min={0} max={1} step={0.05}
              onChange={(v) => updateObject(id, { particle: { ...(obj.particle ?? DEFAULT_PARTICLE_CFG), randomScale: v } })} />
            <Row label="Spread">
              <div className="grid grid-cols-3 gap-1 flex-1">
                {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                  <div key={axis} className="flex items-center gap-1">
                    <span className="text-[10px] font-mono" style={{ color: i === 0 ? '#ef4444' : i === 1 ? '#22c55e' : '#3b82f6' }}>{axis}</span>
                    <input
                      type="number"
                      value={(obj.particle?.spread ?? [6, 6, 6])[i].toFixed(1)}
                      step={0.5}
                      onChange={(e) => {
                        const spread = [...(obj.particle?.spread ?? [6, 6, 6])] as [number, number, number]
                        spread[i] = parseFloat(e.target.value) || 1
                        updateObject(id, { particle: { ...(obj.particle ?? DEFAULT_PARTICLE_CFG), spread } })
                      }}
                      className="flex-1 h-6 px-1 rounded text-[10px] font-mono text-center outline-none border"
                      style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                    />
                  </div>
                ))}
              </div>
            </Row>
          </div>
        </Section>
      )}

      {/* Animation */}
      <Section label="Animation" icon={<Play size={11} />} defaultOpen={false}>
        <div className="flex flex-col gap-2">
          <Row label="Preset">
            <select
              value={animation?.preset ?? 'none'}
              onChange={(e) => updateAnim({ preset: e.target.value as AnimationPreset })}
              className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
              style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
            >
              {ANIM_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Row>
          {animation && animation.preset !== 'none' && (
            <>
              <SliderRow label="Speed" value={animation.speed} min={0.1} max={5} step={0.1}
                onChange={(v) => updateAnim({ speed: v })} />
              <SliderRow label="Amplitude" value={animation.amplitude} min={0} max={3} step={0.05}
                onChange={(v) => updateAnim({ amplitude: v })} />
              <Row label="Axis">
                {(['x', 'y', 'z'] as const).map((ax) => (
                  <button
                    key={ax}
                    onClick={() => updateAnim({ axis: ax })}
                    className="px-2 h-5 rounded text-[10px] font-mono font-bold mr-1 transition-colors"
                    style={{
                      background: animation.axis === ax ? '#5B6CFF' : '#1E2028',
                      color: animation.axis === ax ? '#fff' : '#7A7E92',
                    }}
                  >
                    {ax.toUpperCase()}
                  </button>
                ))}
              </Row>
            </>
          )}
        </div>
      </Section>

      {/* Visibility */}
      <Section label="Visibility" icon={<Eye size={11} />} defaultOpen={false}>
        <div className="flex flex-col gap-2">
          <Row label="Visible">
            <input type="checkbox" checked={obj.visible} onChange={(e) => updateObject(id, { visible: e.target.checked })} />
          </Row>
          <Row label="Locked">
            <input type="checkbox" checked={obj.locked} onChange={(e) => updateObject(id, { locked: e.target.checked })} />
          </Row>
        </div>
      </Section>
    </div>
  )
}
