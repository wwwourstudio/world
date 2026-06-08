'use client'

import React, { useState, useCallback } from 'react'
import { Search, MapPin, X, Globe } from 'lucide-react'
import { useWorldLocation, type WorldLocation } from '@/lib/worldLocation'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
}

export function MapPanel() {
  const { location, setLocation } = useWorldLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      if (!res.ok) throw new Error('Search failed')
      const data: NominatimResult[] = await res.json()
      setResults(data)
      if (data.length === 0) setError('No locations found. Try a different search.')
    } catch {
      setError('Location search unavailable. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search()
  }

  const selectLocation = (r: NominatimResult) => {
    const loc: WorldLocation = {
      name: r.display_name.split(',').slice(0, 2).join(',').trim(),
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }
    setLocation(loc)
    setResults([])
    setQuery('')
  }

  const mapUrl = location
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.lon - 0.05},${location.lat - 0.04},${location.lon + 0.05},${location.lat + 0.04}&layer=mapnik&marker=${location.lat},${location.lon}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik`

  return (
    <div className="flex flex-col h-full" style={{ background: '#0d0f14' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid #1E2028' }}>
        <Globe size={13} color="#5B6CFF" strokeWidth={1.75} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#E8E9F0' }}>World Location</span>
        {location && (
          <button
            onClick={() => setLocation(null)}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-red-900/30 transition-colors"
            style={{ fontSize: 10, color: '#ef4444' }}
          >
            <X size={10} />
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex gap-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search city, landmark, country…"
            style={{
              flex: 1, background: '#1A1D27', border: '1px solid #2A2D3E',
              borderRadius: 6, padding: '5px 9px', fontSize: 11,
              color: '#E8E9F0', outline: 'none',
            }}
          />
          <button
            onClick={search}
            disabled={loading}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{
              width: 30, height: 30, background: '#5B6CFF',
              color: '#fff', flexShrink: 0,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Search size={13} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-1.5 rounded-md overflow-hidden" style={{ border: '1px solid #2A2D3E', background: '#111318' }}>
            {results.map((r) => (
              <button
                key={r.place_id}
                onClick={() => selectLocation(r)}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-white/5 transition-colors"
                style={{ borderBottom: '1px solid #1E2028' }}
              >
                <MapPin size={11} color="#5B6CFF" className="mt-0.5 shrink-0" strokeWidth={2} />
                <span style={{ fontSize: 10.5, color: '#C4C8D8', lineHeight: 1.4 }}>
                  {r.display_name.split(',').slice(0, 3).join(', ')}
                </span>
              </button>
            ))}
          </div>
        )}
        {error && (
          <p style={{ fontSize: 10, color: '#ef4444', marginTop: 6 }}>{error}</p>
        )}
      </div>

      {/* Current location badge */}
      {location && (
        <div className="mx-3 mb-2 px-2.5 py-2 rounded-md flex items-center gap-2" style={{ background: 'rgba(91,108,255,0.12)', border: '1px solid rgba(91,108,255,0.25)' }}>
          <MapPin size={11} color="#5B6CFF" strokeWidth={2} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#E8E9F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {location.name}
            </div>
            <div style={{ fontSize: 9.5, color: '#5A5F78', marginTop: 1 }}>
              {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
            </div>
          </div>
        </div>
      )}

      {/* Map embed */}
      <div className="flex-1 mx-3 mb-3 rounded-md overflow-hidden" style={{ border: '1px solid #1E2028', minHeight: 140 }}>
        <iframe
          key={location ? `${location.lat},${location.lon}` : 'world'}
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 'none', display: 'block', minHeight: 140 }}
          title="World map"
          loading="lazy"
        />
      </div>

      {/* Context hint */}
      <div className="px-3 pb-3">
        <p style={{ fontSize: 9.5, color: '#3A3F56', lineHeight: 1.5 }}>
          {location
            ? `Location context active — Claude will use "${location.name}" for realistic environment suggestions.`
            : 'Set a location to give Claude geographic context for building realistic environments.'}
        </p>
      </div>
    </div>
  )
}
