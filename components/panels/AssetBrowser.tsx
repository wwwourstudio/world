'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, RefreshCw, Download, Copy, Clipboard } from 'lucide-react'
import Image from 'next/image'
import { useScene, MATERIAL_PRESETS } from '@/lib/scene/SceneStore'
import type { MaterialMaps, MaterialConfig, SceneObject } from '@/lib/scene/SceneStore'

type AddFn = (config: Partial<Omit<SceneObject, 'id'>>) => string
type GroupFn = (ids: string[], name: string) => string

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

// ─── Primitive SVG Icons ──────────────────────────────────────────────────────

function PrimIcon({ type }: { type: string }) {
  const s = '#5B6CFF', f = '#5B6CFF22', w = 1.5
  switch (type) {
    case 'box': return (
      <svg viewBox="0 0 40 40" fill="none">
        <polygon points="8,30 28,30 28,12 8,12" fill={f} stroke={s} strokeWidth={w}/>
        <polygon points="28,12 36,5 36,23 28,30" fill="#5B6CFF18" stroke={s} strokeWidth={w}/>
        <polygon points="8,12 16,5 36,5 28,12" fill="#5B6CFF30" stroke={s} strokeWidth={w}/>
      </svg>
    )
    case 'sphere': return (
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="15" fill={f} stroke={s} strokeWidth={w}/>
        <ellipse cx="20" cy="20" rx="15" ry="5" stroke={s} strokeWidth="0.8" strokeDasharray="3,2" opacity="0.5"/>
        <ellipse cx="20" cy="20" rx="0.5" ry="15" stroke={s} strokeWidth="0.8" strokeDasharray="3,2" opacity="0.3"/>
      </svg>
    )
    case 'cylinder': return (
      <svg viewBox="0 0 40 40" fill="none">
        <rect x="10" y="14" width="20" height="16" fill={f}/>
        <ellipse cx="20" cy="30" rx="10" ry="3.5" fill={f} stroke={s} strokeWidth={w}/>
        <ellipse cx="20" cy="14" rx="10" ry="3.5" fill="#5B6CFF30" stroke={s} strokeWidth={w}/>
        <line x1="10" y1="14" x2="10" y2="30" stroke={s} strokeWidth={w}/>
        <line x1="30" y1="14" x2="30" y2="30" stroke={s} strokeWidth={w}/>
      </svg>
    )
    case 'cone': return (
      <svg viewBox="0 0 40 40" fill="none">
        <polygon points="20,5 33,33 7,33" fill={f} stroke={s} strokeWidth={w}/>
        <ellipse cx="20" cy="33" rx="13" ry="3" fill={f} stroke={s} strokeWidth="0.8" opacity="0.6"/>
      </svg>
    )
    case 'torus': return (
      <svg viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="20" rx="14" ry="14" stroke={s} strokeWidth="6" opacity="0.2"/>
        <ellipse cx="20" cy="20" rx="14" ry="14" fill="none" stroke={s} strokeWidth={w}/>
        <ellipse cx="20" cy="20" rx="7" ry="7" fill="none" stroke={s} strokeWidth={w} strokeDasharray="2,2" opacity="0.5"/>
      </svg>
    )
    case 'torusknot': return (
      <svg viewBox="0 0 40 40" fill="none">
        <path d="M14,10 C14,4 26,4 26,12 C26,22 12,18 12,28 C12,36 26,36 26,30" stroke={s} strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M26,10 C26,4 14,4 14,12 C14,22 28,18 28,28 C28,36 14,36 14,30" stroke={s} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      </svg>
    )
    case 'plane': return (
      <svg viewBox="0 0 40 40" fill="none">
        <polygon points="4,30 36,30 30,14 10,14" fill={f} stroke={s} strokeWidth={w}/>
        <line x1="4" y1="30" x2="36" y2="30" stroke={s} strokeWidth="0.5" opacity="0.4"/>
        <line x1="10" y1="14" x2="30" y2="14" stroke={s} strokeWidth="0.5" opacity="0.4"/>
        <line x1="20" y1="14" x2="20" y2="30" stroke={s} strokeWidth="0.5" strokeDasharray="3,2" opacity="0.4"/>
      </svg>
    )
    case 'ring': return (
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="15" stroke={s} strokeWidth="5" opacity="0.2"/>
        <circle cx="20" cy="20" r="15" fill="none" stroke={s} strokeWidth={w}/>
        <circle cx="20" cy="20" r="9" fill="none" stroke={s} strokeWidth={w}/>
      </svg>
    )
    case 'capsule': return (
      <svg viewBox="0 0 40 40" fill="none">
        <rect x="13" y="15" width="14" height="10" fill={f}/>
        <ellipse cx="20" cy="15" rx="7" ry="7" fill={f} stroke={s} strokeWidth={w}/>
        <ellipse cx="20" cy="25" rx="7" ry="7" fill={f} stroke={s} strokeWidth={w}/>
        <line x1="13" y1="15" x2="13" y2="25" stroke={s} strokeWidth={w}/>
        <line x1="27" y1="15" x2="27" y2="25" stroke={s} strokeWidth={w}/>
      </svg>
    )
    case 'icosahedron': return (
      <svg viewBox="0 0 40 40" fill="none">
        <polygon points="20,4 36,14 36,26 20,36 4,26 4,14" fill={f} stroke={s} strokeWidth={w}/>
        <line x1="20" y1="4" x2="20" y2="20" stroke={s} strokeWidth="0.7" opacity="0.5"/>
        <line x1="4" y1="14" x2="36" y2="14" stroke={s} strokeWidth="0.7" opacity="0.5"/>
        <line x1="4" y1="26" x2="36" y2="26" stroke={s} strokeWidth="0.7" opacity="0.5"/>
        <line x1="20" y1="20" x2="36" y2="14" stroke={s} strokeWidth="0.7" opacity="0.4"/>
        <line x1="20" y1="20" x2="4" y2="14" stroke={s} strokeWidth="0.7" opacity="0.4"/>
        <line x1="20" y1="20" x2="20" y2="36" stroke={s} strokeWidth="0.7" opacity="0.4"/>
      </svg>
    )
    default: return (
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="15" fill={f} stroke={s} strokeWidth={w}/>
      </svg>
    )
  }
}

