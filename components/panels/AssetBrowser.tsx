'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Sun } from 'lucide-react'
import Image from 'next/image'
import { useScene } from '@/lib/scene/SceneStore'
import { BUILT_IN_HDRIS, HDRI_CATEGORIES, filterHDRIs } from '@/lib/three/HDRILoader'
import type { HDRIAsset } from '@/lib/three/HDRILoader'

export function AssetBrowser() {
  const environment = useScene((s) => s.environment)
  const setEnvironment = useScene((s) => s.setEnvironment)
  const postFX = useScene((s) => s.postFX)
  const setPostFX = useScene((s) => s.setPostFX)
  const showNotification = useScene((s) => s.showNotification)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<'hdri' | 'postfx' | 'env'>('hdri')

  const hdris = filterHDRIs(BUILT_IN_HDRIS, category, search)
  const activeHDRI = environment.hdriName

  function loadHDRI(asset: HDRIAsset) {
    setLoading(asset.id)
    // The URL goes through our proxy to avoid CORS
    const proxyUrl = asset.downloadUrl
    setEnvironment({ hdriUrl: proxyUrl, hdriName: asset.name })
    showNotification(`Loading ${asset.name}…`)
    setTimeout(() => {
      setLoading(null)
      showNotification(`Loaded HDRI: ${asset.name}`)
    }, 1000)
  }

  function clearHDRI() {
    setEnvironment({ hdriUrl: null, hdriName: 'None' })
    showNotification('HDRI removed')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#111318' }}>
      {/* Tabs */}
      <div className="flex shrink-0 h-9" style={{ borderBottom: '1px solid #1E2028' }}>
        {(['hdri', 'postfx', 'env'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 text-[11px] font-medium uppercase tracking-wider transition-colors"
            style={{
              color: tab === t ? '#E8E9F0' : '#7A7E92',
              borderBottom: tab === t ? '2px solid #5B6CFF' : '2px solid transparent',
            }}
          >
            {t === 'hdri' ? 'HDRI' : t === 'postfx' ? 'Post FX' : 'Lighting'}
          </button>
        ))}
      </div>

      {tab === 'hdri' && (
        <>
          {/* Search + Filter */}
          <div className="px-3 py-2 flex flex-col gap-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
            <div className="flex items-center gap-2 px-2 h-7 rounded-md" style={{ background: '#0B0C0F', border: '1px solid #1E2028' }}>
              <Search size={11} style={{ color: '#7A7E92' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search HDRIs…"
                className="flex-1 bg-transparent text-[12px] outline-none"
                style={{ color: '#E8E9F0' }}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {HDRI_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="px-2 h-5 rounded text-[10px] capitalize transition-colors"
                  style={{
                    background: category === c ? '#5B6CFF' : '#1E2028',
                    color: category === c ? '#fff' : '#7A7E92',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Active HDRI controls */}
          {environment.hdriUrl && (
            <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
              <div className="text-[10px] mb-1.5 flex justify-between" style={{ color: '#7A7E92' }}>
                <span>Active: <span style={{ color: '#5B6CFF' }}>{activeHDRI}</span></span>
                <button onClick={clearHDRI} className="text-[10px] hover:text-red-400 transition-colors" style={{ color: '#7A7E92' }}>Remove</button>
              </div>
              <div className="flex flex-col gap-1.5">
                <SliderRow label="Intensity" value={environment.hdriIntensity} min={0} max={3} step={0.05}
                  onChange={(v) => setEnvironment({ hdriIntensity: v })} />
                <SliderRow label="Rotation" value={environment.hdriRotation} min={0} max={Math.PI * 2} step={0.05}
                  onChange={(v) => setEnvironment({ hdriRotation: v })} />
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: '#7A7E92', width: '80px' }}>Background</span>
                  <input type="checkbox" checked={environment.showBackground}
                    onChange={(e) => setEnvironment({ showBackground: e.target.checked })} />
                </div>
              </div>
            </div>
          )}

          {/* HDRI Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            <div className="grid grid-cols-2 gap-2">
              {hdris.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => loadHDRI(asset)}
                  className="relative rounded-lg overflow-hidden transition-all group border"
                  style={{
                    borderColor: activeHDRI === asset.name ? '#5B6CFF' : '#1E2028',
                    aspectRatio: '16/9',
                  }}
                >
                  <div className="absolute inset-0 bg-zinc-900">
                    <Image
                      src={asset.previewUrl}
                      alt={asset.name}
                      fill
                      sizes="(max-width: 400px) 50vw"
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      unoptimized
                    />
                  </div>
                  {loading === asset.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <RefreshCw size={14} className="animate-spin text-white" />
                    </div>
                  )}
                  {activeHDRI === asset.name && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/80">
                    <span className="text-[10px] text-white font-medium">{asset.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'postfx' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
          <FXToggleRow label="Bloom" active={postFX.bloom} onChange={(v) => setPostFX({ bloom: v })} />
          {postFX.bloom && (
            <>
              <SliderRow label="Bloom Intensity" value={postFX.bloomIntensity} min={0} max={3} step={0.05}
                onChange={(v) => setPostFX({ bloomIntensity: v })} />
              <SliderRow label="Threshold" value={postFX.bloomThreshold} min={0} max={1} step={0.01}
                onChange={(v) => setPostFX({ bloomThreshold: v })} />
            </>
          )}
          <FXToggleRow label="Vignette" active={postFX.vignette} onChange={(v) => setPostFX({ vignette: v })} />
          {postFX.vignette && (
            <>
              <SliderRow label="Offset" value={postFX.vignetteOffset} min={0} max={1} step={0.01}
                onChange={(v) => setPostFX({ vignetteOffset: v })} />
              <SliderRow label="Darkness" value={postFX.vignetteDarkness} min={0} max={1} step={0.01}
                onChange={(v) => setPostFX({ vignetteDarkness: v })} />
            </>
          )}
          <FXToggleRow label="Film Grain" active={postFX.noise} onChange={(v) => setPostFX({ noise: v })} />
          {postFX.noise && (
            <SliderRow label="Opacity" value={postFX.noiseOpacity} min={0} max={0.2} step={0.005}
              onChange={(v) => setPostFX({ noiseOpacity: v })} />
          )}
          <FXToggleRow label="Chromatic Aberration" active={postFX.chromaticAberration} onChange={(v) => setPostFX({ chromaticAberration: v })} />
          {postFX.chromaticAberration && (
            <SliderRow label="Offset" value={postFX.chromaticOffset} min={0} max={0.01} step={0.0005}
              onChange={(v) => setPostFX({ chromaticOffset: v })} />
          )}
          <SliderRow label="Exposure" value={postFX.toneMappingExposure} min={0.1} max={3} step={0.05}
            onChange={(v) => setPostFX({ toneMappingExposure: v })} />
        </div>
      )}

      {tab === 'env' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
          <ColorRow label="Ambient Color" value={environment.ambientColor} onChange={(v) => setEnvironment({ ambientColor: v })} />
          <SliderRow label="Ambient Intensity" value={environment.ambientIntensity} min={0} max={3} step={0.05}
            onChange={(v) => setEnvironment({ ambientIntensity: v })} />

          <div className="w-full h-px" style={{ background: '#1E2028' }} />

          <ColorRow label="Sun Color" value={environment.directionalColor} onChange={(v) => setEnvironment({ directionalColor: v })} />
          <SliderRow label="Sun Intensity" value={environment.directionalIntensity} min={0} max={5} step={0.1}
            onChange={(v) => setEnvironment({ directionalIntensity: v })} />

          <div className="w-full h-px" style={{ background: '#1E2028' }} />

          <div className="flex items-center gap-2">
            <span className="text-[11px] shrink-0" style={{ color: '#7A7E92', width: '100px' }}>Fog Type</span>
            <select
              value={environment.fogType}
              onChange={(e) => setEnvironment({ fogType: e.target.value as typeof environment.fogType })}
              className="flex-1 h-6 px-1.5 rounded text-[11px] outline-none border"
              style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028' }}
            >
              <option value="none">None</option>
              <option value="linear">Linear</option>
              <option value="exponential">Exponential</option>
            </select>
          </div>

          {environment.fogType !== 'none' && (
            <>
              <ColorRow label="Fog Color" value={environment.fogColor} onChange={(v) => setEnvironment({ fogColor: v })} />
              {environment.fogType === 'exponential' && (
                <SliderRow label="Density" value={environment.fogDensity} min={0} max={0.2} step={0.001}
                  onChange={(v) => setEnvironment({ fogDensity: v })} />
              )}
              {environment.fogType === 'linear' && (
                <>
                  <SliderRow label="Near" value={environment.fogNear} min={0} max={100} step={1}
                    onChange={(v) => setEnvironment({ fogNear: v })} />
                  <SliderRow label="Far" value={environment.fogFar} min={10} max={500} step={5}
                    onChange={(v) => setEnvironment({ fogFar: v })} />
                </>
              )}
            </>
          )}

          <div className="w-full h-px" style={{ background: '#1E2028' }} />
          <ColorRow label="Background" value={environment.backgroundColor} onChange={(v) => setEnvironment({ backgroundColor: v })} />

          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: '#7A7E92', width: '100px' }}>Shadows</span>
            <input type="checkbox" checked={environment.shadowsEnabled}
              onChange={(e) => setEnvironment({ shadowsEnabled: e.target.checked })} />
          </div>
        </div>
      )}
    </div>
  )
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] shrink-0 truncate" style={{ color: '#7A7E92', width: '100px' }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1" />
      <span className="text-[10px] font-mono w-10 text-right" style={{ color: '#7A7E92' }}>{value.toFixed(2)}</span>
    </div>
  )
}

function FXToggleRow({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] flex-1" style={{ color: active ? '#E8E9F0' : '#7A7E92' }}>{label}</span>
      <button
        onClick={() => onChange(!active)}
        className="w-10 h-5 rounded-full relative transition-colors"
        style={{ background: active ? '#5B6CFF' : '#1E2028' }}
      >
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: active ? 'calc(100% - 18px)' : '2px' }} />
      </button>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] shrink-0" style={{ color: '#7A7E92', width: '100px' }}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-7 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" />
      <span className="text-[11px] font-mono" style={{ color: '#7A7E92' }}>{value}</span>
    </div>
  )
}
