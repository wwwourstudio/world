'use client'

import { useScene } from '@/lib/scene/SceneStore'
import type { AnimationConfig, AnimationPreset } from '@/lib/scene/SceneStore'

function NumInput({
  label, value, onChange, step = 0.01, color,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number; color?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 text-[10px] font-mono font-bold" style={{ color: color ?? '#7A7E92' }}>{label}</span>
      <input
        type="number"
        value={value.toFixed(3)}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 h-6 px-1.5 rounded text-[11px] font-mono outline-none border text-center"
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
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#7A7E92' }}>{label}</span>
      <div className="grid grid-cols-3 gap-1">
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
    <div className="flex flex-col gap-0 overflow-y-auto custom-scrollbar flex-1">
      {/* Name */}
      <Section label="Name">
        <input
          value={obj.name}
          onChange={(e) => updateObject(id, { name: e.target.value })}
          className="w-full h-7 px-2 rounded text-[12px] outline-none border"
          style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
        />
      </Section>

      {/* Transform */}
      <Section label="Transform">
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
        <div className="flex gap-2 mt-2">
          <SmallBtn onClick={() => updateObject(id, { transform: { ...transform, position: [0, 0, 0] } })}>Reset Pos</SmallBtn>
          <SmallBtn onClick={() => updateObject(id, { transform: { ...transform, rotation: [0, 0, 0] } })}>Reset Rot</SmallBtn>
          <SmallBtn onClick={() => updateObject(id, { transform: { ...transform, scale: [1, 1, 1] } })}>Reset Scl</SmallBtn>
        </div>
      </Section>

      {/* Light properties */}
      {obj.type === 'light' && obj.light && (
        <Section label="Light">
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
        <Section label="Shadow">
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

      {/* Animation */}
      <Section label="Animation">
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
      <Section label="Visibility">
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
      className="flex-1 h-6 rounded text-[10px] transition-colors border"
      style={{ color: '#7A7E92', borderColor: '#1E2028' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.background = '#1E2028' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.background = '' }}
    >
      {children}
    </button>
  )
}