// ─── Primitives Tab ───────────────────────────────────────────────────────────

const PRIMITIVES = [
  { type: 'box',         label: 'Box',         name: 'Box',
    geo: { type: 'box' as const, width: 1, height: 1, depth: 1 },
    pos: [0, 0.5, 0] as [number, number, number] },
  { type: 'sphere',      label: 'Sphere',       name: 'Sphere',
    geo: { type: 'sphere' as const, radius: 0.5, segments: 32 },
    pos: [0, 0.5, 0] as [number, number, number] },
  { type: 'cylinder',    label: 'Cylinder',     name: 'Cylinder',
    geo: { type: 'cylinder' as const, radiusTop: 0.5, radiusBottom: 0.5, height: 1, segments: 16 },
    pos: [0, 0.5, 0] as [number, number, number] },
  { type: 'cone',        label: 'Cone',         name: 'Cone',
    geo: { type: 'cone' as const, radius: 0.5, height: 1, segments: 12 },
    pos: [0, 0.5, 0] as [number, number, number] },
  { type: 'torus',       label: 'Torus',        name: 'Torus',
    geo: { type: 'torus' as const, radius: 0.5, tube: 0.2, segments: 32 },
    pos: [0, 0.5, 0] as [number, number, number] },
  { type: 'torusknot',   label: 'Knot',         name: 'Torus Knot',
    geo: { type: 'torusknot' as const, radius: 0.4, tube: 0.15, segments: 100 },
    pos: [0, 0.6, 0] as [number, number, number] },
  { type: 'plane',       label: 'Plane',        name: 'Plane',
    geo: { type: 'plane' as const, width: 2, height: 2 },
    pos: [0, 0, 0] as [number, number, number] },
  { type: 'ring',        label: 'Ring',         name: 'Ring',
    geo: { type: 'ring' as const, radius: 0.5 },
    pos: [0, 0.5, 0] as [number, number, number] },
  { type: 'capsule',     label: 'Capsule',      name: 'Capsule',
    geo: { type: 'capsule' as const, radius: 0.3, height: 1 },
    pos: [0, 0.8, 0] as [number, number, number] },
  { type: 'icosahedron', label: 'Icosa',        name: 'Icosahedron',
    geo: { type: 'icosahedron' as const, radius: 0.5, segments: 0 },
    pos: [0, 0.5, 0] as [number, number, number] },
]

