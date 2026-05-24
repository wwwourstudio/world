'use client'

import { useState, useEffect, useRef } from 'react'
import { useScene } from '@/lib/scene/SceneStore'
import type { GallerySpec } from '@/lib/ai/CommandParser'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

// HDRI options from Poly Haven
const HDRI_ASSETS = [
  { id: 'golden_bay', label: 'Golden Bay', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/golden_bay.png?width=200' },
  { id: 'forest_slope', label: 'Forest Slope', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/forest_slope.png?width=200' },
  { id: 'satara_night', label: 'Satara Night', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/satara_night.png?width=200' },
  { id: 'kiara_interior', label: 'Kiara Interior', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/kiara_interior_1.png?width=200' },
  { id: 'starlit_golf', label: 'Starlit Golf', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/starlit_golf_course.png?width=200' },
  { id: 'studio_small', label: 'Studio', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/studio_small_08.png?width=200' },
  { id: 'sunflowers', label: 'Sunflowers', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/sunflowers.png?width=200' },
  { id: 'kloppenheim', label: 'Kloppenheim', thumb: 'https://cdn.polyhaven.com/asset_img/thumbs/kloppenheim_06.png?width=200' },
]

// Material preset swatches (color + label)
const MATERIAL_SWATCHES: Array<{ id: string; label: string; color: string; roughness: number; metalness: number }> = [
  { id: 'gold',     label: 'Gold',     color: '#c5832c', roughness: 0.2, metalness: 0.9 },
  { id: 'chrome',   label: 'Chrome',   color: '#aaaaaa', roughness: 0.05, metalness: 1.0 },
  { id: 'rubber',   label: 'Rubber',   color: '#222222', roughness: 0.9, metalness: 0.0 },
  { id: 'wood',     label: 'Wood',     color: '#8B5E3C', roughness: 0.8, metalness: 0.0 },
  { id: 'concrete', label: 'Concrete', color: '#808080', roughness: 0.95, metalness: 0.0 },
  { id: 'glass',    label: 'Glass',    color: '#aaddff', roughness: 0.05, metalness: 0.0 },
  { id: 'neon',     label: 'Neon',     color: '#00ffff', roughness: 0.3, metalness: 0.0 },
  { id: 'lava',     label: 'Lava',     color: '#ff4400', roughness: 0.85, metalness: 0.0 },
  { id: 'ice',      label: 'Ice',      color: '#cceeff', roughness: 0.1, metalness: 0.1 },
  { id: 'ceramic',  label: 'Ceramic',  color: '#f5f0e8', roughness: 0.3, metalness: 0.0 },
]

const HDRI_URLS: Record<string, string> = {
  golden_bay: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/golden_bay_1k.hdr',
  forest_slope: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/forest_slope_1k.hdr',
  satara_night: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/satara_night_1k.hdr',
  kiara_interior: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_interior_1_1k.hdr',
  starlit_golf: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/starlit_golf_course_1_1k.hdr',
  studio_small: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
  sunflowers: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/sunflowers_puresky_1k.hdr',
  kloppenheim: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_1k.hdr',
}

interface SketchfabModel {
  uid: string
  name: string
  thumbnailUrl: string
}

interface CarouselItem {
  id: string
  label: string
  thumb?: string
  color?: string
  roughness?: number
  metalness?: number
}

export function ChatAssetCarousel({ spec }: { spec: GallerySpec }) {
  const [items, setItems] = useState<CarouselItem[]>([])
  const [active, setActive] = useState<string | null>(spec.current ?? null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const setEnvironment = useScene((s) => s.setEnvironment)
  const updateObject = useScene((s) => s.updateObject)
  const selectedIds = useScene((s) => s.selectedIds)

  useEffect(() => {
    if (spec.type === 'hdri') {
      const query = spec.query.toLowerCase()
      // Filter HDRIs by query, or show all
      const filtered = HDRI_ASSETS.filter((h) =>
        !query || query === 'all' || h.label.toLowerCase().includes(query) || h.id.toLowerCase().includes(query)
      )
      setItems(filtered.length > 0 ? filtered : HDRI_ASSETS)
      setActive(spec.current ?? null)
    } else if (spec.type === 'material') {
      setItems(MATERIAL_SWATCHES.map((s) => ({ id: s.id, label: s.label, color: s.color, roughness: s.roughness, metalness: s.metalness })))
      setActive(spec.current ?? null)
    } else if (spec.type === 'sketchfab') {
      setLoading(true)
      fetch(`/api/sketchfab/search?q=${encodeURIComponent(spec.query)}&count=8`)
        .then((r) => r.json())
        .then((data: { results?: SketchfabModel[] }) => {
          if (data.results) {
            setItems(data.results.map((m) => ({ id: m.uid, label: m.name, thumb: m.thumbnailUrl })))
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [spec])

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
  }

  const applyHdri = (item: CarouselItem) => {
    const url = HDRI_URLS[item.id]
    if (!url) return
    setEnvironment({ hdriUrl: url, hdriName: item.id, showBackground: true })
    setActive(item.id)
  }

  const applyMaterial = (item: CarouselItem) => {
    const target = selectedIds[0]
    if (!target) return
    updateObject(target, {
      material: { color: item.color ?? '#888888', roughness: item.roughness ?? 0.5, metalness: item.metalness ?? 0 },
    })
    setActive(item.id)
  }

  const handleClick = (item: CarouselItem) => {
    if (spec.type === 'hdri') applyHdri(item)
    else if (spec.type === 'material') applyMaterial(item)
  }

  const label = spec.type === 'hdri' ? 'Environments' : spec.type === 'material' ? 'Materials' : spec.type === 'sketchfab' ? 'Models' : 'Textures'

  return (
    <div className="mt-2 rounded-xl overflow-hidden border" style={{ borderColor: '#1E2028', background: '#0b0c11' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: '#1E2028' }}>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#5B6CFF' }}>{label}</span>
        {spec.query && spec.query !== 'all' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: '#1a1f3a', color: '#7A7E92' }}>
            "{spec.query}"
          </span>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center rounded-r-md"
          style={{ background: 'rgba(11,12,15,0.9)', color: '#7A7E92' }}
        >
          <ChevronLeft size={12} />
        </button>
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto px-7 py-2 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {loading && (
            <div className="flex items-center justify-center w-full py-4 text-[11px]" style={{ color: '#7A7E92' }}>
              Loading…
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className="flex-shrink-0 flex flex-col items-center gap-1 rounded-lg overflow-hidden transition-all"
              style={{
                border: `2px solid ${active === item.id ? '#5B6CFF' : 'transparent'}`,
                outline: active === item.id ? '1px solid #5B6CFF40' : 'none',
              }}
            >
              {item.thumb ? (
                <div className="w-16 h-12 overflow-hidden" style={{ borderRadius: '6px 6px 0 0' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumb}
                    alt={item.label}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ) : item.color ? (
                <div className="w-16 h-12 rounded-t-md" style={{
                  background: item.color,
                  boxShadow: item.metalness && item.metalness > 0.5 ? 'inset 0 2px 8px rgba(255,255,255,0.3)' : 'none',
                }} />
              ) : null}
              <span className="text-[9px] px-1 pb-1 truncate max-w-[64px]" style={{ color: active === item.id ? '#a5b4fc' : '#7A7E92' }}>
                {item.label}
              </span>
            </button>
          ))}
          {spec.type === 'sketchfab' && items.length > 0 && (
            <a
              href={`https://sketchfab.com/search?q=${encodeURIComponent(spec.query)}&type=models`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-16 h-[84px] rounded-lg border transition-colors"
              style={{ borderColor: '#1E2028', color: '#7A7E92' }}
            >
              <ExternalLink size={14} />
              <span className="text-[9px]">More</span>
            </a>
          )}
        </div>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center rounded-l-md"
          style={{ background: 'rgba(11,12,15,0.9)', color: '#7A7E92' }}
        >
          <ChevronRight size={12} />
        </button>
      </div>
      {spec.type === 'material' && selectedIds.length === 0 && (
        <p className="px-3 pb-2 text-[9px]" style={{ color: '#7A7E92' }}>Select an object to apply material</p>
      )}
    </div>
  )
}
