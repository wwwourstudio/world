'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, RefreshCw, Download } from 'lucide-react'
import Image from 'next/image'
import { useScene } from '@/lib/scene/SceneStore'
import type { MaterialMaps } from '@/lib/scene/SceneStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PHAsset {
  name: string
  type: number
  categories: string[]
  tags: string[]
}
type PHAssetsMap = Record<string, PHAsset>

// ─── Data hooks ───────────────────────────────────────────────────────────────

function usePolyHavenAssets(type: 'hdris' | 'textures') {
  const [assets, setAssets] = useState<PHAssetsMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetch(`/api/polyhaven/assets?t=${type}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setAssets(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [type])

  return { assets, loading, error }
}

// ─── Recently Used Hook ──────────────────────────────────────────────────────

function useRecentAssets(storageKey: string, max = 6) {
  const get = (): string[] => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { return [] }
  }
  const add = (id: string) => {
    try {
      const list = [id, ...get().filter((x) => x !== id)].slice(0, max)
      localStorage.setItem(storageKey, JSON.stringify(list))
    } catch { /* localStorage may be unavailable */ }
  }
  return { get, add }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function thumbUrl(id: string) {
  return `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256`
}

function getCategories(assets: PHAssetsMap): string[] {
  const cats = new Set<string>()
  for (const a of Object.values(assets)) {
    for (const c of (a.categories ?? [])) cats.add(c)
  }
  return ['all', ...Array.from(cats).sort()]
}

function filterAssets(assets: PHAssetsMap, category: string, search: string) {
  const q = search.toLowerCase().trim()
  return Object.entries(assets).filter(([id, a]) => {
    const matchCat = category === 'all' || (a.categories ?? []).includes(category)
    const matchSearch = !q || id.includes(q) || a.name.toLowerCase().includes(q)
    return matchCat && matchSearch
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTextureMaps(files: Record<string, any>): MaterialMaps {
  const maps: MaterialMaps = {}
  const res = '1k'
  const colorUrl =
    files?.Color?.[res]?.jpg?.url ??
    files?.Diffuse?.[res]?.jpg?.url ??
    files?.diff?.[res]?.jpg?.url ?? null
  if (colorUrl) maps.map = colorUrl

  const roughUrl =
    files?.Roughness?.[res]?.jpg?.url ??
    files?.rough?.[res]?.jpg?.url ?? null
  if (roughUrl) maps.roughnessMap = roughUrl

  const metalUrl =
    files?.Metalness?.[res]?.jpg?.url ??
    files?.Metallic?.[res]?.jpg?.url ??
    files?.metal?.[res]?.jpg?.url ?? null
  if (metalUrl) maps.metalnessMap = metalUrl

  const normalUrl =
    files?.nor_gl?.[res]?.jpg?.url ??
    files?.Normal?.[res]?.jpg?.url ??
    files?.nor_dx?.[res]?.jpg?.url ?? null
  if (normalUrl) maps.normalMap = normalUrl

  return maps
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 px-2 h-7 rounded-md" style={{ background: '#0B0C0F', border: '1px solid #1E2028' }}>
      <Search size={11} style={{ color: '#7A7E92' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[12px] outline-none"
        style={{ color: '#E8E9F0' }}
      />
    </div>
  )
}

function CategoryChips({ categories, active, onChange }: { categories: string[]; active: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="px-2 h-5 rounded text-[10px] capitalize transition-colors"
          style={{ background: active === c ? '#5B6CFF' : '#1E2028', color: active === c ? '#fff' : '#7A7E92' }}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

function LoadingGrid({ aspect = '16/9' }: { aspect?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg animate-pulse" style={{ aspectRatio: aspect, background: '#1E2028' }} />
      ))}
    </div>
  )
}

// ─── HDRI Tab ─────────────────────────────────────────────────────────────────

function HDRITab() {
  const environment = useScene((s) => s.environment)
  const setEnvironment = useScene((s) => s.setEnvironment)
  const showNotification = useScene((s) => s.showNotification)
  const { assets, loading, error } = usePolyHavenAssets('hdris')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [applying, setApplying] = useState<string | null>(null)
  const recent = useRecentAssets('wb_recent_hdri')
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => { setRecentIds(recent.get()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = getCategories(assets).slice(0, 10)
  const filtered = filterAssets(assets, category, search)
  const activeId = environment.hdriName

  function applyHDRI(id: string, name: string) {
    setApplying(id)
    recent.add(id)
    setRecentIds(recent.get())
    setEnvironment({ hdriUrl: `/api/hdri/${id}.hdr`, hdriName: id })
    showNotification(`Applying ${name}…`)
    setTimeout(() => { setApplying(null); showNotification(`HDRI: ${name}`) }, 1200)
  }

  return (
    <>
      <div className="px-3 py-2 flex flex-col gap-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search ~550 HDRIs…" />
        <CategoryChips categories={categories} active={category} onChange={setCategory} />
      </div>

      {environment.hdriUrl && (
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
          <div className="flex justify-between text-[10px] mb-1.5" style={{ color: '#7A7E92' }}>
            <span>Active: <span style={{ color: '#5B6CFF' }}>{activeId}</span></span>
            <button onClick={() => setEnvironment({ hdriUrl: null, hdriName: 'None' })} className="hover:text-red-400 transition-colors">Remove</button>
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {recentIds.length > 0 && !search && category === 'all' && (
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#3a3e50' }}>Recent</p>
            <div className="grid grid-cols-3 gap-1.5">
              {recentIds.map((id) => (
                <button key={id} onClick={() => applyHDRI(id, id)}
                  className="relative rounded-md overflow-hidden border"
                  style={{ borderColor: activeId === id ? '#5B6CFF' : '#1E2028', aspectRatio: '16/9' }}>
                  <div className="absolute inset-0" style={{ background: '#1E2028' }}>
                    <Image src={thumbUrl(id)} alt={id} fill sizes="90px" className="object-cover opacity-80 hover:opacity-100 transition-opacity" unoptimized />
                  </div>
                  {activeId === id && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-[11px] text-center py-6" style={{ color: '#f87171' }}>Failed to load HDRIs</p>}
        {!error && loading && <LoadingGrid aspect="16/9" />}
        {!error && !loading && (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(([id, asset]) => (
              <button
                key={id}
                onClick={() => applyHDRI(id, asset.name)}
                className="relative rounded-lg overflow-hidden transition-all group border"
                style={{ borderColor: activeId === id ? '#5B6CFF' : '#1E2028', aspectRatio: '16/9' }}
              >
                <div className="absolute inset-0" style={{ background: '#1E2028' }}>
                  <Image src={thumbUrl(id)} alt={asset.name} fill sizes="140px"
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" unoptimized />
                </div>
                {applying === id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <RefreshCw size={14} className="animate-spin text-white" />
                  </div>
                )}
                {activeId === id && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400" />}
                <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/80">
                  <span className="text-[10px] text-white font-medium truncate block">{asset.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Textures Tab ─────────────────────────────────────────────────────────────

function TexturesTab() {
  const selectedIds = useScene((s) => s.selectedIds)
  const updateObject = useScene((s) => s.updateObject)
  const showNotification = useScene((s) => s.showNotification)
  const { assets, loading, error } = usePolyHavenAssets('textures')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [applying, setApplying] = useState<string | null>(null)
  const recent = useRecentAssets('wb_recent_tex')
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => { setRecentIds(recent.get()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = getCategories(assets).slice(0, 10)
  const filtered = filterAssets(assets, category, search)

  async function applyTexture(id: string, name: string) {
    if (selectedIds.length === 0) {
      showNotification('Select an object first')
      return
    }
    setApplying(id)
    recent.add(id)
    setRecentIds(recent.get())
    try {
      const res = await fetch(`/api/polyhaven/files/${id}`)
      const files = await res.json()
      const maps = parseTextureMaps(files)
      for (const objId of selectedIds) {
        updateObject(objId, { material: { maps: Object.keys(maps).length > 0 ? maps : undefined } })
      }
      showNotification(`Texture applied: ${name}`)
    } catch {
      showNotification('Failed to apply texture')
    } finally {
      setApplying(null)
    }
  }

  return (
    <>
      <div className="px-3 py-2 flex flex-col gap-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search ~1000 textures…" />
        <CategoryChips categories={categories} active={category} onChange={setCategory} />
      </div>
      {selectedIds.length === 0 && (
        <div className="px-3 py-1.5 shrink-0 text-[11px] text-center" style={{ color: '#7A7E92', background: '#0d0e12', borderBottom: '1px solid #1E2028' }}>
          Select an object to apply a texture
        </div>
      )}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {recentIds.length > 0 && !search && category === 'all' && (
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#3a3e50' }}>Recent</p>
            <div className="grid grid-cols-3 gap-1.5">
              {recentIds.map((id) => (
                <button key={id} onClick={() => applyTexture(id, id)}
                  className="relative rounded-md overflow-hidden border"
                  style={{ borderColor: '#1E2028', aspectRatio: '1/1' }}>
                  <div className="absolute inset-0" style={{ background: '#1E2028' }}>
                    <Image src={thumbUrl(id)} alt={id} fill sizes="90px" className="object-cover opacity-80 hover:opacity-100 transition-opacity" unoptimized />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-[11px] text-center py-6" style={{ color: '#f87171' }}>Failed to load textures</p>}
        {!error && loading && <LoadingGrid aspect="1/1" />}
        {!error && !loading && (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(([id, asset]) => (
              <button
                key={id}
                onClick={() => applyTexture(id, asset.name)}
                className="relative rounded-lg overflow-hidden transition-all group border"
                style={{ borderColor: '#1E2028', aspectRatio: '1/1' }}
              >
                <div className="absolute inset-0" style={{ background: '#1E2028' }}>
                  <Image src={thumbUrl(id)} alt={asset.name} fill sizes="140px"
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" unoptimized />
                </div>
                {applying === id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <RefreshCw size={14} className="animate-spin text-white" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/80">
                  <span className="text-[10px] text-white font-medium truncate block">{asset.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Sketchfab Tab ────────────────────────────────────────────────────────────

interface SketchfabModel {
  uid: string
  name: string
  thumbnail: string | null
  downloadable: boolean
  viewerUrl: string
}

function SketchfabTab() {
  const addObject = useScene((s) => s.addObject)
  const showNotification = useScene((s) => s.showNotification)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SketchfabModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function search(q: string) {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sketchfab/search?q=${encodeURIComponent(q)}&count=20`)
      const data = await res.json()
      if (data.error) { setError(data.error); setResults([]) }
      else setResults(data.results ?? [])
    } catch {
      setError('Search failed')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(val: string) {
    setQuery(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => search(val), 600)
  }

  async function importModel(model: SketchfabModel) {
    if (!model.downloadable) {
      showNotification('This model is not available for download (license restricted)')
      return
    }
    setImporting(model.uid)
    showNotification(`Fetching ${model.name}…`)
    try {
      const res = await fetch(`/api/sketchfab/download/${model.uid}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (!data.url) throw new Error('No download URL returned — model may require a Sketchfab Pro account')
      addObject({
        name: model.name,
        type: 'mesh',
        geometry: { type: 'gltf', url: data.url },
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      })
      showNotification(`Imported: ${model.name}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      showNotification(`Import failed: ${msg}`, 'error')
    } finally {
      setImporting(null)
    }
  }

  return (
    <>
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <SearchBar value={query} onChange={handleSearch} placeholder="Search Sketchfab models…" />
        {!error && results.length === 0 && !loading && !query && (
          <p className="text-[10px] mt-2 text-center" style={{ color: '#7A7E92' }}>Requires SKETCHFAB_API_KEY env var</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {error && <p className="text-[11px] text-center py-4" style={{ color: '#f87171' }}>{error}</p>}
        {!error && loading && <LoadingGrid aspect="4/3" />}
        {!error && !loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {results.map((model) => (
              <button
                key={model.uid}
                onClick={() => importModel(model)}
                disabled={!!importing}
                className="relative rounded-lg overflow-hidden transition-all group border"
                style={{
                  borderColor: model.downloadable ? '#1E2028' : '#3a2020',
                  aspectRatio: '4/3',
                  opacity: model.downloadable ? 1 : 0.65,
                }}
              >
                <div className="absolute inset-0" style={{ background: '#1E2028' }}>
                  {model.thumbnail && (
                    <Image src={model.thumbnail} alt={model.name} fill sizes="140px"
                      className="object-cover opacity-70 group-hover:opacity-100 transition-opacity" unoptimized />
                  )}
                </div>
                {importing === model.uid ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <RefreshCw size={14} className="animate-spin text-white" />
                  </div>
                ) : model.downloadable ? (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1 rounded bg-black/60">
                      <Download size={10} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-1 right-1">
                    <div className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: 'rgba(220,38,38,0.8)', color: '#fca5a5' }}>
                      locked
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/90">
                  <span className="text-[10px] text-white font-medium truncate block">{model.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {!error && !loading && results.length === 0 && query && (
          <p className="text-[11px] text-center py-4" style={{ color: '#7A7E92' }}>No results for &quot;{query}&quot;</p>
        )}
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssetBrowser() {
  const postFX = useScene((s) => s.postFX)
  const setPostFX = useScene((s) => s.setPostFX)
  const environment = useScene((s) => s.environment)
  const setEnvironment = useScene((s) => s.setEnvironment)
  const [tab, setTab] = useState<'hdri' | 'textures' | 'models' | 'postfx' | 'env'>('hdri')

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#111318' }}>
      {/* Tabs */}
      <div className="flex shrink-0 h-9" style={{ borderBottom: '1px solid #1E2028' }}>
        {(['hdri', 'textures', 'models', 'postfx', 'env'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 text-[9px] font-medium uppercase tracking-wider transition-colors"
            style={{
              color: tab === t ? '#E8E9F0' : '#7A7E92',
              borderBottom: tab === t ? '2px solid #5B6CFF' : '2px solid transparent',
            }}
          >
            {t === 'hdri' ? 'HDRI' : t === 'textures' ? 'Tex' : t === 'models' ? 'Models' : t === 'postfx' ? 'FX' : 'Env'}
          </button>
        ))}
      </div>

      {tab === 'hdri' && <HDRITab />}
      {tab === 'textures' && <TexturesTab />}
      {tab === 'models' && <SketchfabTab />}

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
          {/* Lighting presets */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#3a3e50' }}>Presets</p>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { label: 'Studio', ambientColor: '#ffffff', ambientIntensity: 0.8, directionalColor: '#ffffff', directionalIntensity: 2.0, fogType: 'none', backgroundColor: '#111111' },
                { label: 'Day', ambientColor: '#b0d4ff', ambientIntensity: 0.5, directionalColor: '#fff8e0', directionalIntensity: 3.0, fogType: 'none', backgroundColor: '#87ceeb' },
                { label: 'Sunset', ambientColor: '#ff8040', ambientIntensity: 0.4, directionalColor: '#ff6010', directionalIntensity: 2.0, fogType: 'exponential', fogDensity: 0.005, fogColor: '#ff5020', backgroundColor: '#cc4010' },
                { label: 'Night', ambientColor: '#001030', ambientIntensity: 0.15, directionalColor: '#2040ff', directionalIntensity: 0.2, fogType: 'exponential', fogDensity: 0.015, fogColor: '#000510', backgroundColor: '#000510' },
                { label: 'Overcast', ambientColor: '#c0c8d0', ambientIntensity: 0.8, directionalColor: '#c0c8d0', directionalIntensity: 0.4, fogType: 'none', backgroundColor: '#9ea8b0' },
              ] as const).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setEnvironment(preset as Parameters<typeof setEnvironment>[0])}
                  className="px-2.5 h-6 rounded-full text-[10px] font-medium transition-all"
                  style={{ background: '#1E2028', color: '#7A7E92', border: '1px solid #2a2d3a' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#5B6CFF20'; e.currentTarget.style.color = '#8B9CFF'; e.currentTarget.style.borderColor = '#5B6CFF50' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#1E2028'; e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#2a2d3a' }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-px" style={{ background: '#1E2028' }} />
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

// ─── Shared form widgets ──────────────────────────────────────────────────────

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
