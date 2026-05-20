'use client'

import { Zap } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import type { PhysicsConfig } from '@/lib/scene/SceneStore'

const DEFAULT_PHYSICS: PhysicsConfig = {
  enabled: true,
  type: 'dynamic',
  shape: 'auto',
  mass: 1,
  restitution: 0.3,
  friction: 0.5,
  linearDamping: 0.1,
  gravityScale: 1,
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] shrink-0 truncate" style={{ color: '#7A7E92', width: '110px' }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1" />
      <span className="text-[10px] font-mono w-8 text-right" style={{ color: '#7A7E92' }}>{value.toFixed(2)}</span>
    </div>
  )
}

export function PhysicsPanel() {
  const selectedIds = useScene((s) => s.selectedIds)
  const objects = useScene((s) => s.objects)
  const updateObject = useScene((s) => s.updateObject)
  const physicsEnabled = useScene((s) => s.physicsEnabled)
  const setPhysicsEnabled = useScene((s) => s.setPhysicsEnabled)

  const id = selectedIds[0]
  const obj = id ? objects[id] : null
  const phys = obj?.physics

  function updatePhys(patch: Partial<PhysicsConfig>) {
    if (!id) return
    const current = phys ?? { ...DEFAULT_PHYSICS }
    updateObject(id, { physics: { ...current, ...patch } })
  }

  return (
    <div className="flex flex-col gap-0 overflow-y-auto custom-scrollbar flex-1">
      {/* Global physics toggle */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid #1E2028' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={13} style={{ color: '#a855f7' }} />
            <span className="text-[12px] font-medium" style={{ color: '#E8E9F0' }}>Physics Engine</span>
          </div>
          <button
            onClick={() => setPhysicsEnabled(!physicsEnabled)}
            className="w-10 h-5 rounded-full relative transition-colors"
            style={{ background: physicsEnabled ? '#a855f7' : '#1E2028' }}
          >
            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: physicsEnabled ? 'calc(100% - 18px)' : '2px' }} />
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: '#7A7E92' }}>
          Enable global physics simulation. Objects need physics enabled individually.
        </p>
      </div>

      {/* Per-object physics */}
      {obj ? (
        <>
          <Section label="Enable Physics">
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: '#E8E9F0' }}>{obj.name}</span>
              <button
                onClick={() => updatePhys({ enabled: !(phys?.enabled) })}
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{ background: phys?.enabled ? '#a855f7' : '#1E2028' }}
              >
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: phys?.enabled ? 'calc(100% - 18px)' : '2px' }} />
              </button>
            </div>
          </Section>

          {phys?.enabled && (
            <>
              <Section label="Body">
                <div className="flex flex-col gap-2">
                  <Row label="Type">
                    <select
                      value={phys.type}
                      onChange={(e) => updatePhys({ type: e.target.value as PhysicsConfig['type'] })}
                      className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                      style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                    >
                      <option value="dynamic">Dynamic</option>
                      <option value="static">Static</option>
                      <option value="kinematic">Kinematic</option>
                    </select>
                  </Row>
                  <Row label="Shape">
                    <select
                      value={phys.shape}
                      onChange={(e) => updatePhys({ shape: e.target.value as PhysicsConfig['shape'] })}
                      className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
                      style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
                    >
                      <option value="auto">Auto</option>
                      <option value="box">Box</option>
                      <option value="sphere">Sphere</option>
                      <option value="capsule">Capsule</option>
                      <option value="hull">Convex Hull</option>
                    </select>
                  </Row>
                </div>
              </Section>

              <Section label="Properties">
                <div className="flex flex-col gap-2">
                  <SliderRow label="Mass" value={phys.mass} min={0.01} max={100} step={0.1}
                    onChange={(v) => updatePhys({ mass: v })} />
                  <SliderRow label="Restitution" value={phys.restitution} min={0} max={1} step={0.01}
                    onChange={(v) => updatePhys({ restitution: v })} />
                  <SliderRow label="Friction" value={phys.friction} min={0} max={1} step={0.01}
                    onChange={(v) => updatePhys({ friction: v })} />
                  <SliderRow label="Lin. Damping" value={phys.linearDamping} min={0} max={1} step={0.01}
                    onChange={(v) => updatePhys({ linearDamping: v })} />
                  <SliderRow label="Gravity Scale" value={phys.gravityScale} min={-2} max={5} step={0.1}
                    onChange={(v) => updatePhys({ gravityScale: v })} />
                </div>
              </Section>

              <div className="px-3 py-2">
                <p className="text-[10px]" style={{ color: '#7A7E92' }}>
                  Press <span style={{ color: '#5B6CFF' }}>Play</span> to start the simulation.
                  Objects will fall and collide based on their physics config.
                </p>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-20 px-4 text-center">
          <span className="text-[11px]" style={{ color: '#7A7E92' }}>Select an object to configure physics</span>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center h-7 px-3" style={{ borderBottom: '1px solid #1E2028', background: '#0d0f14' }}>
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#a855f7' }}>{label}</span>
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
      <span className="text-[11px] w-20 shrink-0" style={{ color: '#7A7E92' }}>{label}</span>
      <div className="flex items-center flex-1">{children}</div>
    </div>
  )
}
