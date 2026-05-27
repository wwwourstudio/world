'use client'

import { useState } from 'react'
import {
  Trash2, Camera, ChevronDown, ChevronRight, Eye, RefreshCw,
  Type, AlignLeft, Quote, Tag, Image, Video,
  LayoutPanelLeft, BarChart2, Minus, Square, MousePointer,
  Navigation, Timer, Sparkles, Download,
} from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { captureCamera } from '@/lib/captureCamera'
import { moveCameraToKeypoint } from '@/lib/cameraJump'

// ─── Element Definitions ──────────────────────────────────────────────────────

const ELEMENTS = [
  { tag: 'heading',   label: 'Heading',    Icon: Type,            content: 'Your Heading' },
  { tag: 'paragraph', label: 'Text',        Icon: AlignLeft,       content: 'Your text here.' },
  { tag: 'quote',     label: 'Quote',       Icon: Quote,           content: 'An inspiring quote.' },
  { tag: 'badge',     label: 'Badge',       Icon: Tag,             content: 'NEW' },
  { tag: 'image',     label: 'Image',       Icon: Image,           content: '' },
  { tag: 'video',     label: 'Video',       Icon: Video,           content: '' },
  { tag: 'card',      label: 'Card',        Icon: LayoutPanelLeft, content: 'Card Title' },
  { tag: 'stat',      label: 'Stat',        Icon: BarChart2,       content: '99%' },
  { tag: 'divider',   label: 'Divider',     Icon: Minus,           content: '' },
  { tag: 'spacer',    label: 'Spacer',      Icon: Square,          content: '' },
  { tag: 'button',    label: 'Button',      Icon: MousePointer,    content: 'Click Me' },
  { tag: 'form',      label: 'Form',        Icon: Navigation,      content: '' },
  { tag: 'countdown', label: 'Timer',       Icon: Timer,           content: '' },
  { tag: 'icontext',  label: 'Icon+Text',   Icon: Sparkles,        content: '✦' },
] as const

type HtmlTag = typeof ELEMENTS[number]['tag']

