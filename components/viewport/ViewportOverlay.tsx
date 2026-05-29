'use client'

import { useEffect, useCallback, useState } from 'react'
import { useScene, type ViewMode } from '@/lib/scene/SceneStore'
import { ContextMenu } from '@/components/toolbar/ContextMenu'
import {
  MousePointer2, Move, RotateCcw, Maximize2, Mountain, Pencil,
  Copy, Trash2, Focus, Layers, Box, Circle, Cylinder,
  Eye, Download, PlusCircle, ChevronDown,
} from 'lucide-react'

const VIEW_BUTTONS: { id: ViewMode; label: string }[] = [
  { id: 'persp',  label: 'P' },
  { id: 'top',    label: 'T' },
  { id: 'front',  label: 'F' },
  { id: 'right',  label: 'R' },
  { id: 'left',   label: 'L' },
  { id: 'iso',    label: 'ISO' },
]

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
  const setTransformSpace = useScene((s) => s.setTransformSpace)
  const snapEnabled = useScene((s) => s.snapEnabled)
  const setSnapEnabled = useScene((s) => s.setSnapEnabled)
  const viewMode = useScene((s) => s.viewMode)
  const setViewMode = useScene((s) => s.setViewMode)
  const cameraFov = useScene((s) => s.cameraFov)
  const setCameraFov = useScene((s) => s.setCameraFov)
  const orthoZoom = useScene((s) => s.orthoZoom)
  const setOrthoZoom = useScene((s) => s.setOrthoZoom)
  const cameraNear = useScene((s) => s.cameraNear)
  const setCameraNear = useScene((s) => s.setCameraNear)
  const cameraFar = useScene((s) => s.cameraFar)
  const setCameraFar = useScene((s) => s.setCameraFar)
  const isRecording = useScene((s) => s.isRecording)
  const contextMenu = useScene((s) => s.contextMenu)
  const setContextMenu = useScene((s) => s.setContextMenu)
  const addObject = useScene((s) => s.addObject)
  const deleteObject = useScene((s) => s.removeObject)
  const duplicateObject = useScene((s) => s.duplicateObject)
  const deselectAll = useScene((s) => s.deselectAll)
  const selectAll = useScene((s) => s.selectAll)
  const appMode = useScene((s) => s.appMode)
  const isPreviewMode = useScene((s) => s.isPreviewMode)
  const setPreviewMode = useScene((s) => s.setPreviewMode)
  const scrollProgress = useScene((s) => s.scrollProgress)
  const setScrollProgress = useScene((s) => s.setScrollProgress)
  const websiteScrollEnabled = useScene((s) => s.websiteScrollEnabled)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const isPersp = viewMode === 'persp'

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
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1 flex-wrap">
        {VIEW_BUTTONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className="px-2 h-6 rounded text-[10px] font-mono uppercase transition-colors"
            style={{
              background: viewMode === id ? '#5B6CFF' : 'rgba(11,12,15,0.8)',
              color: viewMode === id ? '#fff' : '#7A7E92',
              border: '1px solid #1E2028',
              backdropFilter: 'blur(4px)',
            }}
          >
            {label}
          </button>
        ))}
        <div className="w-px h-4 mx-0.5" style={{ background: '#1E2028' }} />
        {isPersp ? (
          <>
            <span className="text-[10px] font-mono" style={{ color: '#7A7E92' }}>FOV</span>
            <input
              type="range"
              min={20} max={120} step={1}
              value={cameraFov}
              onChange={(e) => setCameraFov(parseInt(e.target.value))}
              className="w-14 h-1"
              style={{ accentColor: '#5B6CFF' }}
            />
            <span className="text-[10px] font-mono w-6" style={{ color: '#7A7E92' }}>{cameraFov}°</span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-mono" style={{ color: '#7A7E92' }}>Zoom</span>
            <input
              type="range"
              min={1} max={100} step={0.5}
              value={orthoZoom}
              onChange={(e) => setOrthoZoom(parseFloat(e.target.value))}
              className="w-14 h-1"
              style={{ accentColor: '#5B6CFF' }}
            />
            <span className="text-[10px] font-mono w-8" style={{ color: '#7A7E92' }}>{orthoZoom.toFixed(0)}</span>
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
                selectedIds.forEach((id) => duplicateObject(id))
                deselectAll()
              }}
              title="Duplicate all selected"
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: '#7A7E92' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#C8C9D0' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92' }}
            >
              <Copy size={11} /> Duplicate
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

      {/* Selected object info (bottom-right, above bottom bar) */}
      {selectedObj && (
        <div className="absolute z-20 pointer-events-none" style={{ bottom: 36, right: 8 }}>
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

      {/* ── Unified Bottom Status Bar ─────────────────────────────────────── */}
      {!isPreviewMode && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center px-3 gap-3"
          style={{ height: 30, background: 'rgba(8,9,12,0.82)', backdropFilter: 'blur(6px)', borderTop: '1px solid #1a1c24' }}
        >
          {appMode === 'website' ? (
            /* Website mode: show scroll state */
            <>
              <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: websiteScrollEnabled ? '#5B6CFF' : '#4a4e60' }}>
                {websiteScrollEnabled ? '● Scroll' : '○ Scroll off'}
              </span>
              <div className="flex-1 flex items-center gap-2 max-w-[160px]">
                <input
                  type="range" min={0} max={1} step={0.001}
                  value={scrollProgress}
                  onChange={(e) => setScrollProgress(parseFloat(e.target.value))}
                  className="flex-1 h-0.5"
                  style={{ accentColor: '#5B6CFF' }}
                />
                <span className="text-[9px] font-mono w-7 text-right" style={{ color: '#7A7E92' }}>
                  {Math.round(scrollProgress * 100)}%
                </span>
              </div>
            </>
          ) : (
            /* World mode: tool strip */
            <>
              {TOOLS.slice(0, 5).map(({ id, label, key }) => (
                <button
                  key={id}
                  onClick={() => setActiveTool(id)}
                  className="flex items-center gap-1 text-[9px] uppercase tracking-widest transition-colors"
                  style={{ color: activeTool === id ? '#5B6CFF' : '#4a4e60', fontWeight: activeTool === id ? 700 : 400 }}
                >
                  <kbd className="px-1 h-4 flex items-center rounded font-mono text-[8px]"
                    style={{ background: activeTool === id ? '#5B6CFF22' : 'transparent', border: `1px solid ${activeTool === id ? '#5B6CFF55' : '#2a2d40'}`, color: 'inherit' }}>
                    {key}
                  </kbd>
                  {label}
                </button>
              ))}
            </>
          )}

          <div className="flex-1" />

          {/* Right side: space + snap toggles + clip + FPS */}
          {appMode !== 'website' && (
            <>
              <button
                onClick={() => setTransformSpace(transformSpace === 'world' ? 'local' : 'world')}
                className="text-[9px] uppercase tracking-widest transition-colors"
                style={{ color: transformSpace === 'local' ? '#60a5fa' : '#4a4e60' }}
              >
                {transformSpace}
              </button>
              <button
                onClick={() => setSnapEnabled(!snapEnabled)}
                className="text-[9px] uppercase tracking-widest transition-colors"
                style={{ color: snapEnabled ? '#f59e0b' : '#4a4e60' }}
              >
                Snap{snapEnabled ? ' ●' : ''}
              </button>
            </>
          )}

          {/* Camera clip controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest" style={{ color: '#3a3e50' }}>Near</span>
            <input
              type="number" value={cameraNear} step={0.001} min={0.001} max={100}
              onChange={(e) => setCameraNear(parseFloat(e.target.value) || 0.1)}
              className="h-4 rounded px-1 text-[9px] font-mono outline-none border w-12 text-center"
              style={{ background: '#0d0f14', color: '#7A7E92', borderColor: '#1E2028' }}
            />
            <span className="text-[9px] uppercase tracking-widest" style={{ color: '#3a3e50' }}>Far</span>
            <input
              type="number" value={cameraFar} step={10} min={10} max={100000}
              onChange={(e) => setCameraFar(parseFloat(e.target.value) || 1000)}
              className="h-4 rounded px-1 text-[9px] font-mono outline-none border w-16 text-center"
              style={{ background: '#0d0f14', color: '#7A7E92', borderColor: '#1E2028' }}
            />
          </div>

          {showStats && (
            <span className="text-[9px] font-mono" style={{ color: fps < 30 ? '#f87171' : fps < 50 ? '#fbbf24' : '#4ade80' }}>
              {fps} fps
            </span>
          )}

          <div className="flex items-center gap-0.5">
            <span className="text-[9px] font-mono text-red-500 opacity-50">X</span>
            <span className="text-[9px] font-mono text-green-500 opacity-50">Y</span>
            <span className="text-[9px] font-mono text-blue-500 opacity-50">Z</span>
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

      {/* Website mode: floating toolbar */}
      {appMode === 'website' && !isPreviewMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto">
          {/* Orbit status chip */}
          <div
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl border shadow-xl text-[10px] font-medium"
            style={{
              background: !websiteScrollEnabled ? 'rgba(13,26,13,0.92)' : 'rgba(26,16,32,0.92)',
              borderColor: !websiteScrollEnabled ? '#1a3a1a' : '#2a1840',
              color: !websiteScrollEnabled ? '#4ade80' : '#a78bfa',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: !websiteScrollEnabled ? '#4ade80' : '#a78bfa' }}
            />
            {!websiteScrollEnabled ? 'Orbit free' : 'Scroll active'}
          </div>
          <div className="flex items-center gap-0 rounded-xl overflow-hidden border shadow-xl"
            style={{ background: 'rgba(11,12,15,0.92)', borderColor: '#2a2d40', backdropFilter: 'blur(8px)' }}>
            <span className="px-3 text-[10px] font-semibold uppercase tracking-widest border-r" style={{ color: '#5B6CFF', borderColor: '#2a2d40' }}>
              Website
            </span>
            {/* Add Element dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu((v) => !v)}
                className="flex items-center gap-1 px-2.5 h-8 text-[11px] border-r transition-colors"
                style={{ color: '#C8C9D0', borderColor: '#2a2d40' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <PlusCircle size={12} /> Add Element <ChevronDown size={10} />
              </button>
              {showAddMenu && (
                <div className="absolute top-full left-0 mt-1 rounded-xl border shadow-2xl overflow-hidden z-50 min-w-[160px]"
                  style={{ background: '#111318', borderColor: '#2a2d40' }}>
                  {[
                    { label: 'Heading', tag: 'heading', content: 'Your Heading' },
                    { label: 'Paragraph', tag: 'paragraph', content: 'Your text here.' },
                    { label: 'Quote', tag: 'quote', content: 'An inspiring quote.' },
                    { label: 'Badge', tag: 'badge', content: 'NEW' },
                    { label: 'Button', tag: 'button', content: 'Click Me' },
                    { label: 'Card', tag: 'card', content: 'Card Title' },
                    { label: 'Stat', tag: 'stat', content: '99%' },
                    { label: 'Divider', tag: 'divider', content: '' },
                    { label: 'Countdown', tag: 'countdown', content: '' },
                    { label: 'Icon + Text', tag: 'icontext', content: '✦' },
                    { label: 'Image', tag: 'image', content: '' },
                    { label: 'Video', tag: 'video', content: '' },
                  ].map(({ label, tag, content }) => (
                    <button
                      key={tag}
                      onClick={() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        addObject({ type: 'html', name: label, htmlConfig: { htmlType: tag as any, content } })
                        setShowAddMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-[11px] transition-colors"
                      style={{ color: '#C8C9D0' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Preview */}
            <button
              onClick={() => setPreviewMode(true)}
              className="flex items-center gap-1 px-2.5 h-8 text-[11px] border-r transition-colors"
              style={{ color: '#C8C9D0', borderColor: '#2a2d40' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Eye size={12} /> Preview
            </button>
            {/* Export HTML */}
            <button
              onClick={() => {
                // Open export modal to website tab — dispatch a custom event
                window.dispatchEvent(new CustomEvent('open-export-modal', { detail: 'website' }))
              }}
              className="flex items-center gap-1 px-2.5 h-8 text-[11px] transition-colors"
              style={{ color: '#C8C9D0' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Download size={12} /> Export HTML
            </button>
          </div>
        </div>
      )}

      {/* Website mode: scroll progress bar on right edge */}
      {appMode === 'website' && !isPreviewMode && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
          <span className="text-[9px] font-mono" style={{ color: '#5B6CFF' }}>
            {Math.round(scrollProgress * 100)}%
          </span>
          <div
            className="relative w-1.5 rounded-full overflow-hidden"
            style={{ height: 120, background: '#1E2028' }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all"
              style={{ height: `${scrollProgress * 100}%`, background: '#5B6CFF' }}
            />
          </div>
          <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: '#3a3e50' }}>
            scroll
          </span>
        </div>
      )}

      {/* Preview mode overlay */}
      {isPreviewMode && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Exit button */}
          <div className="absolute top-4 right-4 pointer-events-auto">
            <button
              onClick={() => setPreviewMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium backdrop-blur-md border transition-colors"
              style={{ background: 'rgba(11,12,15,0.85)', color: '#E8E9F0', borderColor: '#2a2d40' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,32,40,0.95)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(11,12,15,0.85)' }}
            >
              ✕ Exit Preview
            </button>
          </div>

          {/* Scroll progress in preview */}
          <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {Math.round(scrollProgress * 100)}%
            </span>
            <div
              className="relative w-1 rounded-full overflow-hidden"
              style={{ height: 80, background: 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 rounded-full"
                style={{ height: `${scrollProgress * 100}%`, background: 'rgba(255,255,255,0.6)' }}
              />
            </div>
          </div>

          {/* Scroll hint */}
          {websiteScrollEnabled && scrollProgress === 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="flex flex-col items-center gap-1 animate-bounce">
                <span className="text-[11px] font-light tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  SCROLL
                </span>
                <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
                  <rect x="5" y="1" width="4" height="7" rx="2" fill="rgba(255,255,255,0.3)" />
                  <rect x="1" y="1" width="12" height="18" rx="6" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <path d="M7 14l-3 3h6l-3-3z" fill="rgba(255,255,255,0.3)" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
