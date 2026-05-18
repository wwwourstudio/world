'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useWorldBuilder } from '@/lib/store'
import { Search, Plus, Loader2 } from 'lucide-react'

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
      const res = await fetch(`/api/sketchfab/search?q=${encodeURIComponent(query)}&count=16`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResults(data.results ?? [])
      if ((data.results ?? []).length === 0) setError('No results found.')
    } catch {
      setError('Search failed. Check your Sketchfab API key.')
    } finally {
      setLoading(false)
    }
  }

  async function addModel(uid: string, name: string) {
    setAdding(uid)
    try {
      const res = await fetch(`/api/sketchfab/download/${uid}`)
      const { url, error: err } = await res.json()
      if (err) { showNotification(`Error: ${err}`); return }
      if (!url) { showNotification('No downloadable file found'); return }
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
      showNotification(`Added "${name}" to scene`)
    } catch {
      showNotification('Failed to add model')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={search} className="flex gap-2 p-3 border-b border-[#3a3a3a] shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Sketchfab for 3D models…"
          className="flex-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 placeholder:text-gray-600 min-w-0"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          Search
        </button>
      </form>

      {error && (
        <div className="text-red-400 text-xs px-3 py-2 border-b border-[#3a3a3a] bg-red-900/10">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {results.length === 0 && !loading && !error && (
          <div className="text-center text-gray-600 text-xs py-10 leading-relaxed">
            Search Sketchfab for free 3D models.
            <br />
            <span className="text-gray-700">Requires SKETCHFAB_API_KEY in .env.local</span>
          </div>
        )}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-blue-400" />
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {results.map((r) => (
            <div key={r.uid} className="group relative">
              <div className="aspect-square bg-[#333] rounded overflow-hidden relative">
                {r.thumbnail ? (
                  <Image
                    src={r.thumbnail}
                    alt={r.name}
                    fill
                    className="object-cover group-hover:opacity-80 transition-opacity"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">
                    No preview
                  </div>
                )}
                {r.downloadable && (
                  <button
                    onClick={() => addModel(r.uid, r.name)}
                    disabled={adding === r.uid}
                    title="Add to scene"
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
                  >
                    {adding === r.uid
                      ? <Loader2 size={20} className="animate-spin text-white" />
                      : <Plus size={20} className="text-white" />
                    }
                  </button>
                )}
              </div>
              <div className="mt-1 text-[10px] text-gray-500 truncate">{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
