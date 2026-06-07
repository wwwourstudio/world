'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Save, Search, Grid3X3, List, Trash2, FolderOpen, Bookmark } from 'lucide-react'
import {
  listWorlds, saveWorld, deleteWorld, restoreWorldToStore, formatRelativeTime,
  type SavedWorld,
} from '@/lib/worlds/WorldStore'
import { useScene } from '@/lib/scene/SceneStore'

interface WorldBrowserModalProps {
  onClose: () => void
  openSaveForm?: boolean
}

export function WorldBrowserModal({ onClose, openSaveForm = false }: WorldBrowserModalProps) {
  const showNotification = useScene((s) => s.showNotification)
  const [worlds, setWorlds] = useState<SavedWorld[]>([])
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [saveOpen, setSaveOpen] = useState(openSaveForm)
  const [saveName, setSaveName] = useState('')
  const [saveDesc, setSaveDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const all = await listWorlds()
    setWorlds(all)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const filtered = query
    ? worlds.filter(w =>
        w.name.toLowerCase().includes(query.toLowerCase()) ||
        w.description.toLowerCase().includes(query.toLowerCase())
      )
    : worlds

  async function handleSave() {
    if (!saveName.trim()) return
    setSaving(true)
    try {
      const w = await saveWorld(saveName.trim(), saveDesc.trim())
      showNotification(`World "${w.name}" saved`, 'success')
      setSaveName('')
      setSaveDesc('')
      setSaveOpen(false)
      await refresh()
    } catch {
      showNotification('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleLoad(world: SavedWorld) {
    restoreWorldToStore(world.sceneData)
    showNotification(`Loaded "${world.name}"`, 'success')
    onClose()
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return }
    await deleteWorld(id)
    setDeleteConfirm(null)
    showNotification('World deleted', 'info')
    await refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{ width: 720, maxHeight: '85vh', background: '#111318', border: '1px solid #1E2028' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
          <Bookmark size={14} style={{ color: '#5B6CFF' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#E8E9F0' }}>World Browser</span>
          <div className="flex-1" />

          {/* Save button */}
          <button
            onClick={() => setSaveOpen(!saveOpen)}
            className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[11px] font-medium transition-colors"
            style={{ background: saveOpen ? '#5B6CFF' : '#1E2028', color: saveOpen ? '#fff' : '#A0A4B8' }}
          >
            <Save size={12} />
            Save Current
          </button>

          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: '#555' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="pl-6 pr-2 h-7 rounded-md text-[11px] outline-none"
              style={{ background: '#1a1d24', border: '1px solid #2a2d38', color: '#E8E9F0', width: 140 }}
            />
          </div>

          {/* View mode */}
          <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: '#1a1d24' }}>
            {(['grid', 'list'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className="w-6 h-6 flex items-center justify-center rounded"
                style={{ background: viewMode === m ? '#2a2d38' : 'transparent', color: viewMode === m ? '#E8E9F0' : '#555' }}
              >
                {m === 'grid' ? <Grid3X3 size={11} /> : <List size={11} />}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors" style={{ color: '#555' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E8E9F0' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Save form */}
        {saveOpen && (
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1E2028', background: '#0d0f14' }}>
            <div className="flex gap-2">
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="World name..."
                autoFocus
                className="flex-1 px-3 h-8 rounded-md text-[12px] outline-none"
                style={{ background: '#1E2028', border: '1px solid #2a2d38', color: '#E8E9F0' }}
              />
              <input
                value={saveDesc}
                onChange={e => setSaveDesc(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1 px-3 h-8 rounded-md text-[12px] outline-none"
                style={{ background: '#1E2028', border: '1px solid #2a2d38', color: '#E8E9F0' }}
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || saving}
                className="px-4 h-8 rounded-md text-[12px] font-semibold transition-colors"
                style={{
                  background: saveName.trim() && !saving ? '#5B6CFF' : '#1a1d24',
                  color: saveName.trim() && !saving ? '#fff' : '#444',
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2d38 transparent' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#1E2028' }}>
                <Bookmark size={22} style={{ color: '#3a3d4a' }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: '#5A5E72' }}>
                {query ? 'No worlds match your search' : 'No saved worlds yet'}
              </p>
              {!query && (
                <p className="text-[11px]" style={{ color: '#3a3d4a' }}>
                  Save your first scene to start building a library.
                </p>
              )}
              {!query && (
                <button
                  onClick={() => setSaveOpen(true)}
                  className="mt-1 px-4 h-8 rounded-md text-[12px] font-semibold"
                  style={{ background: '#5B6CFF', color: '#fff' }}
                >
                  Save Current World
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {filtered.map(world => (
                <WorldCard
                  key={world.id}
                  world={world}
                  hovered={hoveredId === world.id}
                  confirmDelete={deleteConfirm === world.id}
                  onHover={() => setHoveredId(world.id)}
                  onLeave={() => { setHoveredId(null); setDeleteConfirm(null) }}
                  onLoad={() => handleLoad(world)}
                  onDelete={() => handleDelete(world.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map(world => (
                <WorldRow
                  key={world.id}
                  world={world}
                  confirmDelete={deleteConfirm === world.id}
                  onLoad={() => handleLoad(world)}
                  onDelete={() => handleDelete(world.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 shrink-0 flex items-center" style={{ borderTop: '1px solid #1E2028' }}>
          <span className="text-[11px]" style={{ color: '#3a3d4a' }}>
            {worlds.length} world{worlds.length !== 1 ? 's' : ''} saved locally
          </span>
        </div>
      </div>
    </div>
  )
}

function WorldCard({
  world, hovered, confirmDelete, onHover, onLeave, onLoad, onDelete,
}: {
  world: SavedWorld
  hovered: boolean
  confirmDelete: boolean
  onHover: () => void
  onLeave: () => void
  onLoad: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-default group"
      style={{ border: '1px solid #1E2028', background: '#0d0f14' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ width: '100%', aspectRatio: '16/9' }}>
        {world.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={world.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg, #1a1d24 0%, #0d0f14 100%)' }}
          />
        )}

        {/* Hover overlay */}
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.65)' }}>
            <button
              onClick={onLoad}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold transition-colors"
              style={{ background: '#5B6CFF', color: '#fff' }}
            >
              <FolderOpen size={12} />
              Load
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold transition-colors"
              style={{ background: confirmDelete ? '#c0392b' : '#2a1515', color: confirmDelete ? '#fff' : '#f87171', border: '1px solid #3a1515' }}
            >
              <Trash2 size={12} />
              {confirmDelete ? 'Confirm' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="px-2.5 py-2">
        <p className="text-[12px] font-medium truncate" style={{ color: '#E8E9F0' }}>{world.name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#5A5E72' }}>{formatRelativeTime(world.updatedAt)}</p>
      </div>
    </div>
  )
}

function WorldRow({
  world, confirmDelete, onLoad, onDelete,
}: {
  world: SavedWorld
  confirmDelete: boolean
  onLoad: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
      style={{ background: '#0d0f14', border: '1px solid #1E2028' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#13161e' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#0d0f14' }}
    >
      {/* Thumbnail */}
      <div className="shrink-0 rounded overflow-hidden" style={{ width: 64, height: 36 }}>
        {world.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={world.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: '#1a1d24' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate" style={{ color: '#E8E9F0' }}>{world.name}</p>
        {world.description && (
          <p className="text-[10px] truncate" style={{ color: '#5A5E72' }}>{world.description}</p>
        )}
      </div>
      <span className="text-[10px] shrink-0" style={{ color: '#3a3d4a' }}>{formatRelativeTime(world.updatedAt)}</span>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onLoad}
          className="flex items-center gap-1 px-2.5 h-7 rounded-md text-[11px] font-medium"
          style={{ background: '#1E2028', color: '#A0A4B8' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#5B6CFF'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1E2028'; e.currentTarget.style.color = '#A0A4B8' }}
        >
          <FolderOpen size={11} />
          Load
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2.5 h-7 rounded-md text-[11px] font-medium"
          style={{
            background: confirmDelete ? '#c0392b' : '#1E2028',
            color: confirmDelete ? '#fff' : '#f87171',
          }}
        >
          <Trash2 size={11} />
          {confirmDelete ? 'Confirm' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
