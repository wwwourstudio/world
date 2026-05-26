'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronRight, Move3D, RotateCcw, Eye, Lightbulb, Sun,
  Type, Sparkles, Play, Box, Group, Flame, Maximize2, Mountain, Droplets, Paintbrush,
} from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { AnimationConfig, AnimationPreset, ParticleConfig, GeometryConfig, SceneObject, SculptMode, ScrollAnimConfig } from '@/lib/scene/SceneStore'

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

function TerrainSection({
  id, terrain, updateObject,
}: {
  id: string
  terrain: NonNullable<SceneObject['terrain']>
  updateObject: (id: string, patch: import('@/lib/scene/SceneStore').DeepPartial<SceneObject>) => void
}) {
  const activeTool = useScene((s) => s.activeTool)
  const sculptMode = useScene((s) => s.sculptMode)
  const sculptRadius = useScene((s) => s.sculptRadius)
  const sculptStrength = useScene((s) => s.sculptStrength)
  const setSculptMode = useScene((s) => s.setSculptMode)
  const setSculptRadius = useScene((s) => s.setSculptRadius)
  const setSculptStrength = useScene((s) => s.setSculptStrength)
  const tc = terrain

  return (
    <>
      <Section label="Terrain" icon={<Mountain size={11} />}>
        <div className="flex flex-col gap-2">
          <SliderRow label="Size" value={tc.size} min={5} max={100} step={1}
            onChange={(v) => updateObject(id, { terrain: { ...tc, size: v, vertexHeights: undefined } })} />
          <SliderRow label="Resolution" value={tc.resolution} min={16} max={128} step={16}
            onChange={(v) => updateObject(id, { terrain: { ...tc, resolution: Math.round(v), vertexHeights: undefined } })} />
          <SliderRow label="Height Scale" value={tc.heightScale} min={0} max={20} step={0.1}
            onChange={(v) => updateObject(id, { terrain: { ...tc, heightScale: v, vertexHeights: undefined } })} />
          <SliderRow label="Noise Scale" value={tc.noiseScale} min={0.01} max={1} step={0.01}
            onChange={(v) => updateObject(id, { terrain: { ...tc, noiseScale: v, vertexHeights: undefined } })} />
          <SliderRow label="Seed" value={tc.seed} min={0} max={100} step={1}
            onChange={(v) => updateObject(id, { terrain: { ...tc, seed: Math.round(v), vertexHeights: undefined } })} />
          <SliderRow label="Layers" value={tc.layers} min={1} max={8} step={1}
            onChange={(v) => updateObject(id, { terrain: { ...tc, layers: Math.round(v), vertexHeights: undefined } })} />
          <Row label="Low Color">
            <input type="color" value={tc.lowColor} className="w-7 h-6 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }}
              onChange={(e) => updateObject(id, { terrain: { ...tc, lowColor: e.target.value } })} />
            <span className="text-[10px] font-mono ml-1" style={{ color: '#7A7E92' }}>{tc.lowColor}</span>
          </Row>
          <Row label="Mid Color">
            <input type="color" value={tc.midColor} className="w-7 h-6 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }}
              onChange={(e) => updateObject(id, { terrain: { ...tc, midColor: e.target.value } })} />
            <span className="text-[10px] font-mono ml-1" style={{ color: '#7A7E92' }}>{tc.midColor}</span>
          </Row>
          <Row label="High Color">
            <input type="color" value={tc.highColor} className="w-7 h-6 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }}
              onChange={(e) => updateObject(id, { terrain: { ...tc, highColor: e.target.value } })} />
            <span className="text-[10px] font-mono ml-1" style={{ color: '#7A7E92' }}>{tc.highColor}</span>
          </Row>
          {tc.vertexHeights && (
            <SmallBtn onClick={() => updateObject(id, { terrain: { ...tc, vertexHeights: undefined } })}>
              Clear Sculpt Data
            </SmallBtn>
          )}
        </div>
      </Section>
      <Section label="Sculpt" icon={<Paintbrush size={11} />} defaultOpen={activeTool === 'sculpt'}>
        <div className="flex flex-col gap-2">
          <Row label="Mode">
            <div className="flex gap-1">
              {(['raise', 'lower', 'smooth', 'flatten'] as SculptMode[]).map((m) => (
                <button key={m}
                  onClick={() => setSculptMode(m)}
                  className="px-1.5 h-5 rounded text-[9px] font-medium capitalize transition-all"
                  style={{
                    background: sculptMode === m ? '#5B6CFF' : '#1E2028',
                    color: sculptMode === m ? '#fff' : '#7A7E92',
                    border: '1px solid #2a2d3a',
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </Row>
          <SliderRow label="Radius" value={sculptRadius} min={0.5} max={10} step={0.1} onChange={setSculptRadius} />
          <SliderRow label="Strength" value={sculptStrength} min={0.01} max={1} step={0.01} onChange={setSculptStrength} />
          <p className="text-[10px] leading-relaxed" style={{ color: '#4a4e62' }}>
            Select Sculpt tool (T) then click/drag on terrain to sculpt.
          </p>
        </div>
      </Section>
    </>
  )
}

export function PropertiesPanel() {
  const selectedIds = useScene((s) => s.selectedIds)
  const objects = useScene((s) => s.objects)
  const updateObject = useScene((s) => s.updateObject)
  const setScrollAnim = useScene((s) => s.setScrollAnim)
  const appMode = useScene((s) => s.appMode)
  const cameraPath = useScene((s) => s.cameraPath)
  const scenes = useScene((s) => s.scenes)

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
            <SliderRow label="Depth" value={obj.geometry.textDepth ?? (obj.geometry.fontSize ?? 0.5) * 0.25} min={0.01} max={1} step={0.01}
              onChange={(v) => updateObject(id, { geometry: { ...obj.geometry, textDepth: v } })} />
            <Row label="Font">
              <div className="flex gap-1">
                {(['helvetiker', 'optimer', 'gentilis'] as const).map((f) => (
                  <button key={f} onClick={() => updateObject(id, { geometry: { ...obj.geometry, font: f } })}
                    className="px-2 h-5 rounded text-[9px] font-medium capitalize transition-all"
                    style={{ background: (obj.geometry.font ?? 'helvetiker') === f ? '#5B6CFF' : '#1E2028', color: (obj.geometry.font ?? 'helvetiker') === f ? '#fff' : '#7A7E92', border: '1px solid #2a2d3a' }}>
                    {f}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Bevel">
              <input type="checkbox" checked={obj.geometry.bevelEnabled !== false}
                onChange={(e) => updateObject(id, { geometry: { ...obj.geometry, bevelEnabled: e.target.checked } })} />
            </Row>
            <SliderRow label="Letter Spacing" value={obj.geometry.letterSpacing ?? 0} min={-0.5} max={1} step={0.01}
              onChange={(v) => updateObject(id, { geometry: { ...obj.geometry, letterSpacing: v } })} />
            <SliderRow label="Line Height" value={obj.geometry.lineHeight ?? 1} min={0.5} max={3} step={0.05}
              onChange={(v) => updateObject(id, { geometry: { ...obj.geometry, lineHeight: v } })} />
            {(obj.geometry.bevelEnabled !== false) && (
              <>
                <SliderRow label="Bevel Thickness" value={obj.geometry.bevelThickness ?? 0.015} min={0.001} max={0.2} step={0.001}
                  onChange={(v) => updateObject(id, { geometry: { ...obj.geometry, bevelThickness: v } })} />
                <SliderRow label="Bevel Size" value={obj.geometry.bevelSize ?? 0.008} min={0.001} max={0.1} step={0.001}
                  onChange={(v) => updateObject(id, { geometry: { ...obj.geometry, bevelSize: v } })} />
              </>
            )}
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

      {/* Terrain */}
      {obj.type === 'terrain' && obj.terrain && (
        <TerrainSection id={id} terrain={obj.terrain} updateObject={updateObject} />
      )}

      {/* Water */}
      {obj.type === 'water' && obj.water && (
        <Section label="Water" icon={<Droplets size={11} />}>
          <div className="flex flex-col gap-2">
            <SliderRow label="Size" value={obj.water.size} min={5} max={100} step={1}
              onChange={(v) => updateObject(id, { water: { ...obj.water!, size: v } })} />
            <Row label="Color">
              <input type="color" value={obj.water.color} className="w-7 h-6 rounded cursor-pointer border-0 p-0" style={{ background: 'transparent' }}
                onChange={(e) => updateObject(id, { water: { ...obj.water!, color: e.target.value } })} />
              <span className="text-[11px] font-mono ml-1" style={{ color: '#7A7E92' }}>{obj.water.color}</span>
            </Row>
            <SliderRow label="Opacity" value={obj.water.opacity} min={0} max={1} step={0.01}
              onChange={(v) => updateObject(id, { water: { ...obj.water!, opacity: v } })} />
            <SliderRow label="Wave Height" value={obj.water.waveHeight} min={0} max={1} step={0.01}
              onChange={(v) => updateObject(id, { water: { ...obj.water!, waveHeight: v } })} />
            <SliderRow label="Wave Speed" value={obj.water.waveSpeed} min={0} max={5} step={0.1}
              onChange={(v) => updateObject(id, { water: { ...obj.water!, waveSpeed: v } })} />
            <SliderRow label="Wave Scale" value={obj.water.waveScale} min={0.1} max={5} step={0.1}
              onChange={(v) => updateObject(id, { water: { ...obj.water!, waveScale: v } })} />
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

      {/* HTML Content */}
      {obj.type === 'html' && obj.htmlConfig && (
        <Section label="HTML Content" icon={<Type size={11} />} defaultOpen={true}>
          <div className="flex flex-col gap-2">
            {/* Content field — for most types */}
            {['heading','paragraph','button','badge','stat','icontext'].includes(obj.htmlConfig.htmlType) && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>
                  {obj.htmlConfig.htmlType === 'stat' ? 'Number / Value' : obj.htmlConfig.htmlType === 'icontext' ? 'Icon / Emoji' : 'Content'}
                </span>
                <textarea
                  value={obj.htmlConfig.content ?? ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, content: e.target.value } })}
                  rows={obj.htmlConfig.htmlType === 'paragraph' ? 3 : 2}
                  className="px-2 py-1.5 rounded text-[11px] outline-none border resize-none"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {['card','quote','stat','icontext'].includes(obj.htmlConfig.htmlType) && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>
                  {obj.htmlConfig.htmlType === 'quote' ? 'Attribution' : obj.htmlConfig.htmlType === 'stat' ? 'Label' : obj.htmlConfig.htmlType === 'icontext' ? 'Text' : 'Subtitle'}
                </span>
                <textarea
                  value={obj.htmlConfig.subtitle ?? ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, subtitle: e.target.value } })}
                  rows={2}
                  className="px-2 py-1.5 rounded text-[11px] outline-none border resize-none"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {obj.htmlConfig.htmlType === 'quote' && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>Quote Text</span>
                <textarea
                  value={obj.htmlConfig.content ?? ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, content: e.target.value } })}
                  rows={3}
                  className="px-2 py-1.5 rounded text-[11px] outline-none border resize-none"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {obj.htmlConfig.htmlType === 'card' && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>Title</span>
                <input
                  value={obj.htmlConfig.content ?? ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, content: e.target.value } })}
                  className="h-6 px-2 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {(obj.htmlConfig.htmlType === 'image') && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>Image URL</span>
                <input
                  value={obj.htmlConfig.content ?? ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, content: e.target.value } })}
                  placeholder="https://..."
                  className="h-6 px-2 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {(obj.htmlConfig.htmlType === 'video') && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>Video URL</span>
                <input
                  value={obj.htmlConfig.videoUrl ?? ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, videoUrl: e.target.value } })}
                  placeholder="https://..."
                  className="h-6 px-2 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {obj.htmlConfig.htmlType === 'countdown' && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>Target Date & Time</span>
                <input
                  type="datetime-local"
                  value={obj.htmlConfig.countdownTarget ? obj.htmlConfig.countdownTarget.slice(0, 16) : ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, countdownTarget: new Date(e.target.value).toISOString() } })}
                  className="h-6 px-2 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {obj.htmlConfig.htmlType === 'divider' && (
              <Row label="Style">
                <select
                  value={obj.htmlConfig.dividerStyle ?? 'solid'}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, dividerStyle: e.target.value as 'solid' | 'gradient' | 'dashed' } })}
                  className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                >
                  <option value="solid">Solid</option>
                  <option value="gradient">Gradient</option>
                  <option value="dashed">Dashed</option>
                </select>
              </Row>
            )}
            {/* Link URL — for button, card, badge */}
            {['button','card','badge'].includes(obj.htmlConfig.htmlType) && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>Link URL (clickable)</span>
                <input
                  value={obj.htmlConfig.linkUrl ?? ''}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, linkUrl: e.target.value } })}
                  placeholder="https://..."
                  className="h-6 px-2 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            )}
            {/* Typography */}
            {!['divider','spacer','image','video','countdown'].includes(obj.htmlConfig.htmlType) && (
              <>
                <SliderRow label="Font Size" value={obj.htmlConfig.fontSize ?? 32} min={8} max={200} step={1}
                  onChange={(v) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, fontSize: v } })} />
                <Row label="Font Weight">
                  <select
                    value={obj.htmlConfig.fontWeight ?? '400'}
                    onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, fontWeight: e.target.value } })}
                    className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                    style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                  >
                    <option value="300">Light 300</option>
                    <option value="400">Regular 400</option>
                    <option value="500">Medium 500</option>
                    <option value="600">Semi-Bold 600</option>
                    <option value="700">Bold 700</option>
                    <option value="800">Extra-Bold 800</option>
                    <option value="900">Black 900</option>
                  </select>
                </Row>
                <Row label="Text Align">
                  <select
                    value={obj.htmlConfig.textAlign ?? 'left'}
                    onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, textAlign: e.target.value as 'left' | 'center' | 'right' } })}
                    className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                    style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </Row>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px]" style={{ color: '#7A7E92' }}>Font Family</span>
                  <input
                    value={obj.htmlConfig.fontFamily ?? ''}
                    onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, fontFamily: e.target.value } })}
                    placeholder="inherit, serif, 'Inter', ..."
                    className="h-6 px-2 rounded text-[11px] outline-none border"
                    style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                  />
                </div>
              </>
            )}
            {/* Colors */}
            <Row label="Text Color">
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={obj.htmlConfig.color ?? '#ffffff'}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, color: e.target.value } })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  value={obj.htmlConfig.color ?? '#ffffff'}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, color: e.target.value } })}
                  className="flex-1 h-6 px-1.5 rounded text-[11px] font-mono outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            </Row>
            <Row label="Background">
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={obj.htmlConfig.background && obj.htmlConfig.background !== 'transparent' ? obj.htmlConfig.background : '#000000'}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, background: e.target.value } })}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  value={obj.htmlConfig.background ?? 'transparent'}
                  onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, background: e.target.value } })}
                  placeholder="transparent"
                  className="flex-1 h-6 px-1.5 rounded text-[11px] font-mono outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                />
              </div>
            </Row>
            {['badge','divider','card','quote','stat'].includes(obj.htmlConfig.htmlType) && (
              <Row label="Accent Color">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={obj.htmlConfig.accentColor ?? '#5B6CFF'}
                    onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, accentColor: e.target.value } })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    value={obj.htmlConfig.accentColor ?? '#5B6CFF'}
                    onChange={(e) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, accentColor: e.target.value } })}
                    className="flex-1 h-6 px-1.5 rounded text-[11px] font-mono outline-none border"
                    style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                  />
                </div>
              </Row>
            )}
            {/* Box */}
            <SliderRow label="Width (px)" value={obj.htmlConfig.width ?? 400} min={100} max={1200} step={10}
              onChange={(v) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, width: v } })} />
            {obj.htmlConfig.htmlType === 'spacer' && (
              <SliderRow label="Height (px)" value={obj.htmlConfig.height ?? 80} min={10} max={400} step={10}
                onChange={(v) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, height: v } })} />
            )}
            <SliderRow label="Padding (px)" value={obj.htmlConfig.padding ?? 0} min={0} max={80} step={1}
              onChange={(v) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, padding: v } })} />
            <SliderRow label="Border Radius" value={obj.htmlConfig.borderRadius ?? 0} min={0} max={60} step={1}
              onChange={(v) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, borderRadius: v } })} />
            <SliderRow label="Opacity" value={obj.htmlConfig.opacity ?? 1} min={0} max={1} step={0.01}
              onChange={(v) => updateObject(id, { htmlConfig: { ...obj.htmlConfig!, opacity: v } })} />
          </div>
        </Section>
      )}

      {/* Interactions */}
      {(obj.type === 'mesh' || obj.type === 'group' || obj.geometry?.type === 'gltf') && (
        <Section label="Interactions" icon={<Flame size={11} />} defaultOpen={false}>
          <div className="flex flex-col gap-2">
            <Row label="Hover">
              <select value={obj.interaction?.hoverEffect ?? 'none'}
                onChange={(e) => updateObject(id, { interaction: { ...(obj.interaction ?? { hoverEffect: 'none', clickAction: 'none' }), hoverEffect: e.target.value as 'none' | 'highlight' | 'scale' } })}
                className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}>
                <option value="none">None</option>
                <option value="highlight">Highlight</option>
                <option value="scale">Scale Up</option>
              </select>
            </Row>
            {obj.interaction?.hoverEffect !== 'none' && obj.interaction?.hoverEffect && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>Tooltip text</span>
                <input value={obj.interaction?.tooltipText ?? ''} placeholder="Hover label…"
                  onChange={(e) => updateObject(id, { interaction: { ...(obj.interaction ?? { hoverEffect: 'none', clickAction: 'none' }), tooltipText: e.target.value } })}
                  className="h-6 px-2 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }} />
              </div>
            )}
            <Row label="On Click">
              <select value={obj.interaction?.clickAction ?? 'none'}
                onChange={(e) => updateObject(id, { interaction: { ...(obj.interaction ?? { hoverEffect: 'none', clickAction: 'none' }), clickAction: e.target.value as 'none' | 'toggle-anim' | 'link' | 'toggle-visible' | 'camera-link' | 'switch-scene' } })}
                className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}>
                <option value="none">None</option>
                <option value="toggle-anim">Toggle Animation</option>
                <option value="toggle-visible">Toggle Visibility</option>
                <option value="link">Open Link</option>
                <option value="camera-link">Go to Camera Point</option>
                <option value="switch-scene">Switch Scene</option>
              </select>
            </Row>
            {obj.interaction?.clickAction === 'link' && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px]" style={{ color: '#7A7E92' }}>URL</span>
                <input value={obj.interaction?.linkUrl ?? ''} placeholder="https://…"
                  onChange={(e) => updateObject(id, { interaction: { ...(obj.interaction ?? { hoverEffect: 'none', clickAction: 'none' }), linkUrl: e.target.value } })}
                  className="h-6 px-2 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }} />
              </div>
            )}
            {obj.interaction?.clickAction === 'camera-link' && (
              <Row label="Keypoint">
                <select value={obj.interaction?.cameraKeypointId ?? ''}
                  onChange={(e) => updateObject(id, { interaction: { ...(obj.interaction ?? { hoverEffect: 'none', clickAction: 'camera-link' }), cameraKeypointId: e.target.value } })}
                  className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}>
                  <option value="">— select —</option>
                  {cameraPath.map((kp, i) => (
                    <option key={kp.id} value={kp.id}>{kp.label || `Camera ${i + 1}`}</option>
                  ))}
                </select>
              </Row>
            )}
            {obj.interaction?.clickAction === 'switch-scene' && (
              <Row label="Scene">
                <select value={obj.interaction?.targetSceneId ?? ''}
                  onChange={(e) => updateObject(id, { interaction: { ...(obj.interaction ?? { hoverEffect: 'none', clickAction: 'switch-scene' }), targetSceneId: e.target.value } })}
                  className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}>
                  <option value="">— select —</option>
                  {scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </Row>
            )}
          </div>
        </Section>
      )}

      {/* Scroll Animation — website mode only */}
      {appMode === 'website' && (obj.type === 'mesh' || obj.type === 'group' || obj.geometry?.type === 'gltf' || obj.type === 'html') && (() => {
        const sa: ScrollAnimConfig = obj.scrollAnim ?? { effect: 'none', enter: 0.3, exit: 0, distance: 2 }
        const isSlide = sa.effect === 'slideUp' || sa.effect === 'slideDown' || sa.effect === 'slideLeft' || sa.effect === 'slideRight'
        const set = (patch: Partial<ScrollAnimConfig>) => setScrollAnim(id, { ...sa, ...patch })
        return (
          <Section label="Scroll Animation" icon={<Play size={11} />} defaultOpen={true}>
            <div className="flex flex-col gap-2">
              <Row label="Effect">
                <select value={sa.effect}
                  onChange={(e) => set({ effect: e.target.value as ScrollAnimConfig['effect'] })}
                  className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                  style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}>
                  <option value="none">None</option>
                  <option value="fadeIn">Fade In</option>
                  <option value="slideUp">Slide Up</option>
                  <option value="slideDown">Slide Down</option>
                  <option value="slideLeft">Slide Left</option>
                  <option value="slideRight">Slide Right</option>
                  <option value="scaleIn">Scale In</option>
                  <option value="scaleOut">Scale Out</option>
                </select>
              </Row>
              {sa.effect !== 'none' && (
                <>
                  <Row label={`Enter ${Math.round(sa.enter * 100)}%`}>
                    <input type="range" min={0} max={1} step={0.01} value={sa.enter}
                      onChange={(e) => set({ enter: parseFloat(e.target.value) })}
                      className="flex-1 accent-indigo-500" />
                  </Row>
                  <Row label={sa.exit === 0 ? 'Exit Never' : `Exit ${Math.round(sa.exit * 100)}%`}>
                    <input type="range" min={0} max={1} step={0.01} value={sa.exit}
                      onChange={(e) => set({ exit: parseFloat(e.target.value) })}
                      className="flex-1 accent-indigo-500" />
                  </Row>
                  {isSlide && (
                    <Row label={`Distance ${sa.distance.toFixed(1)}`}>
                      <input type="range" min={0.5} max={10} step={0.1} value={sa.distance}
                        onChange={(e) => set({ distance: parseFloat(e.target.value) })}
                        className="flex-1 accent-indigo-500" />
                    </Row>
                  )}
                </>
              )}
            </div>
          </Section>
        )
      })()}
    </div>
  )
}
