'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'

type TabInfo = { id: string; name: string }

export function SceneSwitcher() {
  const scenes = useScene((s) => s.scenes)
  const activeSceneId = useScene((s) => s.activeSceneId)
  const addScene = useScene((s) => s.addScene)
  const switchScene = useScene((s) => s.switchScene)
  const renameScene = useScene((s) => s.renameScene)
  const duplicateScene = useScene((s) => s.duplicateScene)
  const removeScene = useScene((s) => s.removeScene)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayScenes: TabInfo[] = scenes.length > 0
    ? scenes.map((s) => ({ id: s.id, name: s.name }))
    : [{ id: activeSceneId, name: 'Scene 1' }]

  useEffect(() => {
    if (editingId) inputRef.current?.focus()
  }, [editingId])

  function startRename(id: string, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
  }

  function commitRename() {
    if (editingId && editingName.trim()) {
      renameScene(editingId, editingName.trim())
    }
    setEditingId(null)
  }

  function handleContextMenu(e: React.MouseEvent, id: string) {
    e.preventDefault()
    setContextMenu({ id, x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  return (
    <>
      <div
        className="flex items-center h-8 overflow-x-auto shrink-0"
        style={{ background: '#0d0f14', borderTop: '1px solid #1E2028', borderBottom: '1px solid #1E2028' }}
        onClick={() => setContextMenu(null)}
      >
        {displayScenes.map((sc) => {
          const isActive = sc.id === activeSceneId
          const isEditing = editingId === sc.id

          return (
            <div
              key={sc.id}
              className="relative flex items-center shrink-0"
              style={{ borderRight: '1px solid #1E2028' }}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="h-8 px-3 text-[11px] font-medium outline-none"
                  style={{
                    background: '#1E2028',
                    color: '#E8E9F0',
                    width: Math.max(64, editingName.length * 8) + 'px',
                  }}
                />
              ) : (
                <button
                  onClick={() => { if (!isActive) switchScene(sc.id) }}
                  onDoubleClick={() => startRename(sc.id, sc.name)}
                  onContextMenu={(e) => handleContextMenu(e, sc.id)}
                  className="h-8 px-3 text-[11px] font-medium transition-colors whitespace-nowrap"
                  style={{
                    color: isActive ? '#E8E9F0' : '#7A7E92',
                    borderBottom: isActive ? '2px solid #5B6CFF' : '2px solid transparent',
                    background: isActive ? '#5B6CFF10' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#C8C9D0' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#7A7E92' }}
                >
                  {sc.name}
                </button>
              )}
            </div>
          )
        })}

        <button
          onClick={() => addScene()}
          className="h-8 w-8 flex items-center justify-center shrink-0 transition-colors"
          style={{ color: '#7A7E92' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.background = '#1E2028' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.background = '' }}
          title="Add scene"
        >
          <Plus size={13} strokeWidth={2} />
        </button>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg shadow-xl overflow-hidden"
          style={{
            left: contextMenu.x,
            bottom: window.innerHeight - contextMenu.y,
            background: '#1E2028',
            border: '1px solid #2a2d3a',
            minWidth: 140,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-[12px] transition-colors"
            style={{ color: '#E8E9F0' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2d3a' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            onClick={() => { duplicateScene(contextMenu.id); setContextMenu(null) }}
          >
            Duplicate
          </button>
          {displayScenes.length > 1 && (
            <button
              className="w-full px-3 py-2 text-left text-[12px] transition-colors"
              style={{ color: '#FF5C8A' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2d3a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              onClick={() => { removeScene(contextMenu.id); setContextMenu(null) }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </>
  )
}
