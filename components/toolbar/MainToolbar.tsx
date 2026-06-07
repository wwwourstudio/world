'use client'

import { useState } from 'react'
import {
  MousePointer2, Move, RotateCw, Maximize2,
  PanelLeft, PanelRight, PanelBottom, Play, Square,
  Undo2, Redo2, Grid3X3, Download, Upload,
  ChevronDown, Zap, Eye, Paintbrush, Mountain, Monitor, Globe2, Type, Navigation, Bookmark,
} from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { WORLD_TEMPLATES } from '@/lib/ai/WorldTemplates'
import { DEFAULT_TERRAIN, DEFAULT_WATER } from '@/lib/scene/SceneStore'
import type { ActiveTool } from '@/lib/scene/SceneStore'
import { ExportModal } from '@/components/modals/ExportModal'
import { ImportModal } from '@/components/modals/ImportModal'
import { WorldBrowserModal } from '@/components/modals/WorldBrowserModal'

const TOOLS: { id: ActiveTool; icon: typeof MousePointer2; label: string; key: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', key: 'Q' },
  { id: 'translate', icon: Move, label: 'Move', key: 'W' },
  { id: 'rotate', icon: RotateCw, label: 'Rotate', key: 'E' },
  { id: 'scale', icon: Maximize2, label: 'Scale', key: 'R' },
  { id: 'sculpt', icon: Mountain, label: 'Sculpt', key: 'T' },
  { id: 'paint', icon: Paintbrush, label: 'Paint', key: 'P' },
]

