'use client'

import { useState } from 'react'
import { Plus, Trash2, Camera, ChevronDown, ChevronRight, Eye, RefreshCw } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { captureCamera } from '@/lib/captureCamera'

function Section({ label, children, defaultOpen = true }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #1E2028' }}>
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
        {open ? <ChevronDown size={10} style={{ color: '#3a3e50' }} /> : <ChevronRight size={10} style={{ color: '#3a3e50' }} />}
      </button>
      {open && <div className="px-3 py-2.5 flex flex-col gap-2">{children}</div>}
    </div>
  )
}

export function WebsitePanel() {
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

  function handleClearPath() {
    for (const kp of cameraPath) removeCameraKeypoint(kp.id)
    showNotification('Camera path cleared')
  }

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar flex-1">
      {/* Header */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid #1E2028', background: '#0b0c10' }}>
        <div className="text-[11px] font-semibold" style={{ color: '#E8E9F0' }}>Website Mode</div>
        <div className="text-[10px] mt-0.5" style={{ color: '#7A7E92' }}>
          Build scroll-driven 3D websites with animated camera paths
        </div>
      </div>

      {/* Camera Path */}
      <Section label="Camera Path">
        <div className="flex gap-1.5">
          <button
            onClick={handleCaptureKeypoint}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-medium transition-colors"
            style={{ background: '#5B6CFF22', color: '#5B6CFF', border: '1px solid #5B6CFF44' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#5B6CFF33' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#5B6CFF22' }}
          >
            <Camera size={12} strokeWidth={2} />
            Capture Camera Here
          </button>
          {cameraPath.length > 0 && (
            <button
              onClick={handleClearPath}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
              style={{ color: '#7A7E92', border: '1px solid #1E2028' }}
              title="Clear path"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b44' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.borderColor = '#1E2028' }}
            >
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {cameraPath.length === 0 ? (
          <div className="text-[11px] text-center py-3" style={{ color: '#4a4e60' }}>
            No keypoints yet. Orbit to a camera position and click "Capture Camera Here".
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {cameraPath.map((kp, i) => (
              <div
                key={kp.id}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                style={{ background: '#0d0f14', border: '1px solid #1E2028' }}
              >
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: '#5B6CFF22', color: '#5B6CFF' }}
                >
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
            ))}
          </div>
        )}

        {cameraPath.length >= 2 && (
          <div className="text-[10px]" style={{ color: '#4a4e60' }}>
            {cameraPath.length} keypoints · Enable scroll below to preview
          </div>
        )}
      </Section>

      {/* Scroll Controls */}
      <Section label="Scroll">
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
                title="Reset to start"
                onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4e60' }}
              >
                <RefreshCw size={10} strokeWidth={2} />
              </button>
            </div>
          </div>
          <input
            type="range"
            min={0} max={1} step={0.001}
            value={scrollProgress}
            onChange={(e) => setScrollProgress(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full"
            style={{ accentColor: '#5B6CFF' }}
          />
        </div>

        {cameraPath.length < 2 && (
          <div className="text-[10px]" style={{ color: '#4a4e60' }}>
            Add at least 2 camera keypoints to enable scroll animation.
          </div>
        )}
      </Section>

      {/* Preview */}
      <Section label="Preview">
        <div className="text-[11px] mb-2" style={{ color: '#7A7E92' }}>
          Preview your website as visitors will see it — full screen with scroll navigation.
        </div>
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
      </Section>

      {/* Tips */}
      <Section label="How to use" defaultOpen={false}>
        <div className="flex flex-col gap-2 text-[11px]" style={{ color: '#7A7E92' }}>
          <div className="flex gap-2">
            <span style={{ color: '#5B6CFF' }}>1.</span>
            <span>Add HTML elements via the HTML button in the toolbar — position them in 3D space.</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: '#5B6CFF' }}>2.</span>
            <span>Orbit your camera to a starting position and click "Capture Camera Here".</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: '#5B6CFF' }}>3.</span>
            <span>Move camera to different viewpoints and add more keypoints to build the path.</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: '#5B6CFF' }}>4.</span>
            <span>Enable scroll and drag the scrubber to preview the journey. Click "Enter Preview" for full-screen.</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
