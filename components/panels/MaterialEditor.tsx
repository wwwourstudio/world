'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronRight, Palette, Layers, Sparkles, Settings,
  Grid2x2, Droplets, Sun, Blend,
} from 'lucide-react'
import { useScene, MATERIAL_PRESETS } from '@/lib/scene/SceneStore'
import type { MaterialConfig, MaterialType } from '@/lib/scene/SceneStore'

const MAT_TYPES: MaterialType[] = ['standard', 'physical', 'glass', 'toon', 'wireframe', 'hologram']

const PRESET_SWATCHES = Object.entries(MATERIAL_PRESETS).map(([key, val]) => ({
  key,
  color: val.color ?? '#888',
  emissive: val.emissive ?? '#000',
}))

// ─── Section ─────────────────────────────────────────────────────────────────

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
      {open && <div className="px-3 py-2.5">{children}</div>}
    </div>
  )
}

// ─── SliderRow ────────────────────────────────────────────────────────────────

function SliderRow({ label, value, min = 0, max = 1, step = 0.01, onChange, accent }: {
  label: string; value: number; min?: number; max?: number; step?: number
  onChange: (v: number) => void; accent?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] shrink-0" style={{ color: '#7A7E92', width: '68px' }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1" style={{ accentColor: accent ?? '#5B6CFF' }}
      />
      <span className="text-[10px] font-mono w-7 text-right shrink-0" style={{ color: accent ?? '#7A7E92' }}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}