const HTML_ELEMENTS = [
  { label: 'Heading', htmlType: 'heading' as const, fontSize: 64, content: 'Your Title Here' },
  { label: 'Paragraph', htmlType: 'paragraph' as const, fontSize: 16, content: 'Your paragraph text here. Edit to add your content.' },
  { label: 'Image', htmlType: 'image' as const, fontSize: 16, content: '' },
  { label: 'Video', htmlType: 'video' as const, fontSize: 16, content: '' },
  { label: 'Button', htmlType: 'button' as const, fontSize: 18, content: 'Click Me' },
  { label: 'Form', htmlType: 'form' as const, fontSize: 16, content: '' },
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
  const addObject = useScene((s) => s.addObject)
  const appMode = useScene((s) => s.appMode)
  const setAppMode = useScene((s) => s.setAppMode)
  const setPreviewMode = useScene((s) => s.setPreviewMode)
  const cameraMode = useScene((s) => s.cameraMode)
  const setCameraMode = useScene((s) => s.setCameraMode)

  const [showTemplates, setShowTemplates] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showWorlds, setShowWorlds] = useState(false)
  const [worldsSaveOpen, setWorldsSaveOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddHtml, setShowAddHtml] = useState(false)

  function loadTemplate(templateId: string) {
    const tpl = WORLD_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    const store = useScene.getState()
    for (const id of [...store.rootIds]) store.removeObject(id)
    for (const cfg of tpl.objects) store.addObject(cfg)
    store.setEnvironment(tpl.environment)
    if (tpl.cameraPath) {
      for (const kp of store.cameraPath) store.removeCameraKeypoint(kp.id)
      for (const kp of tpl.cameraPath) store.addCameraKeypoint(kp)
    }
    if (tpl.appMode) store.setAppMode(tpl.appMode)
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
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.5" stroke="white" strokeWidth="1.2" />
            <ellipse cx="10" cy="10" rx="4.2" ry="8.5" stroke="white" strokeWidth="1.2" />
            <line x1="1.5" y1="10" x2="18.5" y2="10" stroke="white" strokeWidth="1.2" />
            <line x1="10" y1="4" x2="10" y2="16" stroke="white" strokeWidth="1.2" />
          </svg>
          <span className="text-[13px] font-light tracking-widest uppercase" style={{ color: '#f0f0f0' }}>World</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: '#1a1a1a' }} />

        {/* Panel toggles */}
        <div className="flex items-center gap-0.5">
          <ToolBtn icon={PanelLeft} active={panels.leftOpen} onClick={() => togglePanel('left')} title="Left Panel" />
          <ToolBtn icon={PanelRight} active={panels.rightOpen} onClick={() => togglePanel('right')} title="Right Panel" />
          <ToolBtn icon={PanelBottom} active={panels.bottomOpen} onClick={() => togglePanel('bottom')} title="Bottom Panel" />
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1a1a1a' }} />

        {/* AppMode switcher */}
        <div className="flex items-center p-0.5 rounded-lg" style={{ background: '#000', border: '1px solid #1a1a1a' }}>
          <button
            onClick={() => setAppMode('world')}
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[11px] font-medium transition-all"
            style={appMode === 'world'
              ? { background: '#ffffff', color: '#000000' }
              : { background: 'transparent', color: '#555555' }
            }
          >
            <Globe2 size={11} strokeWidth={2} />
            World
          </button>
          <button
            onClick={() => setAppMode('website')}
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[11px] font-medium transition-all"
            style={appMode === 'website'
              ? { background: '#ffffff', color: '#000000' }
              : { background: 'transparent', color: '#555555' }
            }
          >
            <Monitor size={11} strokeWidth={2} />
            Website
          </button>
        </div>

        {/* Preview button — website mode only */}
        {appMode === 'website' && (
          <button
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium transition-colors border"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#aaaaaa', borderColor: '#2a2a2a' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#aaaaaa'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            <Eye size={11} strokeWidth={2} />
            Preview
          </button>
        )}

        <div className="w-px h-5 mx-1" style={{ background: '#1a1a1a' }} />

        {/* Transform tools */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: '#000' }}>
          {TOOLS.map(({ id, icon: Icon, label, key }) => (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={`${label} (${key})`}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-all duration-150"
              style={activeTool === id
                ? { background: 'rgba(255,255,255,0.12)', color: '#ffffff' }
                : { color: '#555555' }
              }
              onMouseEnter={(e) => { if (activeTool !== id) e.currentTarget.style.color = '#f0f0f0' }}
              onMouseLeave={(e) => { if (activeTool !== id) e.currentTarget.style.color = '#555555' }}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1a1a1a' }} />

        {/* Space toggle */}
        <button
          onClick={() => setTransformSpace(transformSpace === 'world' ? 'local' : 'world')}
          title="Toggle Local/World Space (X)"
          className="px-2.5 h-7 rounded-md text-[11px] font-mono font-medium transition-colors border"
          style={{
            background: transformSpace === 'local' ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: transformSpace === 'local' ? '#ffffff' : '#555555',
            borderColor: transformSpace === 'local' ? '#333' : '#1a1a1a',
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
            background: snapEnabled ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: snapEnabled ? '#ffffff' : '#555555',
            borderColor: snapEnabled ? '#333' : '#1a1a1a',
          }}
        >
          <Grid3X3 size={12} strokeWidth={1.75} />
          <span className="hidden md:inline font-medium">Snap</span>
        </button>

        {/* Camera control mode */}
        <div className="flex items-center p-0.5 rounded-lg" style={{ background: '#000', border: '1px solid #1a1a1a' }}>
          <button
            onClick={() => setCameraMode('orbit')}
            title="Orbit Camera (click + drag)"
            className="flex items-center gap-1.5 px-2 h-6 rounded-md text-[10px] font-medium transition-all"
            style={cameraMode === 'orbit'
              ? { background: 'rgba(255,255,255,0.12)', color: '#f0f0f0' }
              : { background: 'transparent', color: '#555555' }
            }
          >
            <RotateCw size={10} strokeWidth={2} />
            Orbit
          </button>
          <button
            onClick={() => setCameraMode('fly')}
            title="Fly Camera (WASD + mouse)"
            className="flex items-center gap-1.5 px-2 h-6 rounded-md text-[10px] font-medium transition-all"
            style={cameraMode === 'fly'
              ? { background: 'rgba(255,255,255,0.12)', color: '#f0f0f0' }
              : { background: 'transparent', color: '#555555' }
            }
          >
            <Navigation size={10} strokeWidth={2} />
            Fly
          </button>
        </div>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <ToolBtn icon={Undo2} disabled={past.length === 0} onClick={undo} title="Undo (Ctrl+Z)" />
          <ToolBtn icon={Redo2} disabled={future.length === 0} onClick={redo} title="Redo (Ctrl+Y)" />
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1a1a1a' }} />

        {/* Add object */}
        <div className="relative">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#f0f0f0', border: '1px solid #2a2a2a' }}
          >
            + Add
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {showAdd && (
            <Dropdown onClose={() => setShowAdd(false)}>
              <div className="text-[10px] uppercase tracking-wider px-2 py-1 mt-1" style={{ color: '#444' }}>Primitives</div>
              {PRIMITIVES.map((p) => (
                <DropdownItem key={p.label} onClick={() => {
                  addObject({ name: p.label, type: 'mesh', geometry: p.geo, transform: { position: [0, p.geo.type === 'plane' ? 0 : 0.5, 0], rotation: [p.geo.type === 'plane' ? -Math.PI / 2 : 0, 0, 0], scale: [1, 1, 1] } })
                  setShowAdd(false)
                }}>{p.label}</DropdownItem>
              ))}
              <div className="w-full h-px my-1" style={{ background: '#1a1a1a' }} />
              <div className="text-[10px] uppercase tracking-wider px-2 py-1" style={{ color: '#444' }}>Special</div>
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
              <div className="w-full h-px my-1" style={{ background: '#1a1a1a' }} />
              <div className="text-[10px] uppercase tracking-wider px-2 py-1" style={{ color: '#444' }}>Environment</div>
              <DropdownItem onClick={() => {
                addObject({ name: 'Terrain', type: 'terrain', geometry: { type: 'plane' }, terrain: { ...DEFAULT_TERRAIN }, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>⛰ Terrain</DropdownItem>
              <DropdownItem onClick={() => {
                addObject({ name: 'Water', type: 'water', geometry: { type: 'plane' }, water: { ...DEFAULT_WATER }, transform: { position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], scale: [1, 1, 1] } })
                setShowAdd(false)
              }}>🌊 Water</DropdownItem>
              <div className="w-full h-px my-1" style={{ background: '#1a1a1a' }} />
              <div className="text-[10px] uppercase tracking-wider px-2 py-1" style={{ color: '#444' }}>Lights</div>
              {LIGHTS.map((l) => (
                <DropdownItem key={l.label} onClick={() => {
                  addObject({ name: l.label, type: 'light', light: { type: l.ltype, intensity: 1, color: '#ffffff', distance: 20, decay: 2, angle: Math.PI / 4, penumbra: 0.1, castShadow: true, ...l.extra }, transform: { position: [0, 5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } })
                  setShowAdd(false)
                }}>{l.label}</DropdownItem>
              ))}
            </Dropdown>
          )}
        </div>

        {/* Add HTML (website mode only) */}
        {appMode === 'website' && (
          <div className="relative">
            <button
              onClick={() => setShowAddHtml((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#aaaaaa', border: '1px solid #2a2a2a' }}
            >
              <Type size={11} strokeWidth={2} />
              HTML
              <ChevronDown size={11} strokeWidth={2} />
            </button>
            {showAddHtml && (
              <Dropdown onClose={() => setShowAddHtml(false)}>
                {HTML_ELEMENTS.map((el) => (
                  <DropdownItem key={el.htmlType} onClick={() => {
                    addObject({
                      name: el.label,
                      type: 'html',
                      geometry: { type: 'box' },
                      htmlConfig: { htmlType: el.htmlType, content: el.content, fontSize: el.fontSize, color: '#ffffff', width: 400 },
                      transform: { position: [0, 2, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
                    })
                    setShowAddHtml(false)
                  }}>{el.label}</DropdownItem>
                ))}
              </Dropdown>
            )}
          </div>
        )}

        {/* Templates */}
        <div className="relative">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors border"
            style={{ color: '#555555', borderColor: '#1a1a1a' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f0f0' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555555' }}
          >
            Templates
            <ChevronDown size={11} strokeWidth={2} />
          </button>
          {showTemplates && (
            <Dropdown onClose={() => setShowTemplates(false)} align="right">
              {(() => {
                const worldTpls = WORLD_TEMPLATES.filter((t) => !t.appMode || t.appMode === 'world')
                const websiteTpls = WORLD_TEMPLATES.filter((t) => t.appMode === 'website')
                const primaryTpls = appMode === 'website' ? websiteTpls : worldTpls
                const secondaryTpls = appMode === 'website' ? worldTpls : websiteTpls
                const secondaryLabel = appMode === 'website' ? '3D World Templates' : 'Website Templates'
                return (
                  <>
                    {primaryTpls.map((t) => (
                      <DropdownItem key={t.id} onClick={() => loadTemplate(t.id)}>
                        <span className="mr-2">{t.icon}</span>{t.name}
                      </DropdownItem>
                    ))}
                    {secondaryTpls.length > 0 && (
                      <>
                        <div style={{ borderTop: '1px solid #1a1c24', margin: '4px 0' }} />
                        <div style={{ color: '#3a3e50', fontSize: 9, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{secondaryLabel}</div>
                        {secondaryTpls.map((t) => (
                          <DropdownItem key={t.id} onClick={() => loadTemplate(t.id)}>
                            <span className="mr-2">{t.icon}</span>{t.name}
                          </DropdownItem>
                        ))}
                      </>
                    )}
                  </>
                )
              })()}
            </Dropdown>
          )}
        </div>

        <div className="w-px h-5 mx-1" style={{ background: '#1a1a1a' }} />

        {/* Stats */}
        <ToolBtn icon={Eye} active={showStats} onClick={() => setShowStats(!showStats)} title="Toggle Stats (F3)" />

        {/* Physics */}
        <button
          onClick={() => setPhysicsEnabled(!physicsEnabled)}
          title="Toggle Physics"
          className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium transition-colors border"
          style={{
            background: physicsEnabled ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: physicsEnabled ? '#ffffff' : '#555555',
            borderColor: physicsEnabled ? '#333' : '#1a1a1a',
          }}
        >
          <Zap size={12} strokeWidth={1.75} />
          <span className="hidden md:inline">Physics</span>
        </button>

        {/* Worlds */}
        <ToolBtn icon={Bookmark} onClick={() => { setWorldsSaveOpen(false); setShowWorlds(true) }} title="World Browser" />

        {/* Import/Export */}
        <ToolBtn icon={Upload} onClick={() => setShowImport(true)} title="Import" />
        <ToolBtn icon={Download} onClick={() => setShowExport(true)} title="Export" />

        <div className="w-px h-5 mx-1" style={{ background: '#1a1a1a' }} />

        {/* Play */}
        <button
          onClick={() => setPlaying(!isPlaying)}
          title={isPlaying ? 'Stop (Space)' : 'Play (Space)'}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold transition-all"
          style={isPlaying
            ? { background: '#333333', color: '#ffffff' }
            : { background: '#ffffff', color: '#000000' }
          }
        >
          {isPlaying ? <Square size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </header>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showWorlds && <WorldBrowserModal onClose={() => setShowWorlds(false)} openSaveForm={worldsSaveOpen} />}
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
        background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: disabled ? '#2a2a2a' : active ? '#ffffff' : '#555555',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.color = '#f0f0f0' }}
      onMouseLeave={(e) => { if (!disabled && !active) e.currentTarget.style.color = '#555555' }}
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
        style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}
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
      style={{ color: '#555555' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#f0f0f0' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555555' }}
    >
      {children}
    </button>
  )
}