// ─── Collapsible Section ──────────────────────────────────────────────────────

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
    <div style={{ borderBottom: '1px solid #1a1c24' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 h-7 px-3 transition-colors"
        style={{ background: '#0d0f14' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#12141a' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0d0f14' }}
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function WebsitePanel() {
  const addObject = useScene((s) => s.addObject)
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

  function handleAddElement(tag: HtmlTag, content: string) {
    const el = ELEMENTS.find((e) => e.tag === tag)!
    addObject({
      type: 'html',
      name: el.label,
      geometry: { type: 'box' },
      htmlConfig: { htmlType: tag, content },
    })
    showNotification(`${el.label} added`)
  }

  function handleCaptureKeypoint() {
    if (!captureCamera.fn) { showNotification('Camera not ready', 'error'); return }
    const { position, target, fov } = captureCamera.fn()
    addCameraKeypoint({ label: `Camera ${cameraPath.length + 1}`, position, target, fov, easing: 'ease' })
    showNotification('Keypoint added')
  }

  function handleClearPath() {
    for (const kp of cameraPath) removeCameraKeypoint(kp.id)
    showNotification('Path cleared')
  }

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar flex-1 min-h-0">

      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1a1c24', background: '#0b0c10' }}>
        <div className="text-[11px] font-semibold" style={{ color: '#E8E9F0' }}>Website Builder</div>
        <div className="text-[9px] mt-0.5" style={{ color: '#4a4e60' }}>
          Scroll-driven 3D websites · animated cameras
        </div>
      </div>

      {/* ── Elements Grid ─────────────────────────────────────────────────── */}
      <Section label="Elements">
        <div className="text-[9px] mb-1" style={{ color: '#4a4e60' }}>
          Click to add · position with gizmo
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {ELEMENTS.map(({ tag, label, Icon, content }) => (
            <button
              key={tag}
              onClick={() => handleAddElement(tag, content)}
              title={label}
              className="flex flex-col items-center justify-center gap-0.5 rounded-md transition-colors"
              style={{
                height: 40,
                background: '#0d0f14',
                border: '1px solid #1E2028',
                color: '#7A7E92',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5B6CFF18'
                e.currentTarget.style.borderColor = '#5B6CFF44'
                e.currentTarget.style.color = '#5B6CFF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0d0f14'
                e.currentTarget.style.borderColor = '#1E2028'
                e.currentTarget.style.color = '#7A7E92'
              }}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span className="text-[8px] font-medium truncate w-full text-center px-0.5">{label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Camera Path ───────────────────────────────────────────────────── */}
      <Section label="Camera Path" badge={cameraPath.length > 0 ? cameraPath.length : undefined}>
        {/* Capture + clear */}
        <div className="flex gap-1.5">
          <button
            onClick={handleCaptureKeypoint}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-medium transition-colors"
            style={{ background: '#5B6CFF22', color: '#5B6CFF', border: '1px solid #5B6CFF44' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#5B6CFF33' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#5B6CFF22' }}
          >
            <Camera size={12} strokeWidth={2} />
            Capture Here
          </button>
          {cameraPath.length > 0 && (
            <button
              onClick={handleClearPath}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
              style={{ color: '#7A7E92', border: '1px solid #1E2028' }}
              title="Clear all"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b44' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#1E2028' }}
            >
              <Trash2 size={11} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Orbit notice */}
        {websiteScrollEnabled && (
          <div className="text-[9px] px-2 py-1 rounded" style={{ background: '#5B6CFF11', color: '#5B6CFF', border: '1px solid #5B6CFF22' }}>
            Disable scroll to orbit and capture new positions
          </div>
        )}

        {/* Keypoints list */}
        {cameraPath.length === 0 ? (
          <div className="text-[10px] text-center py-2" style={{ color: '#3a3e50' }}>
            No keypoints yet
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {cameraPath.map((kp, i) => (
              <div key={kp.id} className="flex items-center gap-1" style={{ background: '#0d0f14', border: '1px solid #1E2028', borderRadius: 6, padding: '4px 6px' }}>
                <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: '#5B6CFF22', color: '#5B6CFF' }}>
                  {i + 1}
                </span>
                <input
                  value={kp.label}
                  onChange={(e) => updateCameraKeypoint(kp.id, { label: e.target.value })}
                  className="flex-1 h-5 px-1 rounded text-[10px] outline-none border bg-transparent min-w-0"
                  style={{ color: '#E8E9F0', borderColor: '#1E2028' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#5B6CFF' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2028' }}
                />
                <select
                  value={kp.easing}
                  onChange={(e) => updateCameraKeypoint(kp.id, { easing: e.target.value as 'linear' | 'ease' | 'ease-in' | 'ease-out' })}
                  className="h-5 px-1 rounded text-[9px] outline-none border shrink-0"
                  style={{ background: '#0B0C0F', color: '#7A7E92', borderColor: '#1E2028' }}
                >
                  <option value="linear">Linear</option>
                  <option value="ease">Ease</option>
                  <option value="ease-in">In</option>
                  <option value="ease-out">Out</option>
                </select>
                <button
                  onClick={() => moveCameraToKeypoint(kp)}
                  title="Jump to"
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[9px] shrink-0"
                  style={{ color: '#5B6CFF', border: '1px solid #5B6CFF33' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#5B6CFF22' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  ↗
                </button>
                <button
                  onClick={() => removeCameraKeypoint(kp.id)}
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors shrink-0"
                  style={{ color: '#4a4e60' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4e60' }}
                >
                  <Trash2 size={9} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
        {cameraPath.length >= 2 && (
          <div className="text-[9px]" style={{ color: '#3a3e50' }}>
            {cameraPath.length} keypoints · enable scroll to preview
          </div>
        )}
      </Section>

      {/* ── Scroll Preview ────────────────────────────────────────────────── */}
      <Section label="Scroll Preview">
        {/* Enable toggle */}
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[11px]" style={{ color: '#7A7E92' }}>Enable scroll</span>
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

        {/* Progress slider */}
        <div className="flex items-center gap-2">
          <input
            type="range" min={0} max={1} step={0.001}
            value={scrollProgress}
            onChange={(e) => setScrollProgress(parseFloat(e.target.value))}
            className="flex-1 h-1.5 rounded-full"
            style={{ accentColor: '#5B6CFF' }}
          />
          <span className="text-[10px] font-mono w-8 text-right shrink-0" style={{ color: '#7A7E92' }}>
            {Math.round(scrollProgress * 100)}%
          </span>
          <button
            onClick={() => setScrollProgress(0)}
            title="Reset"
            className="w-5 h-5 flex items-center justify-center rounded transition-colors shrink-0"
            style={{ color: '#4a4e60' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#C8C9D0' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4e60' }}
          >
            <RefreshCw size={9} strokeWidth={2} />
          </button>
        </div>

        {cameraPath.length < 2 && (
          <div className="text-[9px]" style={{ color: '#3a3e50' }}>
            Add ≥2 camera keypoints to animate the scroll.
          </div>
        )}
      </Section>

      {/* ── Preview & Export ──────────────────────────────────────────────── */}
      <Section label="Preview & Export">
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
        <div className="text-[9px]" style={{ color: '#3a3e50' }}>
          Preview: full-screen scroll. Export: standalone HTML file.
        </div>
      </Section>

    </div>
  )
}
