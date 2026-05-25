'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, Component, type ReactNode } from 'react'
import { useScene, loadPersistedScene } from '@/lib/scene/SceneStore'
import { MainToolbar } from '@/components/toolbar/MainToolbar'
import { OutlinerPanel } from '@/components/panels/OutlinerPanel'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { MaterialEditor } from '@/components/panels/MaterialEditor'
import { ChatPanel } from '@/components/panels/ChatPanel'
import { AssetBrowser } from '@/components/panels/AssetBrowser'
import { AnimationTimeline } from '@/components/panels/AnimationTimeline'
import { PhysicsPanel } from '@/components/panels/PhysicsPanel'
import { SceneSwitcher } from '@/components/panels/SceneSwitcher'
import { LightingPanel } from '@/components/panels/LightingPanel'
import { ViewportOverlay } from '@/components/viewport/ViewportOverlay'
import type { ActiveTool } from '@/lib/scene/SceneStore'
import { CheckCircle2, AlertCircle, Info, Layers, Palette, Sun, Globe2 } from 'lucide-react'
import { cameraFrameFn } from '@/lib/cameraFrame'
import { WebsitePanel } from '@/components/panels/WebsitePanel'

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: '#0B0C0F' }}>
          <span style={{ color: '#f87171', fontSize: 12 }}>3D viewport failed to load</span>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-3 py-1.5 rounded-lg text-[11px]"
            style={{ background: '#1E2028', color: '#E8E9F0' }}
          >Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

const ViewportCanvas = dynamic(
  () => import('@/components/viewport/ViewportCanvas').then((m) => m.ViewportCanvas),
  { ssr: false, loading: () => <div className="w-full h-full" style={{ background: '#0B0C0F' }} /> }
)

function BakeOverlay() {
  const bakePreviewUrl = useScene((s) => s.bakePreviewUrl)
  const bakeBlend = useScene((s) => s.bakeBlend)
  if (!bakePreviewUrl) return null
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 40 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bakePreviewUrl}
        alt=""
        className="w-full h-full object-cover"
        style={{ opacity: bakeBlend }}
      />
    </div>
  )
}

function Notification() {
  const notification = useScene((s) => s.notification)
  if (!notification) return null
  const Icon = notification.type === 'error' ? AlertCircle : notification.type === 'info' ? Info : CheckCircle2
  const colors = {
    success: { bg: '#0d1a0d', border: '#1a3a1a', text: '#4ade80', icon: '#4ade80' },
    error: { bg: '#1a0808', border: '#3a1515', text: '#f87171', icon: '#f87171' },
    info: { bg: '#0d0f1a', border: '#1a1f3a', text: '#60a5fa', icon: '#60a5fa' },
  }[notification.type]

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none anim-fade-in">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md border shadow-xl"
        style={{ background: colors.bg, borderColor: colors.border }}>
        <Icon size={13} style={{ color: colors.icon }} strokeWidth={2} />
        <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: colors.text }}>
          {notification.message}
        </span>
      </div>
    </div>
  )
}

