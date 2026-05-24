'use client'

import { useEffect, useCallback } from 'react'
import { useScene } from '@/lib/scene/SceneStore'
import { ContextMenu } from '@/components/toolbar/ContextMenu'
import {
  MousePointer2, Move, RotateCcw, Maximize2, Mountain, Pencil,
  Copy, Trash2, Focus, Layers, Box, Circle, Cylinder,
} from 'lucide-react'

const TOOLS = [
  { id: 'select' as const,    label: 'Select',    key: 'Q', Icon: MousePointer2 },
  { id: 'translate' as const, label: 'Move',      key: 'W', Icon: Move },
  { id: 'rotate' as const,    label: 'Rotate',    key: 'E', Icon: RotateCcw },
  { id: 'scale' as const,     label: 'Scale',     key: 'R', Icon: Maximize2 },
  { id: 'sculpt' as const,    label: 'Sculpt',    key: 'T', Icon: Mountain },
  { id: 'edit' as const,      label: 'Edit',      key: 'V', Icon: Pencil },
]

export function ViewportOverlay() {
  const fps = useScene((s) => s.fps)
  const showStats = useScene((s) => s.showStats)
  const objects = useScene((s) => s.objects)
  const isPlaying = useScene((s) => s.isPlaying)
  const selectedIds = useScene((s) => s.selectedIds)
  const activeTool = useScene((s) => s.activeTool)
  const setActiveTool = useScene((s) => s.setActiveTool)
  const transformSpace = useScene((s) => s.transformSpace)
  const snapEnabled = useScene((s) => s.snapEnabled)
  const viewMode = useScene((s) => s.viewMode)
  const setViewMode = useScene((s) => s.setViewMode)
  const cameraFov = useScene((s) => s.cameraFov)
  const setCameraFov = useScene((s) => s.setCameraFov)
  const isRecording = useScene((s) => s.isRecording)
  const contextMenu = useScene((s) => s.contextMenu)
  const setContextMenu = useScene((s) => s.setContextMenu)
  const addObject = useScene((s) => s.addObject)
  const deleteObject = useScene((s) => s.removeObject)
  const duplicateObject = useScene((s) => s.duplicateObject)
  const deselectAll = useScene((s) => s.deselectAll)
  const selectAll = useScene((s) => s.selectAll)

  const objCount = Object.keys(objects).length
  const selectedObj = selectedIds.length === 1 ? objects[selectedIds[0]] : null

  // Keyboard shortcuts for tools
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'q' || e.key === 'Q') setActiveTool('select')
      if (e.key === 'w' || e.key === 'W') setActiveTool('translate')
      if (e.key === 'e' || e.key === 'E') setActiveTool('rotate')
      if (e.key === 'r' || e.key === 'R') setActiveTool('scale')
      if (e.key === 't' || e.key === 'T') setActiveTool('sculpt')
      if (e.key === 'v' || e.key === 'V') setActiveTool('edit')
      if (e.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveTool, setContextMenu])

  const closeContextMenu = useCallback(() => setContextMenu(null), [setContextMenu])

  // Build context menu items based on whether an object is selected
  const buildContextItems = () => {
    if (contextMenu?.objectId) {
      const obj = objects[contextMenu.objectId]
      return [
        { label: 'Move', icon: <Move size={12} />, onClick: () => setActiveTool('translate') },
        { label: 'Rotate', icon: <RotateCcw size={12} />, onClick: () => setActiveTool('rotate') },
        { label: 'Scale', icon: <Maximize2 size={12} />, onClick: () => setActiveTool('scale') },
        { label: '', divider: true, onClick: () => {} },
        { label: 'Duplicate', icon: <Copy size={12} />, onClick: () => {
          if (contextMenu.objectId) duplicateObject(contextMenu.objectId)
        }},
        { label: 'Select All', icon: <Layers size={12} />, onClick: () => selectAll?.() },
        { label: '', divider: true, onClick: () => {} },
        { label: `Delete "${obj?.name ?? 'Object'}"`, icon: <Trash2 size={12} />, danger: true, onClick: () => {
          if (contextMenu.objectId) deleteObject(contextMenu.objectId)
        }},
      ]
    }
    // Background right-click
    return [
      { label: 'Add Box', icon: <Box size={12} />, onClick: () => addObject({ type: 'mesh', name: 'Box', geometry: { type: 'box' } }) },
      { label: 'Add Sphere', icon: <Circle size={12} />, onClick: () => addObject({ type: 'mesh', name: 'Sphere', geometry: { type: 'sphere' } }) },
      { label: 'Add Cylinder', icon: <Cylinder size={12} />, onClick: () => addObject({ type: 'mesh', name: 'Cylinder', geometry: { type: 'cylinder' } }) },
      { label: '', divider: true, onClick: () => {} },
      { label: 'Select All', icon: <Layers size={12} />, onClick: () => selectAll?.() },
      { label: 'Deselect All', icon: <Focus size={12} />, onClick: () => deselectAll() },
    ]
  }

  return (
    <>
      {/* View mode switcher */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1">
        {(['persp', 'top', 'front', 'right'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="px-2 h-6 rounded text-[10px] font-mono uppercase transition-colors"
            style={{
              background: viewMode === mode ? '#5B6CFF' : 'rgba(11,12,15,0.8)',
              color: viewMode === mode ? '#fff' : '#7A7E92',
              border: '1px solid #1E2028',
              backdropFilter: 'blur(4px)',
            }}
          >
            {mode}
          </button>
        ))}
        {viewMode === 'persp' && (
          <>
            <div className="w-px h-4 mx-1" style={{ background: '#1E2028' }} />
            <span className="text-[10px] font-mono" style={{ color: '#7A7E92' }}>FOV</span>
            <input
              type="range"
              min={20} max={120} step={1}
              value={cameraFov}
              onChange={(e) => setCameraFov(parseInt(e.target.value))}
              className="w-16 h-1"
              style={{ accentColor: '#5B6CFF' }}
            />
            <span className="text-[10px] font-mono w-6" style={{ color: '#7A7E92' }}>{cameraFov}°</span>
          </>
        )}
      </div>

      {/* Left-edge tool icon strip */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
        {TOOLS.map(({ id, label, key, Icon }) => {
          const isActive = activeTool === id
          return (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={`${label} (${key})`}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all relative group"
              style={{
                background: isActive ? '#5B6CFF' : 'rgba(11,12,15,0.85)',
                border: `1px solid ${isActive ? '#5B6CFF' : '#1E2028'}`,
                backdropFilter: 'blur(4px)',
                color: isActive ? '#fff' : '#7A7E92',
                boxShadow: isActive ? '0 0 10px rgba(91,108,255,0.4)' : 'none',
              }}
            >
              <Icon size={14} strokeWidth={isActive ? 2.5 : 1.75} />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                style={{ background: '#1E2028', color: '#E8E9F0', border: '1px solid #2a2d40' }}>
                {label}
                <span className="ml-1.5 opacity-50">{key}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Floating mini-toolbar above selected object */}
      {selectedObj && selectedIds.length === 1 && !isPlaying && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          style={{ top: '48px' }}>
          <div className="flex items-center gap-0 rounded-xl overflow-hidden border shadow-xl"
            style={{ background: 'rgba(11,12,15,0.92)', borderColor: '#2a2d40', backdropFilter: 'blur(8px)' }}>
            <div className="px-3 py-1.5 text-[11px] font-medium border-r max-w-[120px] truncate"
              style={{ color: '#C8C9D0', borderColor: '#2a2d40' }}>
              {selectedObj.name}
            </div>
            {[
              { tool: 'translate' as const, Icon: Move, label: 'Move (W)' },
              { tool: 'rotate' as const, Icon: RotateCcw, label: 'Rotate (E)' },
              { tool: 'scale' as const, Icon: Maximize2, label: 'Scale (R)' },
            ].map(({ tool, Icon, label }) => (
              <button
                key={tool}
                onClick={() => setActiveTool(tool)}
                title={label}
                className="w-8 h-8 flex items-center justify-center transition-colors border-r"
                style={{
                  background: activeTool === tool ? '#5B6CFF22' : 'transparent',
                  color: activeTool === tool ? '#5B6CFF' : '#7A7E92',
                  borderColor: '#2a2d40',
                }}
                onMouseEnter={(e) => { if (activeTool !== tool) e.currentTarget.style.background = '#1E2028' }}
                onMouseLeave={(e) => { if (activeTool !== tool) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={12} />
              </button>
            ))}
            <button
              onClick={() => { if (selectedIds[0]) duplicateObject(selectedIds[0]) }}
              title="Duplicate"
              className="w-8 h-8 flex items-center justify-center transition-colors border-r"
              style={{ color: '#7A7E92', borderColor: '#2a2d40' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028'; e.currentTarget.style.color = '#C8C9D0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A7E92' }}
            >
              <Copy size={12} />
            </button>
            <button
              onClick={() => { if (selectedIds[0]) deleteObject(selectedIds[0]) }}
              title="Delete"
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{ color: '#FF5C8A' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2a0a18' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Multi-selection badge */}
      {selectedIds.length > 1 && !isPlaying && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          style={{ top: '48px' }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-xl"
            style={{ background: 'rgba(11,12,15,0.92)', borderColor: '#2a2d40', backdropFilter: 'blur(8px)' }}>
            <span className="text-[11px] font-medium" style={{ color: '#C8C9D0' }}>
              {selectedIds.length} selected
            </span>
            <div className="w-px h-4" style={{ background: '#2a2d40' }} />
            <button
              onClick={() => {
                if (selectedIds.length > 0) duplicateObject(selectedIds[0])
              }}
              title="Duplicate"
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: '#7A7E92' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#C8C9D0' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92' }}
            >
              <Copy size={11} /> Group
            </button>
            <button
              onClick={() => {
                selectedIds.forEach((id) => deleteObject(id))
                deselectAll()
              }}
              title="Delete selected"
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: '#FF5C8A' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff8aaa' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#FF5C8A' }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* REC indicator */}
      {isRecording && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border" style={{ background: 'rgba(180,0,0,0.25)', borderColor: 'rgba(220,50,50,0.6)' }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest" style={{ color: '#ff6060' }}>REC</span>
          </div>
        </div>
      )}

      {/* Playing badge */}
      {isPlaying && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[11px] text-red-300 font-medium uppercase tracking-widest">Playing</span>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {showStats && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none font-mono">
          <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-md bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px]">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">FPS</span>
              <span className={fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}>{fps}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Objects</span>
              <span className="text-zinc-300">{objCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tool / space indicator */}
      <div className="absolute bottom-16 left-14 z-20 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{activeTool}</span>
          {activeTool !== 'select' && (
            <>
              <span className="text-zinc-700">·</span>
              <span className={`text-[10px] uppercase tracking-widest ${transformSpace === 'local' ? 'text-blue-400' : 'text-zinc-400'}`}>
                {transformSpace}
              </span>
            </>
          )}
          {snapEnabled && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-[10px] text-amber-400 uppercase tracking-widest">Snap</span>
            </>
          )}
        </div>
      </div>

      {/* Selected object info */}
      {selectedObj && (
        <div className="absolute bottom-16 right-3 z-20 pointer-events-none">
          <div className="px-2.5 py-2 rounded-md bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px] font-mono">
            <div className="text-zinc-400 mb-1 truncate max-w-[160px]">{selectedObj.name}</div>
            {(['position', 'rotation', 'scale'] as const).map((prop) => (
              <div key={prop} className="flex gap-2 text-zinc-600">
                <span className="w-6 uppercase text-zinc-700">{prop[0]}</span>
                {selectedObj.transform[prop].map((v, i) => (
                  <span key={i} className={i === 0 ? 'text-red-400' : i === 1 ? 'text-green-400' : 'text-blue-400'}>
                    {v.toFixed(2)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Axis labels */}
      <div className="absolute bottom-20 right-3 z-20 pointer-events-none flex flex-col items-end gap-0.5 mr-[168px]">
        <span className="text-[9px] font-mono text-red-500 opacity-60">X</span>
        <span className="text-[9px] font-mono text-green-500 opacity-60">Y</span>
        <span className="text-[9px] font-mono text-blue-500 opacity-60">Z</span>
      </div>

      {/* Keyboard hints (only when nothing selected) */}
      {selectedIds.length === 0 && !isPlaying && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-zinc-800/50">
            {[
              ['Q', 'Select'], ['W', 'Move'], ['E', 'Rotate'], ['R', 'Scale'], ['T', 'Sculpt'],
              ['G', 'Snap'], ['F3', 'Stats'],
            ].map(([k, l]) => (
              <span key={k} className="flex items-center gap-1 text-[10px]">
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[9px]">{k}</kbd>
                <span className="text-zinc-600">{l}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextItems()}
          onClose={closeContextMenu}
        />
      )}
    </>
  )
}