function PrimitivesTab() {
  const addObject = useScene((s) => s.addObject)
  const showNotification = useScene((s) => s.showNotification)

  function place(prim: typeof PRIMITIVES[number]) {
    addObject({ name: prim.name, type: 'mesh', geometry: prim.geo, transform: { position: prim.pos, rotation: [0, 0, 0], scale: [1, 1, 1] } })
    showNotification(`Added ${prim.name}`)
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
      <p className="text-[9px] uppercase tracking-widest font-semibold mb-2.5" style={{ color: '#3a3e50' }}>
        Click to add to scene
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PRIMITIVES.map((p) => (
          <button
            key={p.type}
            onClick={() => place(p)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all group"
            style={{ background: '#0B0C0F', borderColor: '#1E2028' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF55'; e.currentTarget.style.background = '#0d0f18' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.background = '#0B0C0F' }}
          >
            <div className="w-full" style={{ aspectRatio: '1/1', maxWidth: 52 }}>
              <PrimIcon type={p.type} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: '#7A7E92' }}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Models Tab ───────────────────────────────────────────────────────────────

const PROCEDURAL_MODELS = [
  {
    id: 'tree', label: 'Tree', emoji: '🌲', desc: 'Trunk + layered foliage',
    build: (add: AddFn, group: GroupFn) => {
      const trunk = add({ name: 'trunk', type: 'mesh', geometry: { type: 'cylinder', radiusTop: 0.12, radiusBottom: 0.18, height: 2, segments: 8 }, material: { type: 'standard', color: '#5C3317', roughness: 0.9, metalness: 0, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' }, transform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      const foliage1 = add({ name: 'foliage', type: 'mesh', geometry: { type: 'cone', radius: 0.85, height: 1.6, segments: 8 }, material: { type: 'standard', color: '#2D6A2D', roughness: 0.9, metalness: 0, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' }, transform: { position: [0, 2.3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      const foliage2 = add({ name: 'foliage2', type: 'mesh', geometry: { type: 'cone', radius: 0.65, height: 1.4, segments: 8 }, material: { type: 'standard', color: '#357A35', roughness: 0.9, metalness: 0, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' }, transform: { position: [0, 3.3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      group([trunk, foliage1, foliage2], 'Tree')
    },
  },
  {
    id: 'rock', label: 'Rock', emoji: '🪨', desc: 'Faceted stone cluster',
    build: (add: AddFn, group: GroupFn) => {
      const r1 = add({ name: 'rock', type: 'mesh', geometry: { type: 'icosahedron', radius: 0.7, segments: 1 }, material: { type: 'standard', color: '#6e6e6e', roughness: 0.95, metalness: 0.05, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: true, side: 'front' }, transform: { position: [0, 0.5, 0], rotation: [0.3, 0.5, 0.2], scale: [1, 0.7, 0.9] } })
      const r2 = add({ name: 'rock2', type: 'mesh', geometry: { type: 'icosahedron', radius: 0.45, segments: 1 }, material: { type: 'standard', color: '#5a5a5a', roughness: 0.95, metalness: 0.05, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: true, side: 'front' }, transform: { position: [0.7, 0.25, 0.3], rotation: [0.8, 0, 0.4], scale: [1, 0.6, 0.8] } })
      group([r1, r2], 'Rock')
    },
  },
  {
    id: 'building', label: 'Building', emoji: '🏢', desc: 'Multi-floor structure',
    build: (add: AddFn, group: GroupFn) => {
      const body = add({ name: 'body', type: 'mesh', geometry: { type: 'box', width: 4, height: 6, depth: 4 }, material: { type: 'standard', color: '#c8bca8', roughness: 0.8, metalness: 0.05, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' }, transform: { position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      const roof = add({ name: 'roof', type: 'mesh', geometry: { type: 'box', width: 4.4, height: 0.3, depth: 4.4 }, material: { type: 'standard', color: '#4a4040', roughness: 0.7, metalness: 0.1, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' }, transform: { position: [0, 6.15, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      group([body, roof], 'Building')
    },
  },
  {
    id: 'fence', label: 'Fence', emoji: '🪵', desc: 'Post + rails',
    build: (add: AddFn, group: GroupFn) => {
      const baseMat = { type: 'standard' as const, color: '#8B5E3C', roughness: 0.85, metalness: 0, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' as const }
      const p1 = add({ name: 'post1', type: 'mesh', geometry: { type: 'box', width: 0.12, height: 1.4, depth: 0.12 }, material: baseMat, transform: { position: [-1, 0.7, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      const p2 = add({ name: 'post2', type: 'mesh', geometry: { type: 'box', width: 0.12, height: 1.4, depth: 0.12 }, material: baseMat, transform: { position: [1, 0.7, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      const r1 = add({ name: 'rail1', type: 'mesh', geometry: { type: 'box', width: 2.2, height: 0.1, depth: 0.06 }, material: baseMat, transform: { position: [0, 1.0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      const r2 = add({ name: 'rail2', type: 'mesh', geometry: { type: 'box', width: 2.2, height: 0.1, depth: 0.06 }, material: baseMat, transform: { position: [0, 0.4, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      group([p1, p2, r1, r2], 'Fence')
    },
  },
]

interface SketchfabModel {
  uid: string
  name: string
  thumbnail: string | null
  downloadable: boolean
  viewerUrl: string
}

function ModelsTab() {
  const addObject = useScene((s) => s.addObject)
  const groupObjects = useScene((s) => s.groupObjects)
  const showNotification = useScene((s) => s.showNotification)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SketchfabModel[]>([])
  const [loading, setLoading] = useState(false)
  const [sfError, setSfError] = useState<string | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  function buildModel(id: string) {
    const model = PROCEDURAL_MODELS.find((m) => m.id === id)
    if (!model) return
    model.build(addObject, groupObjects)
    showNotification(`Added ${model.label}`)
  }

  async function search(q: string, off: number, append = false) {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    setSfError(null)
    try {
      const res = await fetch(`/api/sketchfab/search?q=${encodeURIComponent(q)}&count=20&sort_by=relevance&offset=${off}`)
      const data = await res.json()
      if (data.error) { setSfError(data.error); setResults([]) }
      else {
        if (append) setResults((prev) => [...prev, ...data.results])
        else setResults(data.results ?? [])
        setHasMore(!!data.next)
      }
    } catch { setSfError('Search failed') }
    finally { setLoading(false) }
  }

  function handleSearch(val: string) {
    setQuery(val)
    setOffset(0)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => search(val, 0), 600)
  }

  async function importModel(model: SketchfabModel) {
    if (!model.downloadable) { showNotification('Model not downloadable (license restricted)', 'error'); return }
    setImporting(model.uid)
    showNotification(`Fetching ${model.name}…`)
    try {
      const res = await fetch(`/api/sketchfab/download/${model.uid}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (!data.url) throw new Error('No download URL — model may require Sketchfab Pro')
      addObject({ name: model.name, type: 'mesh', geometry: { type: 'gltf', url: data.url }, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
      showNotification(`Imported: ${model.name}`)
    } catch (e) {
      showNotification(`Import failed: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally { setImporting(null) }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Procedural models */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#3a3e50' }}>Procedural</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PROCEDURAL_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => buildModel(m.id)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all"
              style={{ background: '#0B0C0F', borderColor: '#1E2028' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF55'; e.currentTarget.style.background = '#0d0f18' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.background = '#0B0C0F' }}
            >
              <span className="text-lg leading-none">{m.emoji}</span>
              <div>
                <p className="text-[11px] font-medium" style={{ color: '#E8E9F0' }}>{m.label}</p>
                <p className="text-[9px]" style={{ color: '#7A7E92' }}>{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sketchfab search */}
      <div className="px-3 pt-2 pb-1.5 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#3a3e50' }}>Sketchfab</p>
        <SearchBar value={query} onChange={handleSearch} placeholder="Search 3D models…" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {sfError && <p className="text-[11px] text-center py-4" style={{ color: '#f87171' }}>{sfError}</p>}
        {!sfError && loading && <LoadingGrid aspect="4/3" />}
        {!sfError && !loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {results.map((model) => (
              <button key={model.uid} onClick={() => importModel(model)} disabled={!!importing}
                className="relative rounded-lg overflow-hidden border transition-all group"
                style={{ borderColor: model.downloadable ? '#1E2028' : '#3a2020', aspectRatio: '4/3', opacity: model.downloadable ? 1 : 0.65 }}>
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
                    <div className="p-1 rounded bg-black/60"><Download size={10} className="text-white" /></div>
                  </div>
                ) : (
                  <div className="absolute top-1 right-1">
                    <div className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: 'rgba(220,38,38,0.8)', color: '#fca5a5' }}>locked</div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/90">
                  <span className="text-[10px] text-white font-medium truncate block">{model.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {hasMore && !loading && (
          <button onClick={() => { const next = offset + 20; setOffset(next); search(query, next, true) }}
            className="w-full mt-2 py-2 rounded-lg text-[11px] font-medium" style={{ background: '#1E2028', color: '#7A7E92', border: '1px solid #2a2d3a' }}>
            Load more
          </button>
        )}
        {!sfError && !loading && results.length === 0 && query && (
          <p className="text-[11px] text-center py-4" style={{ color: '#7A7E92' }}>No results for &quot;{query}&quot;</p>
        )}
        {!sfError && !loading && results.length === 0 && !query && (
          <p className="text-[10px] text-center py-4" style={{ color: '#3a3e50' }}>Requires SKETCHFAB_API_KEY env var</p>
        )}
      </div>
    </div>
  )
}

// ─── Materials Tab ────────────────────────────────────────────────────────────

const PRESET_META: Record<string, { label: string; preview: string }> = {
  gold:     { label: 'Gold',     preview: '#d4a017' },
  chrome:   { label: 'Chrome',   preview: '#c8c8c8' },
  rubber:   { label: 'Rubber',   preview: '#1a1a1a' },
  wood:     { label: 'Wood',     preview: '#8B4513' },
  concrete: { label: 'Concrete', preview: '#6b6b6b' },
  glass:    { label: 'Glass',    preview: '#ccddff' },
  neon:     { label: 'Neon',     preview: '#00ffff' },
  hologram: { label: 'Hologram', preview: '#00aaff' },
  ceramic:  { label: 'Ceramic',  preview: '#f5f5dc' },
  skin:     { label: 'Skin',     preview: '#e8b89a' },
  lava:     { label: 'Lava',     preview: '#ff4400' },
  ice:      { label: 'Ice',      preview: '#c8e8ff' },
}

function MaterialsTab() {
  const selectedIds = useScene((s) => s.selectedIds)
  const objects = useScene((s) => s.objects)
  const updateObject = useScene((s) => s.updateObject)
  const showNotification = useScene((s) => s.showNotification)
  const [clipboard, setClipboard] = useState<Partial<MaterialConfig> | null>(null)

  const selectedObj = selectedIds.length === 1 ? objects[selectedIds[0]] : null

  function applyPreset(key: string) {
    if (selectedIds.length === 0) { showNotification('Select an object first', 'info'); return }
    const preset = MATERIAL_PRESETS[key]
    for (const id of selectedIds) {
      updateObject(id, { material: preset })
    }
    showNotification(`Applied ${PRESET_META[key]?.label ?? key} material`)
  }

  function copyMaterial() {
    if (!selectedObj) { showNotification('Select an object first', 'info'); return }
    setClipboard({ ...selectedObj.material })
    showNotification('Material copied')
  }

  function pasteMaterial() {
    if (!clipboard) { showNotification('No material copied', 'info'); return }
    if (selectedIds.length === 0) { showNotification('Select an object first', 'info'); return }
    for (const id of selectedIds) {
      updateObject(id, { material: clipboard })
    }
    showNotification('Material pasted')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {/* Copy/Paste */}
        <div className="flex gap-1.5 mb-3">
          <button
            onClick={copyMaterial}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all"
            style={{ background: '#0B0C0F', borderColor: '#1E2028', color: '#7A7E92' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.borderColor = '#5B6CFF55' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#1E2028' }}
          >
            <Copy size={11} /> Copy
          </button>
          <button
            onClick={pasteMaterial}
            disabled={!clipboard}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all"
            style={{
              background: clipboard ? '#5B6CFF20' : '#0B0C0F',
              borderColor: clipboard ? '#5B6CFF55' : '#1E2028',
              color: clipboard ? '#8B9CF4' : '#3a3e50',
            }}
            onMouseEnter={(e) => { if (clipboard) { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.borderColor = '#5B6CFF' } }}
            onMouseLeave={(e) => { if (clipboard) { e.currentTarget.style.color = '#8B9CF4'; e.currentTarget.style.borderColor = '#5B6CFF55' } }}
          >
            <Clipboard size={11} /> Paste
          </button>
        </div>

        {selectedIds.length === 0 && (
          <p className="text-[10px] text-center mb-3" style={{ color: '#3a3e50' }}>Select an object to apply a preset</p>
        )}

        <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#3a3e50' }}>PBR Presets</p>

        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(PRESET_META).map(([key, meta]) => {
            const isGlass = key === 'glass' || key === 'hologram' || key === 'ice'
            const isNeon = key === 'neon' || key === 'lava' || key === 'hologram'
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all"
                style={{ background: '#0B0C0F', borderColor: '#1E2028' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF55'; e.currentTarget.style.background = '#0d0f18' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.background = '#0B0C0F' }}
              >
                {/* Material sphere preview */}
                <div className="w-10 h-10 rounded-full relative overflow-hidden flex-shrink-0"
                  style={{
                    background: isGlass
                      ? `radial-gradient(circle at 35% 35%, #ffffff88, ${meta.preview}55, transparent)`
                      : `radial-gradient(circle at 35% 35%, ${meta.preview}ff, ${meta.preview}88, ${meta.preview}44)`,
                    boxShadow: isNeon
                      ? `0 0 8px ${meta.preview}80, inset 0 0 4px ${meta.preview}40`
                      : 'inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <span className="text-[9px] font-medium text-center" style={{ color: '#7A7E92' }}>{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
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
  const texUploadRef = useRef<HTMLInputElement>(null)
  const [uploadSlot, setUploadSlot] = useState<'map' | 'roughnessMap' | 'normalMap'>('map')

  useEffect(() => { setRecentIds(recent.get()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = getCategories(assets).slice(0, 10)
  const filtered = filterAssets(assets, category, search)

  async function applyTexture(id: string, name: string) {
    if (selectedIds.length === 0) { showNotification('Select an object first'); return }
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
        <div className="flex items-center gap-2 mt-2">
          <input ref={texUploadRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (selectedIds.length === 0) { showNotification('Select an object first'); return }
              const url = URL.createObjectURL(file)
              for (const objId of selectedIds) {
                updateObject(objId, { material: { maps: { [uploadSlot]: url } } })
              }
              showNotification(`Uploaded ${uploadSlot === 'map' ? 'color' : uploadSlot === 'roughnessMap' ? 'roughness' : 'normal'} map`)
            }}
          />
          <select value={uploadSlot} onChange={(e) => setUploadSlot(e.target.value as typeof uploadSlot)}
            className="h-6 px-1 rounded text-[10px] outline-none border"
            style={{ background: '#0B0C0F', color: '#E8E9F0', borderColor: '#1E2028', width: '90px' }}>
            <option value="map">Color</option>
            <option value="roughnessMap">Roughness</option>
            <option value="normalMap">Normal</option>
          </select>
          <button onClick={() => texUploadRef.current?.click()}
            className="flex-1 h-6 rounded text-[10px] font-medium transition-colors border"
            style={{ background: '#1E2028', color: '#7A7E92', borderColor: '#2a2d3a' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92' }}
          >
            ↑ Upload image
          </button>
        </div>
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
              <button key={id} onClick={() => applyTexture(id, asset.name)}
                className="relative rounded-lg overflow-hidden transition-all group border"
                style={{ borderColor: '#1E2028', aspectRatio: '1/1' }}>
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

// ─── FX Tab ───────────────────────────────────────────────────────────────────

const FX_PRESETS = [
  {
    id: 'fire', label: 'Fire', emoji: '🔥', desc: 'Rising flame',
    mat: { color: '#ff6600', emissive: '#ff2200', emissiveIntensity: 2.5, roughness: 1, metalness: 0, opacity: 1, transparent: false },
    particle: { count: 280, spread: [2, 4, 2] as [number, number, number], instanceGeometry: 'cone' as const, instanceScale: 0.07, randomScale: 0.6, preset: 'fire' as const },
  },
  {
    id: 'smoke', label: 'Smoke', emoji: '💨', desc: 'Billowing cloud',
    mat: { color: '#aaaaaa', emissive: '#000000', emissiveIntensity: 0, roughness: 1, metalness: 0, opacity: 0.35, transparent: true },
    particle: { count: 120, spread: [3, 6, 3] as [number, number, number], instanceGeometry: 'sphere' as const, instanceScale: 0.22, randomScale: 0.7, preset: 'smoke' as const },
  },
  {
    id: 'sparks', label: 'Sparks', emoji: '✨', desc: 'Falling sparks',
    mat: { color: '#ffdd00', emissive: '#ff8800', emissiveIntensity: 4, roughness: 1, metalness: 0, opacity: 1, transparent: false },
    particle: { count: 80, spread: [4, 4, 4] as [number, number, number], instanceGeometry: 'sphere' as const, instanceScale: 0.04, randomScale: 0.5, preset: 'sparks' as const },
  },
  {
    id: 'rain', label: 'Rain', emoji: '🌧️', desc: 'Falling droplets',
    mat: { color: '#aaddff', emissive: '#000000', emissiveIntensity: 0, roughness: 0.1, metalness: 0, opacity: 0.55, transparent: true },
    particle: { count: 500, spread: [8, 8, 8] as [number, number, number], instanceGeometry: 'box' as const, instanceScale: 0.025, randomScale: 0.3, preset: 'rain' as const },
  },
  {
    id: 'snow', label: 'Snow', emoji: '❄️', desc: 'Drifting flakes',
    mat: { color: '#ffffff', emissive: '#000000', emissiveIntensity: 0, roughness: 1, metalness: 0, opacity: 1, transparent: false },
    particle: { count: 280, spread: [8, 7, 8] as [number, number, number], instanceGeometry: 'sphere' as const, instanceScale: 0.06, randomScale: 0.5, preset: 'snow' as const },
  },
  {
    id: 'magic', label: 'Magic', emoji: '🪄', desc: 'Orbiting motes',
    mat: { color: '#cc44ff', emissive: '#8822ff', emissiveIntensity: 4, roughness: 1, metalness: 0, opacity: 1, transparent: false },
    particle: { count: 180, spread: [4, 4, 4] as [number, number, number], instanceGeometry: 'sphere' as const, instanceScale: 0.06, randomScale: 0.5, preset: 'magic' as const },
  },
]

function FXTab() {
  const addObject = useScene((s) => s.addObject)
  const showNotification = useScene((s) => s.showNotification)
  const postFX = useScene((s) => s.postFX)
  const setPostFX = useScene((s) => s.setPostFX)

  function addFX(fx: typeof FX_PRESETS[number]) {
    addObject({
      name: fx.label,
      type: 'particle',
      geometry: { type: 'sphere' },
      material: {
        type: 'standard',
        color: fx.mat.color,
        roughness: fx.mat.roughness,
        metalness: fx.mat.metalness,
        emissive: fx.mat.emissive,
        emissiveIntensity: fx.mat.emissiveIntensity,
        opacity: fx.mat.opacity,
        transparent: fx.mat.transparent,
        wireframe: false,
        envMapIntensity: 0,
        transmission: 0,
        ior: 1.5,
        thickness: 0.5,
        flatShading: false,
        side: 'front',
      },
      particle: fx.particle,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    })
    showNotification(`Added ${fx.label} FX`)
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
      {/* Particle FX */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#3a3e50' }}>Particle Systems</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FX_PRESETS.map((fx) => (
            <button
              key={fx.id}
              onClick={() => addFX(fx)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all text-left"
              style={{ background: '#0B0C0F', borderColor: '#1E2028' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B6CFF55'; e.currentTarget.style.background = '#0d0f18' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1E2028'; e.currentTarget.style.background = '#0B0C0F' }}
            >
              <span className="text-xl leading-none">{fx.emoji}</span>
              <div>
                <p className="text-[11px] font-medium" style={{ color: '#E8E9F0' }}>{fx.label}</p>
                <p className="text-[9px]" style={{ color: '#7A7E92' }}>{fx.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Post Processing */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#3a3e50' }}>Post Processing</p>
        <div className="flex flex-col gap-3">
          <FXToggleRow label="Bloom" active={postFX.bloom} onChange={(v) => setPostFX({ bloom: v })} />
          {postFX.bloom && (
            <>
              <SliderRow label="Intensity" value={postFX.bloomIntensity} min={0} max={3} step={0.05} onChange={(v) => setPostFX({ bloomIntensity: v })} />
              <SliderRow label="Threshold" value={postFX.bloomThreshold} min={0} max={1} step={0.01} onChange={(v) => setPostFX({ bloomThreshold: v })} />
            </>
          )}
          <FXToggleRow label="Vignette" active={postFX.vignette} onChange={(v) => setPostFX({ vignette: v })} />
          {postFX.vignette && (
            <>
              <SliderRow label="Offset" value={postFX.vignetteOffset} min={0} max={1} step={0.01} onChange={(v) => setPostFX({ vignetteOffset: v })} />
              <SliderRow label="Darkness" value={postFX.vignetteDarkness} min={0} max={1} step={0.01} onChange={(v) => setPostFX({ vignetteDarkness: v })} />
            </>
          )}
          <FXToggleRow label="Film Grain" active={postFX.noise} onChange={(v) => setPostFX({ noise: v })} />
          {postFX.noise && (
            <SliderRow label="Opacity" value={postFX.noiseOpacity} min={0} max={0.2} step={0.005} onChange={(v) => setPostFX({ noiseOpacity: v })} />
          )}
          <FXToggleRow label="Chromatic Aberr." active={postFX.chromaticAberration} onChange={(v) => setPostFX({ chromaticAberration: v })} />
          {postFX.chromaticAberration && (
            <SliderRow label="Offset" value={postFX.chromaticOffset} min={0} max={0.01} step={0.0005} onChange={(v) => setPostFX({ chromaticOffset: v })} />
          )}
          <SliderRow label="Exposure" value={postFX.toneMappingExposure} min={0.1} max={3} step={0.05} onChange={(v) => setPostFX({ toneMappingExposure: v })} />
        </div>
      </div>
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
  const hdriUploadRef = useRef<HTMLInputElement>(null)

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
        <div className="flex items-center gap-2">
          <input ref={hdriUploadRef} type="file" accept=".hdr,.exr" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const url = URL.createObjectURL(file)
              setEnvironment({ hdriUrl: url, hdriName: file.name })
              showNotification(`Custom HDRI: ${file.name}`)
            }}
          />
          <button onClick={() => hdriUploadRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[10px] font-medium transition-colors border"
            style={{ background: '#1E2028', color: '#7A7E92', borderColor: '#2a2d3a' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.borderColor = '#5B6CFF50' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#2a2d3a' }}
          >
            ↑ Upload .hdr / .exr
          </button>
        </div>
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
              <button key={id} onClick={() => applyHDRI(id, asset.name)}
                className="relative rounded-lg overflow-hidden transition-all group border"
                style={{ borderColor: activeId === id ? '#5B6CFF' : '#1E2028', aspectRatio: '16/9' }}>
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

// ─── Main component ───────────────────────────────────────────────────────────

type AssetTab = 'prims' | 'models' | 'tex' | 'fx' | 'hdri'

const TABS: { id: AssetTab; label: string }[] = [
  { id: 'prims',  label: 'Prims'  },
  { id: 'models', label: 'Models' },
  { id: 'tex',    label: 'Tex'    },
  { id: 'fx',     label: 'FX'     },
  { id: 'hdri',   label: 'HDRI'   },
]

export function AssetBrowser() {
  const [tab, setTab] = useState<AssetTab>('prims')

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#111318' }}>
      {/* Tab bar */}
      <div className="flex shrink-0 h-10 items-center px-1.5 gap-0.5 overflow-x-auto" style={{ borderBottom: '1px solid #1E2028', scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center justify-center shrink-0 flex-1 min-w-0 h-7 rounded-md text-[10px] font-medium tracking-wide transition-all"
            style={{
              color: tab === t.id ? '#E8E9F0' : '#5A5F78',
              background: tab === t.id ? 'rgba(91,108,255,0.15)' : 'transparent',
              boxShadow: tab === t.id ? 'inset 0 0 0 1px rgba(91,108,255,0.3)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'prims'  && <PrimitivesTab />}
      {tab === 'models' && <ModelsTab />}
      {tab === 'tex'    && <TexturesTab />}
      {tab === 'fx'     && <FXTab />}
      {tab === 'hdri'   && <HDRITab />}
    </div>
  )
}
