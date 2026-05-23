'use client'

import { useScene } from '@/lib/scene/SceneStore'
import { captureCanvas } from '@/lib/canvasCapture'

// ─── UI Atoms ─────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-wider font-medium px-3 py-1.5 mb-1"
        style={{ color: '#7A7E92', borderBottom: '1px solid #1E2028' }}>
        {label}
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  )
}

function SliderRow({
  label, value, min, max, step, onChange, display, unit,
}: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; display?: string; unit?: string
}) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px]" style={{ color: '#7A7E92' }}>{label}</span>
        <span className="text-[10px] font-mono tabular-nums" style={{ color: '#5B6CFF' }}>
          {display ?? value.toFixed(step < 1 ? (step < 0.01 ? 3 : 2) : 0)}{unit ?? ''}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full cursor-pointer appearance-none"
        style={{ accentColor: '#5B6CFF' }}
      />
    </div>
  )
}

function ColorRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px]" style={{ color: '#7A7E92' }}>{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-7 h-6 rounded cursor-pointer border-0 p-0"
          style={{ background: 'transparent' }} />
        <span className="text-[10px] font-mono" style={{ color: '#5B6CFF' }}>{value}</span>
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px]" style={{ color: '#7A7E92' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-9 h-5 rounded-full transition-colors relative"
        style={{ background: value ? '#5B6CFF' : '#1E2028' }}
      >
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ left: value ? 'calc(100% - 18px)' : '2px' }} />
      </button>
    </div>
  )
}

// ─── Sky Presets ─────────────────────────────────────────────────────────────

const SKY_PRESETS = [
  { id: 'day',      label: 'Day',      turbidity: 10, rayleigh: 3,   sunElevation: 45, sunAzimuth: 180, skyEnabled: true  },
  { id: 'overcast', label: 'Overcast', turbidity: 20, rayleigh: 4,   sunElevation: 60, sunAzimuth: 180, skyEnabled: true  },
  { id: 'sunset',   label: 'Sunset',   turbidity: 10, rayleigh: 5,   sunElevation: 4,  sunAzimuth: 270, skyEnabled: true  },
  { id: 'night',    label: 'Night',    turbidity: 2,  rayleigh: 0.5, sunElevation: -8, sunAzimuth: 0,   skyEnabled: true  },
  { id: 'stormy',   label: 'Stormy',   turbidity: 20, rayleigh: 1,   sunElevation: 20, sunAzimuth: 90,  skyEnabled: true  },
  { id: 'studio',   label: 'Studio',   turbidity: 10, rayleigh: 3,   sunElevation: 45, sunAzimuth: 180, skyEnabled: false },
] as const

const SHADOW_PRESETS = [
  { label: 'Off',   size: 0    },
  { label: 'Low',   size: 512  },
  { label: 'Med',   size: 1024 },
  { label: 'High',  size: 2048 },
  { label: 'Ultra', size: 4096 },
]

// ─── LightingPanel ────────────────────────────────────────────────────────────

