'use client'

import { useWorldBuilder } from '@/lib/store'
import { HDRI_PRESETS, WEATHER_OPTIONS } from '@/lib/constants'
import type { HDRI, Weather } from '@/lib/constants'

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display?: string
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="text-[11px] text-gray-500 font-mono tabular-nums">
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 accent-blue-500 cursor-pointer"
      />
    </div>
  )
}

export function EnvTab() {
  const currentHDRI = useWorldBuilder((s) => s.currentHDRI)
  const setHDRI = useWorldBuilder((s) => s.setHDRI)
  const timeOfDay = useWorldBuilder((s) => s.timeOfDay)
  const setTimeOfDay = useWorldBuilder((s) => s.setTimeOfDay)
  const weather = useWorldBuilder((s) => s.weather)
  const setWeather = useWorldBuilder((s) => s.setWeather)
  const bloom = useWorldBuilder((s) => s.bloom)
  const setBloom = useWorldBuilder((s) => s.setBloom)
  const exposure = useWorldBuilder((s) => s.exposure)
  const setExposure = useWorldBuilder((s) => s.setExposure)
  const contrast = useWorldBuilder((s) => s.contrast)
  const setContrast = useWorldBuilder((s) => s.setContrast)

  const hours = Math.floor(timeOfDay)
  const mins = Math.round((timeOfDay % 1) * 60)
  const timeDisplay = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

  return (
    <div className="p-3 overflow-y-auto custom-scrollbar">
      <div className="mb-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Environment</div>
        <div className="grid grid-cols-3 gap-1.5">
          {HDRI_PRESETS.map((h) => (
            <button
              key={h.id}
              onClick={() => setHDRI(h.id as HDRI)}
              className={`py-2 px-1 rounded text-[11px] font-medium transition-colors ${
                currentHDRI === h.id
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-[#252525]'
                  : 'bg-[#333] text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-200'
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>

      <Slider
        label="Time of Day"
        value={timeOfDay}
        min={0}
        max={24}
        step={0.25}
        onChange={setTimeOfDay}
        display={timeDisplay}
      />

      <div className="mb-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Weather</div>
        <div className="flex gap-1.5">
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w}
              onClick={() => setWeather(w as Weather)}
              className={`flex-1 py-1.5 rounded text-[11px] capitalize font-medium transition-colors ${
                weather === w
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#333] text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-200'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Post Processing</div>
        <Slider label="Bloom" value={bloom} min={0} max={2} step={0.05} onChange={setBloom} />
        <Slider label="Exposure" value={exposure} min={0.5} max={2} step={0.05} onChange={setExposure} />
        <Slider label="Contrast" value={contrast} min={0.5} max={2} step={0.05} onChange={setContrast} />
      </div>
    </div>
  )
}
