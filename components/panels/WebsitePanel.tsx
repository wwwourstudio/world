'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Trash2, Camera, ChevronDown, ChevronRight,
  Eye, RefreshCw, Type, AlignLeft, MousePointer, Image, Video, Navigation,
  RotateCcw, Download, MapPin, Minus, Tag, LayoutPanelLeft,
  Quote, BarChart2, Timer, Space, Sparkles,
} from 'lucide-react'
import { useScene, type SceneSnapshot } from '@/lib/scene/SceneStore'
import { captureCamera } from '@/lib/captureCamera'
import { moveCameraToKeypoint } from '@/lib/cameraJump'

const ELEMENT_CATEGORIES = [
  {
    label: 'Text',
    elements: [
      { tag: 'heading',   label: 'Heading',   icon: Type,         content: 'Your Heading' },
      { tag: 'paragraph', label: 'Text',       icon: AlignLeft,    content: 'Your paragraph text here.' },
      { tag: 'quote',     label: 'Quote',      icon: Quote,        content: 'An inspiring quote here.' },
      { tag: 'badge',     label: 'Badge',      icon: Tag,          content: 'NEW' },
    ],
  },
  {
    label: 'Media',
    elements: [
      { tag: 'image',  label: 'Image', icon: Image, content: '' },
      { tag: 'video',  label: 'Video', icon: Video, content: '' },
    ],
  },
  {
    label: 'Layout',
    elements: [
      { tag: 'card',    label: 'Card',    icon: LayoutPanelLeft, content: 'Card Title' },
      { tag: 'stat',    label: 'Stat',    icon: BarChart2,        content: '99%' },
      { tag: 'divider', label: 'Divider', icon: Minus,            content: '' },
      { tag: 'spacer',  label: 'Spacer',  icon: Space,            content: '' },
    ],
  },
  {
    label: 'Action',
    elements: [
      { tag: 'button',    label: 'Button',     icon: MousePointer, content: 'Click Me' },
      { tag: 'form',      label: 'Nav',        icon: Navigation,   content: 'Nav' },
      { tag: 'countdown', label: 'Countdown',  icon: Timer,        content: '' },
      { tag: 'icontext',  label: 'Icon+Text',  icon: Sparkles,     content: '✦' },
    ],
  },
] as const

type HtmlTag = 'heading' | 'paragraph' | 'image' | 'video' | 'button' | 'form' | 'divider' | 'badge' | 'card' | 'quote' | 'stat' | 'countdown' | 'spacer' | 'icontext'

const EFFECT_COLORS: Record<string, string> = {
  fadeIn: '#5B6CFF', slideUp: '#4ade80', slideDown: '#4ade80',
  slideLeft: '#f59e0b', slideRight: '#f59e0b', scaleIn: '#f87171', scaleOut: '#f87171',
}

function Section({
  label, children, defaultOpen = true, badge,
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string | number
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #1E2028' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 h-7 px-3 transition-colors"
        style={{ background: '#0d0f14' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#12141a' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#0d0f14' }}
      >
        <span className="flex-1 text-left text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#5B6CFF' }}>
          {label}
        </span>
        {badge !== undefined && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: '#5B6CFF22', color: '#5B6CFF' }}>
            {badge}
          </span>
        )}
        {open
          ? <ChevronDown size={10} style={{ color: '#3a3e50' }} />
          : <ChevronRight size={10} style={{ color: '#3a3e50' }} />}
      </button>
      {open && <div className="px-3 py-2.5 flex flex-col gap-2">{children}</div>}
    </div>
  )
}