export function LightingPanel() {
  const env = useScene((s) => s.environment)
  const setEnvironment = useScene((s) => s.setEnvironment)
  const setBakePreview = useScene((s) => s.setBakePreview)
  const setBakeBlend = useScene((s) => s.setBakeBlend)
  const bakeBlend = useScene((s) => s.bakeBlend)
  const bakePreviewUrl = useScene((s) => s.bakePreviewUrl)

  function applyPreset(p: typeof SKY_PRESETS[number]) {
    setEnvironment({
      skyEnabled: p.skyEnabled,
      skyTurbidity: p.turbidity,
      skyRayleigh: p.rayleigh,
      sunElevation: p.sunElevation,
      sunAzimuth: p.sunAzimuth,
    })
  }

  function handleTimeOfDay(t: number) {
    // Map 0-24h to sun elevation and azimuth
    const elev = Math.sin(((t - 6) / 12) * Math.PI) * 80
    const azim = (t / 24) * 360
    setEnvironment({ sunElevation: elev, sunAzimuth: azim })
  }

  // Derive rough time from current elevation (display only)
  const approxHour = (() => {
    const elev = env.sunElevation
    // Inverse of sin((t-6)/12*PI)*80 = elev
    const sinVal = Math.max(-1, Math.min(1, elev / 80))
    const t = (Math.asin(sinVal) / Math.PI) * 12 + 6
    return ((t % 24) + 24) % 24
  })()

  function handleBakePreview() {
    const url = captureCanvas.dom?.toDataURL('image/jpeg', 0.92)
    if (url) {
      setBakePreview(url)
      setBakeBlend(0.5)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" style={{ background: '#111318' }}>

      {/* Sky Presets */}
      <Section label="Sky Presets">
        <div className="grid grid-cols-3 gap-1.5">
          {SKY_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="py-1.5 rounded-lg text-[11px] font-medium transition-all border"
              style={{
                background: '#0B0C0F',
                borderColor: '#1E2028',
                color: '#7A7E92',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF55'; e.currentTarget.style.color = '#E8E9F0' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.color = '#7A7E92' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Sky Settings */}
      <Section label="Sky">
        <ToggleRow label="Atmospheric Sky" value={env.skyEnabled} onChange={(v) => setEnvironment({ skyEnabled: v })} />

        {env.skyEnabled && (
          <>
            <SliderRow
              label="Time of Day"
              value={approxHour}
              min={0} max={24} step={0.25}
              onChange={handleTimeOfDay}
              display={`${Math.floor(approxHour).toString().padStart(2, '0')}:${Math.round((approxHour % 1) * 60).toString().padStart(2, '0')}`}
            />
            <SliderRow label="Sun Elevation" value={env.sunElevation} min={-10} max={90} step={0.5}
              onChange={(v) => setEnvironment({ sunElevation: v })} unit="°"
              display={env.sunElevation.toFixed(1)} />
            <SliderRow label="Sun Azimuth" value={env.sunAzimuth} min={0} max={360} step={1}
              onChange={(v) => setEnvironment({ sunAzimuth: v })} unit="°"
              display={env.sunAzimuth.toFixed(0)} />
            <SliderRow label="Turbidity" value={env.skyTurbidity} min={0} max={20} step={0.1}
              onChange={(v) => setEnvironment({ skyTurbidity: v })} />
            <SliderRow label="Rayleigh" value={env.skyRayleigh} min={0} max={4} step={0.05}
              onChange={(v) => setEnvironment({ skyRayleigh: v })} />
          </>
        )}
      </Section>

      {/* Shadows */}
      <Section label="Shadow Quality">
        <div className="flex gap-1">
          {SHADOW_PRESETS.map((p) => {
            const active = p.size === 0
              ? !env.shadowsEnabled
              : env.shadowsEnabled && env.shadowMapSize === p.size
            return (
              <button
                key={p.label}
                onClick={() => setEnvironment({
                  shadowsEnabled: p.size > 0,
                  shadowMapSize: p.size > 0 ? p.size : env.shadowMapSize,
                })}
                className="flex-1 py-1 rounded-md text-[10px] font-medium transition-all border"
                style={{
                  background: active ? '#1a1f3a' : '#0B0C0F',
                  borderColor: active ? '#5B6CFF' : '#1E2028',
                  color: active ? '#8B9CF4' : '#7A7E92',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[10px]" style={{ color: '#3a3a4a' }}>
          PCF Soft shadows · Bias auto-calculated
        </p>
      </Section>

      {/* Ambient / Directional */}
      <Section label="Environment Lighting">
        <ColorRow label="Ambient Color" value={env.ambientColor} onChange={(v) => setEnvironment({ ambientColor: v })} />
        <SliderRow label="Ambient Intensity" value={env.ambientIntensity} min={0} max={2} step={0.01}
          onChange={(v) => setEnvironment({ ambientIntensity: v })} />
        <ColorRow label="Sun Color" value={env.directionalColor} onChange={(v) => setEnvironment({ directionalColor: v })} />
        <SliderRow label="Sun Intensity" value={env.directionalIntensity} min={0} max={5} step={0.05}
          onChange={(v) => setEnvironment({ directionalIntensity: v })} />
      </Section>

      {/* Fog */}
      <Section label="Fog">
        <div className="flex gap-1 mb-3">
          {(['none', 'linear', 'exponential'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setEnvironment({ fogType: t })}
              className="flex-1 py-1 rounded-md text-[10px] font-medium capitalize transition-all border"
              style={{
                background: env.fogType === t ? '#1a1f3a' : '#0B0C0F',
                borderColor: env.fogType === t ? '#5B6CFF' : '#1E2028',
                color: env.fogType === t ? '#8B9CF4' : '#7A7E92',
              }}
            >
              {t === 'none' ? 'Off' : t === 'linear' ? 'Linear' : 'Exp'}
            </button>
          ))}
        </div>

        {env.fogType !== 'none' && (
          <>
            <ColorRow label="Fog Color" value={env.fogColor} onChange={(v) => setEnvironment({ fogColor: v })} />
            {env.fogType === 'linear' && (
              <>
                <SliderRow label="Near" value={env.fogNear} min={0} max={200} step={1}
                  onChange={(v) => setEnvironment({ fogNear: v })} />
                <SliderRow label="Far" value={env.fogFar} min={1} max={500} step={1}
                  onChange={(v) => setEnvironment({ fogFar: v })} />
              </>
            )}
            {env.fogType === 'exponential' && (
              <SliderRow label="Density" value={env.fogDensity} min={0} max={0.2} step={0.001}
                onChange={(v) => setEnvironment({ fogDensity: v })} />
            )}
          </>
        )}
      </Section>

      {/* Bake Preview */}
      <Section label="Bake Preview">
        <button
          onClick={handleBakePreview}
          className="w-full py-2 rounded-lg text-[12px] font-medium transition-all border mb-3"
          style={{
            background: 'linear-gradient(135deg, #1a1f3a, #0d0f1a)',
            borderColor: '#5B6CFF44',
            color: '#8B9CF4',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF'; e.currentTarget.style.color = '#a5b4fc' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#5B6CFF44'; e.currentTarget.style.color = '#8B9CF4' }}
        >
          ⬡ Bake Preview
        </button>

        {bakePreviewUrl && (
          <>
            <SliderRow label="Blend (Realtime ↔ Baked)" value={bakeBlend} min={0} max={1} step={0.01}
              onChange={setBakeBlend} display={(bakeBlend * 100).toFixed(0)} unit="%" />
            <button
              onClick={() => setBakePreview(null)}
              className="w-full py-1.5 rounded-lg text-[11px] transition-all border mt-1"
              style={{ borderColor: '#1E2028', color: '#7A7E92', background: '#0B0C0F' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#4a1515' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#1E2028' }}
            >
              Clear Bake
            </button>
          </>
        )}
      </Section>
    </div>
  )
}
