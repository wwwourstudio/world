'use client'

import { useState } from 'react'
import { useScene, MATERIAL_PRESETS } from '@/lib/scene/SceneStore'
import type { MaterialConfig, MaterialType } from '@/lib/scene/SceneStore'

const MAT_TYPES: MaterialType[] = ['standard', 'physical', 'glass', 'toon', 'wireframe', 'hologram']

const PRESET_SWATCHES = Object.entries(MATERIAL_PRESETS).map(([key, val]) => ({
  key,
  color: val.color ?? '#888',
  emissive: val.emissive ?? '#000',
}))

function ColorSwatch({ color, emissive, selected, onClick }: {
  color: string; emissive?: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={color}
      className="w-7 h-7 rounded-md transition-all"
      style={{
        background: emissive && emissive !== '#000000' ? `radial-gradient(circle, ${emissive} 0%, ${color} 100%)` : color,
        outline: selected ? '2px solid #5B6CFF' : '2px solid transparent',
        outlineOffset: '2px',
      }}
    />
  )
}

function SliderRow({ label, value, min = 0, max = 1, step = 0.01, onChange, accent }: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; accent?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] truncate shrink-0" style={{ color: '#7A7E92', width: '100px' }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1" />
      <span className="text-[10px] font-mono w-8 text-right" style={{ color: accent ?? '#7A7E92' }}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}

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
      <div className="flex items-center justify-center h-20 px-4 text-center">
        <span className="text-[11px]" style={{ color: '#7A7E92' }}>Select a mesh to edit its material</span>
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
    <div className="flex flex-col overflow-y-auto custom-scrollbar flex-1">
      {/* Material type */}
      <Section label="Material Type">
        <div className="flex flex-wrap gap-1">
          {MAT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                update({ type: t, ...(t === 'glass' ? { transmission: 1, ior: 1.5, opacity: 0.15, transparent: true } : t === 'wireframe' ? { wireframe: true } : {}) })
              }}
              className="px-2 h-6 rounded text-[10px] font-medium capitalize transition-colors border"
              style={{
                background: mat.type === t ? '#5B6CFF' : 'transparent',
                color: mat.type === t ? '#fff' : '#7A7E92',
                borderColor: mat.type === t ? '#5B6CFF' : '#1E2028',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      {/* Presets */}
      <Section label="Presets">
        <div className="flex flex-wrap gap-1.5">
          {PRESET_SWATCHES.map(({ key, color, emissive }) => (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <ColorSwatch
                color={color}
                emissive={emissive}
                selected={selectedPreset === key}
                onClick={() => applyPreset(key)}
              />
              <span className="text-[9px]" style={{ color: '#7A7E92' }}>{key}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Base color */}
      <Section label="Base Color">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={mat.color}
            onChange={(e) => { setSelectedPreset(null); update({ color: e.target.value }) }}
            className="w-10 h-10 rounded-md cursor-pointer border-0 p-0 bg-transparent"
          />
          <div className="flex flex-col gap-1 flex-1">
            <input
              value={mat.color}
              onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) update({ color: e.target.value }) }}
              className="h-6 px-2 rounded text-[11px] font-mono outline-none border"
              style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
            />
            <SliderRow label="Roughness" value={mat.roughness} onChange={(v) => update({ roughness: v })} />
            <SliderRow label="Metalness" value={mat.metalness} onChange={(v) => update({ metalness: v })} />
          </div>
        </div>
      </Section>

      {/* Emissive */}
      <Section label="Emissive">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="color"
            value={mat.emissive}
            onChange={(e) => update({ emissive: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
          />
          <span className="text-[11px] font-mono" style={{ color: '#7A7E92' }}>{mat.emissive}</span>
        </div>
        <SliderRow label="Intensity" value={mat.emissiveIntensity} min={0} max={5} step={0.05}
          onChange={(v) => update({ emissiveIntensity: v })} accent="#facc15" />
      </Section>

      {/* Opacity */}
      <Section label="Opacity / Transparency">
        <div className="flex flex-col gap-2">
          <SliderRow label="Opacity" value={mat.opacity} onChange={(v) => update({ opacity: v, transparent: v < 1 })} />
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: '#7A7E92', width: '100px' }}>Transparent</span>
            <input type="checkbox" checked={mat.transparent} onChange={(e) => update({ transparent: e.target.checked })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: '#7A7E92', width: '100px' }}>Wireframe</span>
            <input type="checkbox" checked={mat.wireframe} onChange={(e) => update({ wireframe: e.target.checked })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: '#7A7E92', width: '100px' }}>Flat Shading</span>
            <input type="checkbox" checked={mat.flatShading} onChange={(e) => update({ flatShading: e.target.checked })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: '#7A7E92', width: '100px' }}>Side</span>
            <select
              value={mat.side}
              onChange={(e) => update({ side: e.target.value as MaterialConfig['side'] })}
              className="flex-1 h-6 px-1 rounded text-[11px] outline-none border"
              style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
              <option value="double">Double</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Advanced */}
      <Section label="Advanced">
        <div className="flex flex-col gap-2">
          <SliderRow label="Env Map" value={mat.envMapIntensity} min={0} max={3} step={0.05}
            onChange={(v) => update({ envMapIntensity: v })} />
        </div>
      </Section>

      {/* Glass / Physical */}
      {showGlass && (
        <Section label="Transmission (Glass)">
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center h-7 px-3" style={{ borderBottom: '1px solid #1E2028', background: '#0d0f14' }}>
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#5B6CFF' }}>{label}</span>
      </div>
      <div className="px-3 py-3" style={{ borderBottom: '1px solid #1E2028' }}>
        {children}
      </div>
    </div>
  )
}
