'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useWorldBuilder } from '@/lib/store'
import { Search, Plus, Loader2, Package } from 'lucide-react'

interface SketchfabResult {
  uid: string
  name: string
  thumbnail: string | null
  downloadable: boolean
}

export function AssetsTab() {
  const addObject = useWorldBuilder((s) => s.addObject)
  const showNotification = useWorldBuilder((s) => s.showNotification)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SketchfabResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sketchfab/search?q=${encodeURIComponent(query)}&count=20`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setResults(data.results ?? [])
      if ((data.results ?? []).length === 0) setError('No results.')
    } catch {
      setError('Search failed.')
    } finally {
      setLoading(false)
    }
  }

  async function addModel(uid: string, name: string) {
    setAdding(uid)
    try {
      const res = await fetch(`/api/sketchfab/download/${uid}`)
      const { url, error: err } = await res.json()
      if (err) {
        showNotification(`Error: ${err}`)
        return
      }
      if (!url) {
        showNotification('No downloadable file')
        return
      }
      addObject({
        id: crypto.randomUUID(),
        type: 'gltf',
        name,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
        url,
      })
      showNotification(`Added "${name}"`)
    } catch {
      showNotification('Failed to add model')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={search} className="flex gap-2 p-3 border-b border-zinc-800 shrink-0">
        <div className="flex-1 relative">
          <Search size={11} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Sketchfab"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-7 pr-2 py-1.5 text-[11px] text-zinc-200 focus:outline-none focus:border-orange-500/60 placeholder:text-zinc-600 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11px] rounded-md disabled:opacity-50 flex items-center gap-1 shrink-0 transition-colors"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : 'Search'}
        </button>
      </form>

      {error && (
        <div className="text-red-400 text-[11px] px-3 py-2 border-b border-zinc-800 bg-red-950/20">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {results.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center text-center py-10 px-6">
            <Package size={28} strokeWidth={1.25} className="text-zinc-700 mb-3" />
            <div className="text-[12px] text-zinc-300 font-medium mb-1">Sketchfab models</div>
            <div className="text-[11px] text-zinc-600 leading-relaxed max-w-[220px]">
              Search free 3D models and add them to your scene. Claude can also import models automatically.
            </div>
          </div>
        )}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-orange-400" />
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {results.map((r) => (
            <div key={r.uid} className="group">
              <div className="aspect-square bg-zinc-800 rounded-md overflow-hidden relative">
                {r.thumbnail ? (
                  <Image
                    src={r.thumbnail}
                    alt={r.name}
                    fill
                    className="object-cover group-hover:opacity-70 transition-opacity"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">
                    No preview
                  </div>
                )}
                {r.downloadable && (
                  <button
                    onClick={() => addModel(r.uid, r.name)}
                    disabled={adding === r.uid}
                    title="Add to scene"
                    className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
                  >
                    {adding === r.uid ? (
                      <Loader2 size={18} className="animate-spin text-white" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                        <Plus size={14} className="text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                )}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500 truncate" title={r.name}>{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