export default function WorldBuilderPage() {
  const panels = useScene((s) => s.panels)
  const setActiveTool = useScene((s) => s.setActiveTool)
  const setSnapEnabled = useScene((s) => s.setSnapEnabled)
  const snapEnabled = useScene((s) => s.snapEnabled)
  const setShowStats = useScene((s) => s.setShowStats)
  const showStats = useScene((s) => s.showStats)
  const selectedIds = useScene((s) => s.selectedIds)
  const removeObject = useScene((s) => s.removeObject)
  const duplicateObject = useScene((s) => s.duplicateObject)
  const deselectAll = useScene((s) => s.deselectAll)
  const selectAll = useScene((s) => s.selectAll)
  const undo = useScene((s) => s.undo)
  const redo = useScene((s) => s.redo)
  const togglePanel = useScene((s) => s.togglePanel)
  const setTransformSpace = useScene((s) => s.setTransformSpace)
  const transformSpace = useScene((s) => s.transformSpace)
  const isPlaying = useScene((s) => s.isPlaying)
  const setPlaying = useScene((s) => s.setPlaying)
  const objects = useScene((s) => s.objects)
  const addKeyframe = useScene((s) => s.addKeyframe)
  const playhead = useScene((s) => s.playhead)
  const cameraMode = useScene((s) => s.cameraMode)
  const appMode = useScene((s) => s.appMode)
  const isPreviewMode = useScene((s) => s.isPreviewMode)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    loadPersistedScene()
  }, [])

  useEffect(() => {
    if (appMode === 'website') {
      useScene.getState().setPanelTab('left', 'website')
    } else {
      const current = useScene.getState().panels.leftTab
      if (current === 'website') useScene.getState().setPanelTab('left', 'outliner')
    }
  }, [appMode])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const key = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey

      const TOOL_MAP: Record<string, ActiveTool> = { q: 'select', w: 'translate', e: 'rotate', r: 'scale', t: 'sculpt' }
      if (!ctrl && TOOL_MAP[key]) {
        if (cameraMode === 'fly') return
        e.preventDefault()
        setActiveTool(TOOL_MAP[key])
        return
      }

      if (ctrl && key === 'z') { e.preventDefault(); undo(); return }
      if (ctrl && key === 'y') { e.preventDefault(); redo(); return }
      if (ctrl && key === 'd') {
        e.preventDefault()
        for (const id of selectedIds) duplicateObject(id)
        return
      }
      if (ctrl && key === 'a') { e.preventDefault(); selectAll(); return }

      if (key === 'delete' || key === 'backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault()
          for (const id of [...selectedIds]) removeObject(id)
        }
        return
      }

      if (key === 'escape') { deselectAll(); return }
      if (key === 'f' && selectedIds.length > 0) {
        e.preventDefault()
        const obj = objects[selectedIds[0]]
        if (obj) cameraFrameFn.current?.(obj.transform.position)
        return
      }
      if (key === 'k' && selectedIds[0]) { e.preventDefault(); addKeyframe(selectedIds[0], playhead); return }
      if (key === 'g') { e.preventDefault(); setSnapEnabled(!snapEnabled); return }
      if (key === 'x') { e.preventDefault(); setTransformSpace(transformSpace === 'world' ? 'local' : 'world'); return }
      if (key === 'f3') { e.preventDefault(); setShowStats(!showStats); return }
      if (key === ' ') { e.preventDefault(); setPlaying(!isPlaying); return }

      if (key === '1') togglePanel('left')
      if (key === '2') togglePanel('right')
      if (key === '3') togglePanel('bottom')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, objects, snapEnabled, showStats, transformSpace, isPlaying, cameraMode, addKeyframe, playhead, undo, redo, setActiveTool, setSnapEnabled, setShowStats, setTransformSpace, setPlaying, removeObject, duplicateObject, deselectAll, selectAll, togglePanel])

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: '#0B0C0F', color: '#E8E9F0' }}>
      {!isPreviewMode && <MainToolbar />}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left panel — hidden in preview mode */}
        {panels.leftOpen && !isPreviewMode && (
          <div className="flex flex-col w-64 shrink-0 overflow-hidden" style={{ borderRight: '1px solid #1E2028' }}>
            {/* Tab bar */}
            <div className="flex h-9 shrink-0" style={{ borderBottom: '1px solid #1E2028', background: '#0d0f14' }}>
              {([
                { id: 'outliner', label: 'Scene', icon: <Layers size={12} strokeWidth={1.75} /> },
                { id: 'material', label: 'Material', icon: <Palette size={12} strokeWidth={1.75} /> },
                { id: 'lighting', label: 'Lighting', icon: <Sun size={12} strokeWidth={1.75} /> },
                ...(appMode === 'website' ? [{ id: 'website', label: 'Website', icon: <Globe2 size={12} strokeWidth={1.75} /> }] : []),
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => useScene.getState().setPanelTab('left', t.id as never)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium capitalize transition-colors"
                  style={{
                    color: panels.leftTab === t.id ? '#E8E9F0' : '#7A7E92',
                    borderBottom: panels.leftTab === t.id ? '2px solid #5B6CFF' : '2px solid transparent',
                    background: panels.leftTab === t.id ? '#5B6CFF10' : 'transparent',
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {panels.leftTab === 'outliner' ? (
                <>
                  <div style={{ flex: '0 0 auto', maxHeight: '50%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <OutlinerPanel />
                  </div>
                  <div className="w-full h-px" style={{ background: '#1E2028' }} />
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <PropertiesPanel />
                  </div>
                </>
              ) : panels.leftTab === 'material' ? (
                <MaterialEditor />
              ) : panels.leftTab === 'website' ? (
                <WebsitePanel />
              ) : (
                <LightingPanel />
              )}
            </div>
          </div>
        )}

        {/* Viewport */}
        <div className="flex-1 relative overflow-hidden">
          <CanvasErrorBoundary>
            <ViewportCanvas />
          </CanvasErrorBoundary>
          <ViewportOverlay />
        </div>

        {/* Right panel — hidden in preview mode */}
        {panels.rightOpen && !isPreviewMode && (
          <div className="flex flex-col w-80 shrink-0 overflow-hidden" style={{ borderLeft: '1px solid #1E2028' }}>
            {/* Tab bar */}
            <div className="flex h-9 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
              {(['chat', 'assets'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => useScene.getState().setPanelTab('right', t)}
                  className="flex-1 text-[11px] font-medium capitalize transition-colors"
                  style={{
                    color: panels.rightTab === t ? '#E8E9F0' : '#7A7E92',
                    borderBottom: panels.rightTab === t ? '2px solid #5B6CFF' : '2px solid transparent',
                  }}
                >
                  {t === 'chat' ? 'AI Chat' : 'Assets & FX'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {panels.rightTab === 'chat' ? <ChatPanel /> : <AssetBrowser />}
            </div>
          </div>
        )}
      </div>

      {!isPreviewMode && <SceneSwitcher />}

      {/* Bottom panel — hidden in preview mode */}
      {panels.bottomOpen && !isPreviewMode && (
        <div className="shrink-0 h-56 overflow-hidden">
          <div className="flex h-9 shrink-0" style={{ borderTop: '1px solid #1E2028', borderBottom: '1px solid #1E2028', background: '#111318' }}>
            {(['animation', 'physics'] as const).map((t) => (
              <button
                key={t}
                onClick={() => useScene.getState().setPanelTab('bottom', t)}
                className="px-5 text-[11px] font-medium capitalize transition-colors"
                style={{
                  color: panels.bottomTab === t ? '#E8E9F0' : '#7A7E92',
                  borderBottom: panels.bottomTab === t ? '2px solid #5B6CFF' : '2px solid transparent',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="h-[calc(100%-36px)] overflow-hidden" style={{ background: '#111318' }}>
            {panels.bottomTab === 'animation' ? <AnimationTimeline /> : <PhysicsPanel />}
          </div>
        </div>
      )}

      <BakeOverlay />
      <Notification />
    </div>
  )
}
