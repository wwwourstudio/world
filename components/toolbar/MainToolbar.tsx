'use client'

import { useState } from 'react'
import {
  Globe2, MousePointer2, Move, RotateCw, Maximize2,
  PanelLeft, PanelRight, PanelBottom, Play, Square,
  Undo2, Redo2, Grid3X3, Settings, Download, Upload,
  ChevronDown, Zap, Eye, Paintbrush, Mountain
} from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { WORLD_TEMPLATES } from '@/lib/ai/WorldTemplates'
import { DEFAULT_TERRAIN, DEFAULT_WATER } from '@/lib/scene/SceneStore'
import type { ActiveTool } from '@/lib/scene/SceneStore'
import { ExportModal } from '@/components/modals/ExportModal'
import { ImportModal } from '@/components/modals/ImportModal'

const TOOLS: { id: ActiveTool; icon: typeof MousePointer2; label: string; key: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', key: 'Q' },
  { id: 'translate', icon: Move, label: 'Move', key: 'W' },
  { id: 'rotate', icon: RotateCw, label: 'Rotate', key: 'E' },
  { id: 'scale', icon: Maximize2, label: 'Scale', key: 'R' },
  { id: 'sculpt', icon: Paintbrush, label: 'Sculpt', key: 'T' },
]

export function MainToolbar() {
  const activeTool = useScene((s) => s.activeTool)
  const setActiveTool = useScene((s) => s.setActiveTool)
  const transformSpace = useScene((s) => s.transformSpace)
  const setTransformSpace = useScene((s) => s.setTransformSpace)
  const snapEnabled = useScene((s) => s.snapEnabled)
  const setSnapEnabled = useScene((s) => s.setSnapEnabled)
  const panels = useScene((s) => s.panels)
  const togglePanel = useScene((s) => s.togglePanel)
  const isPlaying = useScene((s) => s.isPlaying)
  const setPlaying = useScene((s) => s.setPlaying)
  const physicsEnabled = useScene((s) => s.physicsEnabled)
  const setPhysicsEnabled = useScene((s) => s.setPhysicsEnabled)
  const showStats = useScene((s) => s.showStats)
  const setShowStats = useScene((s) => s.setShowStats)
  const undo = useScene((s) => s.undo)
  const redo = useScene((s) => s.redo)
  const past = useScene((s) => s.past)
  const future = useScene((s) => s.future)
  const objects = useScene((s) => s.objects)
  const rootIds = useScene((s) => s.rootIds)
  const addObject = useScene((s) => s.addObject)
  const setEnvironment = useScene((s) => s.setEnvironment)
  const showNotification = useScene((s) => s.showNotification)

  const [showTemplates, setShowTemplates] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  function loadTemplate(templateId: string) {
    const tpl = WORLD_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    const store = useScene.getState()
    for (const id of [...store.rootIds]) store.removeObject(id)
    for (const cfg of tpl.objects) store.addObject(cfg)
    store.setEnvironment(tpl.environment)
    store.showNotification(`Loaded: ${tpl.name}`)
    setShowTemplates(false)
  }

  const PRIMITIVES = [
    { label: 'Box', geo: { type: 'box' as const, width: 1, height: 1, depth: 1 } },
    { label: 'Sphere', geo: { type: 'sphere' as const, radius: 0.5, segments: 32 } },
    { label: 'Cylinder', geo: { type: 'cylinder' as const, radiusTop: 0.5, radiusBottom: 0.5, height: 1, segments: 16 } },
    { label: 'Cone', geo: { type: 'cone' as const, radius: 0.5, height: 1, segments: 16 } },
    { label: 'Torus', geo: { type: 'torus' as const, radius: 0.5, tube: 0.2, segments: 32 } },
    { label: 'Plane', geo: { type: 'plane' as const, width: 2, height: 2 } },
    { label: 'Ring', geo: { type: 'ring' as const, radius: 0.5 } },
    { label: 'Octahedron', geo: { type: 'octahedron' as const, radius: 0.5 } },
    { label: 'Icosahedron', geo: { type: 'icosahedron' as const, radius: 0.5, segments: 1 } },
    { label: 'Capsule', geo: { type: 'capsule' as const, radius: 0.3, height: 1 } },
  ]

  const LIGHTS: { label: string; ltype: import('@/lib/scene/SceneStore').LightType; extra?: Partial<import('@/lib/scene/SceneStore').LightConfig> }[] = [
    { label: 'Point Light', ltype: 'point' },
    { label: 'Directional', ltype: 'directional' },
    { label: 'Spot Light', ltype: 'spot' },
    { label: 'Area Light', ltype: 'rectarea', extra: { rectAreaWidth: 4, rectAreaHeight: 4 } },
    { label: 'Ambient', ltype: 'ambient' },
    { label: 'Hemisphere', ltype: 'hemisphere' },
  ]

  return (
    <>
      <header
        className="flex items-center h-11 shrink-0 select-none z-30 px-3 gap-2"
        style={{ background: '#111318', borderBottom: '1px solid #1E2028' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20"
            style={{ background: 'linear-gradient(135deg, #5B6CFF, #8B5CF6)' }}>
            <Globe2 size={13} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: '#E8E9F0' }}>World Builder</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: '#1E2028' }} />

        {/* Panel toggles */}
        <div className="flex items-center gap-0.5">
          <ToolBtn
            icon={PanelLeft} active={panels.leftOpen}
            onClick={() => togglePanel('left')} title="Left Panel (Outliner)"
          />
          <ToolBtn
            icon={PanelRight} active={panels.rightOpen}
            onClick={() => togglePanel('right')} title="Right Panel (Chat)"
          />
          <ToolBtn
            icon={PanelBottom} active={panels.bottomOpen}
            onClick={() => togglePanel('bottom')} title="Bottom Panel (Animation)"
          />
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1E2028' }} />

        {/* Transform tools */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: '#0B0C0F' }}>
          {TOOLS.map(({ id, icon: Icon, label, key }) => (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={`${label} (${key})`}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-all duration-150"
              style={activeTool === id
                ? { background: '#5B6CFF', color: '#ffffff' }
                : { color: '#7A7E92' }
              }
              onMouseEnter={(e) => { if (activeTool !== id) e.currentTarget.style.color = '#E8E9F0' }}
              onMouseLeave={(e) => { if (activeTool !== id) e.currentTarget.style.color = '#7A7E92' }}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1E2028' }} />

        {/* Space toggle */}
        <button
          onClick={() => setTransformSpace(transformSpace === 'world' ? 'local' : 'world')}
          title="Toggle Local/World Space (X)"
          className="px-2.5 h-7 rounded-md text-[11px] font-mono font-medium transition-colors border"
          style={{
            background: transformSpace === 'local' ? '#1a1a4a' : 'transparent',
            color: transformSpace === 'local' ? '#5B6CFF' : '#7A7E92',
            borderColor: transformSpace === 'local' ? '#3a3a8a' : '#1E2028',
          }}
        >
          {transformSpace === 'local' ? 'LOCAL' : 'WORLD'}
        </button>

        {/* Snap toggle */}
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="Toggle Grid Snap (G)"
          className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] transition-colors border"
          style={{
            background: snapEnabled ? '#1a1a00' : 'transparent',
            color: snapEnabled ? '#d4b400' : '#7A7E92',
            borderColor: snapEnabled ? '#3a3000' : '#1E2028',
          }}
        >
          <Grid3X3 size={12} strokeWidth={1.75} />
          <span className="hidden md:inline font-medium">Snap</span>
        </button>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <ToolBtn icon={Undo2} disabled={past.length === 0} onClick={undo} title="Undo (Ctrl+Z)" />
          <ToolBtn icon={Redo2} disabled={future.length === 0} onClick={redo} title="Redo (Ctrl+Y)" />
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1E2028' }} />

        {/* Add object */}
        <div className="relative">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: '#1a2a4a', color: '#5B6CFF', border: '1px solid #2a3a6a' }}
          >
            + Add
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {showAdd && (
            <Dropdown onClose={() => setShowAdd(false)}>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 py-1 mt-1">Primitives</div>
              {PRIMITIVES.map((p) => (
                <DropdownItem key={p.label} onClick={() => {
                  addObject({ name: p.label, type: 'mesh', geometry: p.geo, transform: { position: [0, p.geo.type === 'plane' ? 0 : 0.5, 0], rotation: [p.geo.type === 'plane' ? -Math.PI / 2 : 0, 0, 0], scale: [1, 1, 1] } })
                  setShowAdd(false)
                }}>{p.label}</DropdownItem>
              ))}
              <div className="w-full h-px my-1" style={{ background: '#1E2028' }} />
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 py-1">Special</div>
              <DropdownItem onClick={() => {
                addObject({ name: '3D Text', type: 'mesh', geometry: { type: 'text', text: 'Hello', fontSize: 0.5 }, transform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>✦ 3D Text</DropdownItem>
              <DropdownItem onClick={() => {
                addObject({ name: 'Particles', type: 'particle', geometry: { type: 'sphere', radius: 0.1 }, particle: { count: 300, spread: [6, 6, 6], instanceGeometry: 'sphere', instanceScale: 0.06, randomScale: 0.6, preset: 'scatter' }, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>✦ Particles</DropdownItem>
              <DropdownItem onClick={() => {
                addObject({ name: 'Rain', type: 'particle', geometry: { type: 'sphere', radius: 0.1 }, particle: { count: 500, spread: [10, 8, 10], instanceGeometry: 'sphere', instanceScale: 0.04, randomScale: 0.3, preset: 'rain' }, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>✦ Rain</DropdownItem>
              <DropdownItem onClick={() => {
                addObject({ name: 'Snow', type: 'particle', geometry: { type: 'sphere', radius: 0.1 }, particle: { count: 400, spread: [10, 8, 10], instanceGeometry: 'sphere', instanceScale: 0.05, randomScale: 0.5, preset: 'snow' }, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>✦ Snow</DropdownItem>
              <div className="w-full h-px my-1" style={{ background: '#1E2028' }} />
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 py-1">Environment</div>
              <DropdownItem onClick={() => {
                addObject({ name: 'Terrain', type: 'terrain', geometry: { type: 'plane' }, terrain: { ...DEFAULT_TERRAIN }, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>⛰ Terrain</DropdownItem>
              <DropdownItem onClick={() => {
                addObject({ name: 'Water', type: 'water', geometry: { type: 'plane' }, water: { ...DEFAULT_WATER }, transform: { position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>🌊 Water</DropdownItem>
              <div className="w-full h-px my-1" style={{ background: '#1E2028' }} />
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 py-1">Lights</div>
              {LIGHTS.map((l) => (
                <DropdownItem key={l.label} onClick={() => {
                  addObject({ name: l.label, type: 'light', light: { type: l.ltype, intensity: 1, color: '#ffffff', distance: 20, decay: 2, angle: Math.PI / 4, penumbra: 0.1, castShadow: true, ...l.extra }, transform: { position: [0, 5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                  setShowAdd(false)
                }}>{l.label}</DropdownItem>
              ))}
            </Dropdown>
          )}
        </div>

        {/* Templates */}
        <div className="relative">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors"
            style={{ color: '#7A7E92', border: '1px solid #1E2028' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92' }}
          >
            Templates
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {showTemplates && (
            <Dropdown onClose={() => setShowTemplates(false)} align="right">
              {WORLD_TEMPLATES.map((t) => (
                <DropdownItem key={t.id} onClick={() => loadTemplate(t.id)}>
                  <span className="mr-2">{t.icon}</span>{t.name}
                </DropdownItem>
              ))}
            </Dropdown>
          )}
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1E2028' }} />

        {/* Stats */}
        <ToolBtn icon={Eye} active={showStats} onClick={() => setShowStats(!showStats)} title="Toggle Stats (F3)" />

        {/* Physics */}
        <button
          onClick={() => setPhysicsEnabled(!physicsEnabled)}
          title="Toggle Physics"
          className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium transition-colors border"
          style={{
            background: physicsEnabled ? '#1a0a2a' : 'transparent',
            color: physicsEnabled ? '#a855f7' : '#7A7E92',
            borderColor: physicsEnabled ? '#5a2a8a' : '#1E2028',
          }}
        >
          <Zap size={12} strokeWidth={1.75} />
          <span className="hidden md:inline">Physics</span>
        </button>

        {/* Import/Export */}
        <ToolBtn icon={Upload} onClick={() => setShowImport(true)} title="Import" />
        <ToolBtn icon={Download} onClick={() => setShowExport(true)} title="Export" />

        <div className="w-px h-5 mx-1" style={{ background: '#1E2028' }} />

        {/* Play */}
        <button
          onClick={() => setPlaying(!isPlaying)}
          title={isPlaying ? 'Stop (Space)' : 'Play (Space)'}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold transition-all"
          style={isPlaying
            ? { background: '#FF5C8A', color: '#ffffff', boxShadow: '0 0 12px rgba(255,92,138,0.4)' }
            : { background: 'linear-gradient(135deg, #5B6CFF, #7c3aed)', color: '#ffffff', boxShadow: '0 0 8px rgba(91,108,255,0.3)' }
          }
        >
          {isPlaying ? <Square size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </header>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  )
}

function ToolBtn({
  icon: Icon,
  active,
  disabled,
  onClick,
  title,
}: {
  icon: typeof MousePointer2
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
      style={{
        background: active ? '#5B6CFF22' : 'transparent',
        color: disabled ? '#3a3a4a' : active ? '#5B6CFF' : '#7A7E92',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.color = '#E8E9F0' }}
      onMouseLeave={(e) => { if (!disabled && !active) e.currentTarget.style.color = '#7A7E92' }}
    >
      <Icon size={14} strokeWidth={1.75} />
    </button>
  )
}

function Dropdown({ children, onClose, align = 'left' }: { children: React.ReactNode; onClose: () => void; align?: 'left' | 'right' }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`absolute top-full mt-1 z-50 min-w-[180px] rounded-lg border py-1 shadow-2xl ${align === 'right' ? 'right-0' : 'left-0'}`}
        style={{ background: '#111318', borderColor: '#1E2028' }}
      >
        {children}
      </div>
    </>
  )
}

function DropdownItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-3 py-1.5 text-[12px] text-left transition-colors"
      style={{ color: '#7A7E92' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#1E2028'; e.currentTarget.style.color = '#E8E9F0' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A7E92' }}
    >
      {children}
    </button>
  )
}