// ─── ColorPicker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative cursor-pointer shrink-0">
        <div
          className="w-9 h-9 rounded-lg"
          style={{ background: value, border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <input
          type="color" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <input
        value={value}
        onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
        className="flex-1 h-7 px-2 rounded text-[11px] font-mono outline-none border"
        style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
      />
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center h-6">
      <span className="flex-1 text-[11px]" style={{ color: '#7A7E92' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-8 h-4 rounded-full transition-all shrink-0"
        style={{
          background: checked ? '#5B6CFF' : '#1E2028',
          border: `1px solid ${checked ? '#5B6CFF80' : '#2a2d3a'}`,
        }}
      >
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
          style={{ background: '#fff', left: checked ? '17px' : '1px', opacity: checked ? 1 : 0.35 }}
        />
      </button>
    </div>
  )
}

// ─── MaterialEditor ───────────────────────────────────────────────────────────

export function MaterialEditor() {
  const selectedIds = useScene((s) => s.selectedIds)
  const objects = useScene((s) => s.objects)
  const updateObject = useScene((s) => s.updateObject)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const id = selectedIds[0]
  const obj = id ? objects[id] : null
  const mat = obj?.material

  if (!mat) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-32 px-4 text-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1E2028' }}>
          <Palette size={18} style={{ color: '#2a2d3a' }} />
        </div>
        <span className="text-[11px]" style={{ color: '#4a4e5e' }}>Select a mesh to edit its material</span>
      </div>
    )
  }

  function update(patch: Partial<MaterialConfig>) {
    updateObject(id, { material: { ...mat!, ...patch } })
  }

  function applyPreset(key: string) {
    const preset = MATERIAL_PRESETS[key]
    if (!preset) return
    setSelectedPreset(key)
    update(preset as Partial<MaterialConfig>)
  }

  const showGlass = mat.type === 'glass' || mat.type === 'physical' || mat.transmission > 0

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar flex-1 min-h-0">

      {/* Type */}
      <Section label="Type" icon={<Layers size={11} />}>
        <div className="flex flex-wrap gap-1">
          {MAT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => update({
                type: t,
                ...(t === 'glass' ? { transmission: 1, ior: 1.5, opacity: 0.15, transparent: true } : {}),
                ...(t === 'wireframe' ? { wireframe: true } : {}),
              })}
              className="px-2.5 h-6 rounded-full text-[10px] font-medium capitalize transition-all"
              style={{
                background: mat.type === t ? '#5B6CFF20' : 'transparent',
                color: mat.type === t ? '#8B9CFF' : '#7A7E92',
                border: `1px solid ${mat.type === t ? '#5B6CFF50' : '#1E2028'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      {/* Presets */}
      <Section label="Presets" icon={<Sparkles size={11} />}>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_SWATCHES.map(({ key, color, emissive }) => (
            <button
              key={key}
              title={key}
              onClick={() => applyPreset(key)}
              className="flex flex-col items-center gap-0.5"
            >
              <div
                className="w-full rounded-md transition-all"
                style={{
                  aspectRatio: '1/1',
                  background:
                    emissive && emissive !== '#000000'
                      ? `radial-gradient(circle at 38% 38%, ${emissive} 0%, ${color} 68%)`
                      : color,
                  outline: selectedPreset === key ? '2px solid #5B6CFF' : '2px solid transparent',
                  outlineOffset: '1px',
                  boxShadow: selectedPreset === key ? `0 0 6px ${color}70` : 'none',
                }}
              />
              <span className="text-[8px] truncate w-full text-center" style={{ color: '#4a4e5e' }}>{key}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Base Color */}
      <Section label="Base Color" icon={<Palette size={11} />}>
        <div className="flex flex-col gap-2">
          <ColorPicker
            value={mat.color}
            onChange={(v) => { setSelectedPreset(null); update({ color: v }) }}
          />
          <SliderRow label="Roughness" value={mat.roughness} onChange={(v) => update({ roughness: v })} />
          <SliderRow label="Metalness" value={mat.metalness} onChange={(v) => update({ metalness: v })} />
        </div>
      </Section>

      {/* Emissive */}
      <Section label="Emissive" icon={<Sun size={11} />} defaultOpen={false}>
        <div className="flex flex-col gap-2">
          <ColorPicker
            value={mat.emissive}
            onChange={(v) => update({ emissive: v })}
          />
          <SliderRow
            label="Intensity" value={mat.emissiveIntensity} min={0} max={5} step={0.05}
            onChange={(v) => update({ emissiveIntensity: v })} accent="#facc15"
          />
        </div>
      </Section>

      {/* Surface */}
      <Section label="Surface" icon={<Blend size={11} />} defaultOpen={false}>
        <div className="flex flex-col gap-1.5">
          <SliderRow label="Opacity" value={mat.opacity} onChange={(v) => update({ opacity: v, transparent: v < 1 })} />
          <Toggle label="Transparent" checked={mat.transparent} onChange={(v) => update({ transparent: v })} />
          <Toggle label="Wireframe" checked={mat.wireframe} onChange={(v) => update({ wireframe: v })} />
          <Toggle label="Flat Shading" checked={mat.flatShading} onChange={(v) => update({ flatShading: v })} />
          <div className="flex items-center h-6 mt-0.5">
            <span className="flex-1 text-[11px]" style={{ color: '#7A7E92' }}>Side</span>
            <select
              value={mat.side}
              onChange={(e) => update({ side: e.target.value as MaterialConfig['side'] })}
              className="h-6 px-1.5 rounded text-[10px] outline-none border"
              style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028', width: '80px' }}
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
              <option value="double">Double</option>
            </select>
          </div>
        </div>
      </Section>

      {/* UV Tiling */}
      <Section label="UV Tiling" icon={<Grid2x2 size={11} />} defaultOpen={false}>
        <div className="flex flex-col gap-2">
          <SliderRow
            label="Repeat U" value={mat.textureRepeat?.[0] ?? 1} min={0.1} max={20} step={0.1}
            onChange={(v) => update({ textureRepeat: [v, mat.textureRepeat?.[1] ?? 1] })}
          />
          <SliderRow
            label="Repeat V" value={mat.textureRepeat?.[1] ?? 1} min={0.1} max={20} step={0.1}
            onChange={(v) => update({ textureRepeat: [mat.textureRepeat?.[0] ?? 1, v] })}
          />
          <button
            onClick={() => update({ textureRepeat: [1, 1] })}
            className="h-6 w-full rounded text-[10px] border transition-colors mt-0.5"
            style={{ color: '#7A7E92', borderColor: '#1E2028' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1E2028'; (e.currentTarget as HTMLButtonElement).style.color = '#E8E9F0' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = '#7A7E92' }}
          >
            Reset Tiling
          </button>
        </div>
      </Section>

      {/* Advanced */}
      <Section label="Advanced" icon={<Settings size={11} />} defaultOpen={false}>
        <SliderRow
          label="Env Map" value={mat.envMapIntensity} min={0} max={3} step={0.05}
          onChange={(v) => update({ envMapIntensity: v })}
        />
      </Section>

      {/* Glass / Physical */}
      {showGlass && (
        <Section label="Transmission" icon={<Droplets size={11} />}>
          <div className="flex flex-col gap-2">
            <SliderRow label="Transmission" value={mat.transmission} onChange={(v) => update({ transmission: v, transparent: v > 0 })} accent="#93c5fd" />
            <SliderRow label="IOR" value={mat.ior} min={1} max={2.5} step={0.01} onChange={(v) => update({ ior: v })} />
            <SliderRow label="Thickness" value={mat.thickness} min={0} max={5} step={0.05} onChange={(v) => update({ thickness: v })} />
          </div>
        </Section>
      )}

    </div>
  )
}