export function WebsitePanel() {
  const addObject = useScene((s) => s.addObject)
  const scenes = useScene((s) => s.scenes)
  const objects = useScene((s) => s.objects)
  const cameraPath = useScene((s) => s.cameraPath)
  const addCameraKeypoint = useScene((s) => s.addCameraKeypoint)
  const updateCameraKeypoint = useScene((s) => s.updateCameraKeypoint)
  const removeCameraKeypoint = useScene((s) => s.removeCameraKeypoint)
  const scrollProgress = useScene((s) => s.scrollProgress)
  const setScrollProgress = useScene((s) => s.setScrollProgress)
  const websiteScrollEnabled = useScene((s) => s.websiteScrollEnabled)
  const setWebsiteScrollEnabled = useScene((s) => s.setWebsiteScrollEnabled)
  const setPreviewMode = useScene((s) => s.setPreviewMode)
  const showNotification = useScene((s) => s.showNotification)

  const timelineRef = useRef<HTMLDivElement>(null)
  const [draggingTimeline, setDraggingTimeline] = useState(false)

  const htmlObjects = Object.values(objects).filter(
    (o) => o.type === 'html' && o.scrollAnim && o.scrollAnim.effect !== 'none'
  )

  const updateTimelineProgress = useCallback((clientX: number) => {
    const el = timelineRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setScrollProgress(progress)
  }, [setScrollProgress])

  function handleCaptureKeypoint() {
    if (!captureCamera.fn) {
      showNotification('Camera not ready', 'error')
      return
    }
    const { position, target, fov } = captureCamera.fn()
    addCameraKeypoint({
      label: `Camera ${cameraPath.length + 1}`,
      position,
      target,
      fov,
      easing: 'ease',
    })
    showNotification('Camera keypoint added')
  }

  function handleUpdateKeypoint(id: string) {
    if (!captureCamera.fn) {
      showNotification('Camera not ready', 'error')
      return
    }
    const { position, target, fov } = captureCamera.fn()
    updateCameraKeypoint(id, { position, target, fov })
    showNotification('Keypoint updated')
  }

  function handleClearPath() {
    for (const kp of cameraPath) removeCameraKeypoint(kp.id)
    showNotification('Camera path cleared')
  }

  function addHtmlElement(tag: HtmlTag, content: string) {
    addObject({
      type: 'html',
      name: tag.charAt(0).toUpperCase() + tag.slice(1),
      htmlConfig: { htmlType: tag, content },
    })
  }

  const orbitFree = !websiteScrollEnabled

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar flex-1">
      {/* Header */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid #1E2028', background: '#0b0c10' }}>
        <div className="text-[11px] font-semibold" style={{ color: '#E8E9F0' }}>Website Builder</div>
        <div className="text-[10px] mt-0.5" style={{ color: '#7A7E92' }}>
          Scroll-driven 3D websites with animated cameras
        </div>
      </div>

      {/* Orbit Status Banner */}
      <div
        className="mx-3 mt-2.5 mb-1 flex items-center gap-2 px-2.5 py-2 rounded-lg"
        style={{
          background: orbitFree ? '#0d1a0d' : '#1a1020',
          border: `1px solid ${orbitFree ? '#1a3a1a' : '#2a1840'}`,
        }}
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: orbitFree ? '#4ade80' : '#a78bfa' }} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold" style={{ color: orbitFree ? '#4ade80' : '#a78bfa' }}>
            {orbitFree ? 'Orbit free — edit mode' : 'Scroll controls camera'}
          </span>
          <span className="text-[9px]" style={{ color: '#5a5e72' }}>
            {orbitFree ? 'Drag viewport to orbit → capture keypoints' : 'Disable scroll below to orbit the camera'}
          </span>
        </div>
      </div>

      {/* Elements — categorized */}
      <Section label="Elements">
        <div className="flex flex-col gap-3">
          {ELEMENT_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className="text-[9px] font-semibold uppercase tracking-widest mb-1.5 px-0.5" style={{ color: '#3a3e50' }}>
                {cat.label}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {cat.elements.map(({ tag, label, icon: Icon, content }) => (
                  <button
                    key={tag}
                    onClick={() => addHtmlElement(tag as HtmlTag, content)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg text-[9px] font-medium transition-all"
                    style={{ background: '#1E2028', border: '1px solid #2a2d40', color: '#7A7E92' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#5B6CFF'; (e.currentTarget as HTMLElement).style.color = '#E8E9F0' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2d40'; (e.currentTarget as HTMLElement).style.color = '#7A7E92' }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[9px]" style={{ color: '#3a3e50' }}>Click to add · select to position with gizmo</p>
      </Section>

      {/* Camera Path */}
      <Section label="Camera Path" badge={cameraPath.length || undefined}>
        {!orbitFree && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md" style={{ background: '#1a1020', border: '1px solid #2a1840' }}>
            <span className="text-[9px]" style={{ color: '#a78bfa' }}>
              Turn off scroll in "Scroll Preview" to orbit and capture new positions
            </span>
          </div>
        )}

        <div className="flex gap-1.5">
          <button
            onClick={handleCaptureKeypoint}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: orbitFree ? '#5B6CFF22' : '#1E2028',
              color: orbitFree ? '#5B6CFF' : '#4a4e60',
              border: `1px solid ${orbitFree ? '#5B6CFF44' : '#2a2d40'}`,
            }}
            onMouseEnter={(e) => { if (orbitFree) e.currentTarget.style.background = '#5B6CFF33' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = orbitFree ? '#5B6CFF22' : '#1E2028' }}
          >
            <Camera size={12} strokeWidth={2} />
            Capture Camera Here
          </button>
          {cameraPath.length > 0 && (
            <button
              onClick={handleClearPath}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
              style={{ color: '#7A7E92', border: '1px solid #1E2028' }}
              title="Clear all keypoints"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b44' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#1E2028' }}
            >
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {cameraPath.length === 0 ? (
          <div className="text-[11px] text-center py-3" style={{ color: '#4a4e60' }}>
            No keypoints yet. Orbit to a position and click "Capture Camera Here".
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {cameraPath.map((kp, i) => (
              <div key={kp.id} className="flex flex-col gap-1.5 px-2 py-2 rounded-md" style={{ background: '#0d0f14', border: '1px solid #1E2028' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: '#5B6CFF22', color: '#5B6CFF' }}>
                    {i + 1}
                  </span>
                  <input
                    value={kp.label}
                    onChange={(e) => updateCameraKeypoint(kp.id, { label: e.target.value })}
                    className="flex-1 h-5 px-1.5 rounded text-[11px] outline-none border bg-transparent min-w-0"
                    style={{ color: '#E8E9F0', borderColor: '#1E2028' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#5B6CFF' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2028' }}
                  />
                  <select
                    value={kp.easing}
                    onChange={(e) => updateCameraKeypoint(kp.id, { easing: e.target.value as 'linear' | 'ease' | 'ease-in' | 'ease-out' })}
                    className="h-5 px-1 rounded text-[10px] outline-none border"
                    style={{ background: '#0B0C0F', color: '#7A7E92', borderColor: '#1E2028' }}
                  >
                    <option value="linear">Linear</option>
                    <option value="ease">Ease</option>
                    <option value="ease-in">Ease In</option>
                    <option value="ease-out">Ease Out</option>
                  </select>
                  <button
                    onClick={() => removeCameraKeypoint(kp.id)}
                    className="w-5 h-5 flex items-center justify-center rounded transition-colors shrink-0"
                    style={{ color: '#4a4e60' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4e60' }}
                  >
                    <Trash2 size={10} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pl-6">
                  {scenes.length > 1 && (
                    <select
                      value={kp.sceneId ?? ''}
                      onChange={(e) => updateCameraKeypoint(kp.id, { sceneId: e.target.value || undefined })}
                      className="flex-1 h-5 px-1 rounded text-[10px] outline-none border"
                      style={{ background: '#0B0C0F', color: '#7A7E92', borderColor: '#1E2028' }}
                    >
                      <option value="">No scene switch</option>
                      {scenes.map((sc: SceneSnapshot) => (
                        <option key={sc.id} value={sc.id}>{sc.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-1 ml-auto">
                    <button
                      onClick={() => moveCameraToKeypoint(kp)}
                      className="flex items-center gap-1 px-2 h-5 rounded text-[9px] font-medium transition-colors"
                      style={{ background: '#5B6CFF15', color: '#5B6CFF', border: '1px solid #5B6CFF33' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#5B6CFF33' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#5B6CFF15' }}
                    >
                      <MapPin size={9} /> Jump
                    </button>
                    <button
                      onClick={() => handleUpdateKeypoint(kp.id)}
                      className="flex items-center gap-1 px-2 h-5 rounded text-[9px] font-medium transition-colors"
                      style={{ background: '#1E2028', color: '#7A7E92', border: '1px solid #2a2d40' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.borderColor = '#5a5e72' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#2a2d40' }}
                    >
                      <RotateCcw size={9} /> Update
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cameraPath.length >= 2 && (
          <div className="text-[10px]" style={{ color: '#4a4e60' }}>
            {cameraPath.length} keypoints — enable scroll below to preview the path
          </div>
        )}
      </Section>

      {/* Scroll Preview */}
      <Section label="Scroll Preview">
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: '#7A7E92' }}>Enable scroll</span>
          <div className="flex-1" />
          <button
            onClick={() => setWebsiteScrollEnabled(!websiteScrollEnabled)}
            className="relative w-9 h-5 rounded-full transition-colors shrink-0"
            style={{ background: websiteScrollEnabled ? '#5B6CFF' : '#1E2028' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: websiteScrollEnabled ? '17px' : '2px' }}
            />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: '#7A7E92' }}>Scroll position</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono" style={{ color: '#E8E9F0' }}>
                {Math.round(scrollProgress * 100)}%
              </span>
              <button
                onClick={() => setScrollProgress(0)}
                className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                style={{ color: '#4a4e60' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4e60' }}
              >
                <RefreshCw size={10} strokeWidth={2} />
              </button>
            </div>
          </div>
          <input
            type="range" min={0} max={1} step={0.001}
            value={scrollProgress}
            onChange={(e) => setScrollProgress(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full"
            style={{ accentColor: '#5B6CFF' }}
          />
        </div>

        {cameraPath.length < 2 && (
          <div className="text-[10px]" style={{ color: '#4a4e60' }}>
            Add at least 2 camera keypoints to animate the scroll.
          </div>
        )}
      </Section>

      {/* Scroll Timeline */}
      {(cameraPath.length > 0 || htmlObjects.length > 0) && (
        <Section label="Timeline" defaultOpen={true}>
          <div className="text-[9px] mb-1.5" style={{ color: '#4a4e60' }}>
            Camera keypoints · drag to scrub scroll position
          </div>
          {/* Main timeline bar */}
          <div
            ref={timelineRef}
            className="relative rounded-md overflow-hidden select-none"
            style={{ height: 28, background: '#0d0f14', border: '1px solid #1E2028', cursor: 'ew-resize' }}
            onMouseDown={(e) => {
              setDraggingTimeline(true)
              updateTimelineProgress(e.clientX)
            }}
            onMouseMove={(e) => { if (draggingTimeline) updateTimelineProgress(e.clientX) }}
            onMouseUp={() => setDraggingTimeline(false)}
            onMouseLeave={() => setDraggingTimeline(false)}
          >
            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 pointer-events-none"
              style={{ width: `${scrollProgress * 100}%`, background: 'rgba(91,108,255,0.15)' }}
            />
            {/* Keypoint ticks */}
            {cameraPath.map((kp, i) => {
              const pos = cameraPath.length <= 1 ? 0 : i / (cameraPath.length - 1)
              return (
                <div
                  key={kp.id}
                  className="absolute top-0 bottom-0 w-px pointer-events-none"
                  style={{ left: `${pos * 100}%`, background: '#5B6CFF88' }}
                >
                  <div
                    className="absolute -top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ background: '#5B6CFF', color: '#fff', top: 6 }}
                  >
                    {i + 1}
                  </div>
                </div>
              )
            })}
            {/* Scroll cursor line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
              style={{ left: `${scrollProgress * 100}%`, background: '#ffffff88', transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Element animation bars */}
          {htmlObjects.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1">
              {htmlObjects.map((obj) => {
                const sa = obj.scrollAnim!
                const color = EFFECT_COLORS[sa.effect] ?? '#5B6CFF'
                const exitPct = sa.exit > 0 ? sa.exit * 100 : 100
                return (
                  <div key={obj.id} className="relative h-4 rounded overflow-hidden" style={{ background: '#0d0f14' }}>
                    <div
                      className="absolute inset-y-0 rounded text-[8px] flex items-center px-1.5 font-medium truncate"
                      style={{
                        left: `${sa.enter * 100}%`,
                        width: `${exitPct - sa.enter * 100}%`,
                        background: `${color}33`,
                        color,
                        border: `1px solid ${color}44`,
                        minWidth: 4,
                      }}
                    >
                      {obj.name}
                    </div>
                  </div>
                )
              })}
              <div className="text-[9px] mt-0.5" style={{ color: '#3a3e50' }}>
                Element scroll animations (set in Properties → Scroll Animation)
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Preview & Export */}
      <Section label="Preview & Export">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setPreviewMode(true)}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: '#ffffff', color: '#000000' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e0e0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
          >
            <Eye size={13} strokeWidth={2} />
            Enter Preview
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-export-modal', { detail: 'website' }))}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: '#1E2028', color: '#C8C9D0', border: '1px solid #2a2d40' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2d40' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1E2028' }}
          >
            <Download size={13} strokeWidth={2} />
            Export HTML
          </button>
        </div>
        <div className="text-[10px]" style={{ color: '#4a4e60' }}>
          Preview: full-screen scroll experience. Export: standalone HTML file.
        </div>
      </Section>
    </div>
  )
}
