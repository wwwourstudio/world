'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Search } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Slider from '@radix-ui/react-slider'
import { useWorldBuilder } from '@/lib/store'
import { HDRI_PRESETS, ASSET_PRESETS, WEATHER_OPTIONS } from '@/lib/constants'
import { cn, formatTime } from '@/lib/utils'
import type { Weather } from '@/lib/constants'

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-mono text-blue-400">{value.toFixed(2).replace(/\.?0+$/, '') || '0'}</span>
      </div>
      <Slider.Root
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="relative flex items-center w-full h-5 touch-none"
      >
        <Slider.Track className="relative h-2 grow rounded-full bg-white/10 overflow-hidden">
          <Slider.Range className="absolute h-full bg-blue-500/60" />
        </Slider.Track>
        <Slider.Thumb className="block w-4 h-4 rounded-full bg-white shadow-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </Slider.Root>
    </div>
  )
}

export function EnvironmentPanel() {
  const {
    isPanelOpen, togglePanel,
    currentHDRI, setHDRI,
    timeOfDay, setTimeOfDay,
    weather, setWeather,
    bloom, setBloom,
    exposure, setExposure,
    contrast, setContrast,
    showNotification,
  } = useWorldBuilder()

  const [assetSearch, setAssetSearch] = useState('')

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-screen w-[400px] z-30',
        'backdrop-blur-xl bg-black/40 border-l border-white/10',
        'shadow-2xl transition-transform duration-300 ease-out',
        isPanelOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Environment &amp; Assets</h2>
        <button
          onClick={togglePanel}
          aria-label="Close panel"
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <Tabs.Root defaultValue="environment" className="h-[calc(100%-64px)]">
        <Tabs.List className="grid grid-cols-2 bg-white/5 border-b border-white/10">
          <Tabs.Trigger
            value="environment"
            className="py-2 text-sm font-medium text-gray-400 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 transition-colors"
          >
            Environment
          </Tabs.Trigger>
          <Tabs.Trigger
            value="assets"
            className="py-2 text-sm font-medium text-gray-400 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 transition-colors"
          >
            Assets
          </Tabs.Trigger>
        </Tabs.List>

        <div className="overflow-y-auto h-[calc(100%-48px)] custom-scrollbar">
          {/* ── Environment Tab ── */}
          <Tabs.Content value="environment" className="p-4 space-y-6">
            {/* HDRI presets */}
            <section>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">HDRI Environment</h3>
              <div className="grid grid-cols-2 gap-3">
                {HDRI_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setHDRI(preset.id)}
                    className={cn(
                      'relative rounded-xl overflow-hidden transition-all duration-200',
                      currentHDRI === preset.id
                        ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20'
                        : 'ring-1 ring-white/10 hover:ring-white/30',
                    )}
                  >
                    <Image
                      src={preset.image}
                      alt={preset.name}
                      width={200}
                      height={96}
                      className="w-full h-24 object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                      <span className="text-xs font-medium text-white">{preset.name}</span>
                    </div>
                    {currentHDRI === preset.id && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 shadow-lg shadow-blue-500/50" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Time of day */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-300">Time of Day</h3>
                <span className="text-xs font-mono text-blue-400">{formatTime(timeOfDay)}</span>
              </div>
              <Slider.Root
                value={[timeOfDay]}
                onValueChange={([v]) => setTimeOfDay(v)}
                min={0}
                max={24}
                step={0.5}
                className="relative flex items-center w-full h-5 touch-none mb-2"
              >
                <Slider.Track className="relative h-2 grow rounded-full bg-white/10 overflow-hidden">
                  <Slider.Range className="absolute h-full bg-blue-500/60" />
                </Slider.Track>
                <Slider.Thumb className="block w-4 h-4 rounded-full bg-white shadow-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Slider.Root>
              <div className="flex justify-between text-xs text-gray-500">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
              </div>
            </section>

            {/* Weather */}
            <section>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Weather</h3>
              <div className="flex gap-2">
                {WEATHER_OPTIONS.map((w: Weather) => (
                  <button
                    key={w}
                    onClick={() => setWeather(w)}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200',
                      weather === w
                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10',
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </section>

            {/* Post-processing */}
            <section>
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Post-Processing</h3>
              <SliderRow label="Bloom" value={bloom} min={0} max={2} step={0.1} onChange={setBloom} />
              <SliderRow label="Exposure" value={exposure} min={0.1} max={3} step={0.1} onChange={setExposure} />
              <SliderRow label="Contrast" value={contrast} min={0.5} max={1.5} step={0.05} onChange={setContrast} />
            </section>
          </Tabs.Content>

          {/* ── Assets Tab ── */}
          <Tabs.Content value="assets" className="p-4 space-y-6">
            {/* Sketchfab search */}
            <section>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Sketchfab (7M+ Models)</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search 3D models..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && assetSearch.length > 2) {
                      showNotification(`Searching Sketchfab for "${assetSearch}"…`)
                    }
                  }}
                  className="
                    w-full pl-10 pr-4 py-2 rounded-lg
                    bg-white/5 border border-white/10 text-white
                    placeholder:text-gray-500
                    focus:outline-none focus:border-blue-500/50
                    text-sm transition-colors
                  "
                />
              </div>
            </section>

            {/* Preset assets */}
            <section>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Preset Assets</h3>
              <div className="grid grid-cols-2 gap-3">
                {ASSET_PRESETS.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => showNotification(`Added ${asset.name}`)}
                    className="relative rounded-xl overflow-hidden group ring-1 ring-white/10 hover:ring-white/30 transition-all duration-200"
                  >
                    <Image
                      src={asset.image}
                      alt={asset.name}
                      width={150}
                      height={128}
                      className="w-full h-32 object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                      <span className="text-xs font-medium text-white">{asset.name}</span>
                    </div>
                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}
