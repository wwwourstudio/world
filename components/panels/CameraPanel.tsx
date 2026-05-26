'use client'

import { useScene, type ViewMode } from '@/lib/scene/SceneStore'
import { moveCameraToKeypoint } from '@/lib/cameraJump'
import {
  Monitor, ArrowUp, Columns2, Square,
  ArrowDown, ArrowLeft, LayoutGrid, ZoomIn,
} from 'lucide-react'

const VIEW_PRESETS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'persp',  label: 'Persp',  icon: <Monitor size={13} /> },
  { id: 'top',    label: 'Top',    icon: <ArrowUp size={13} /> },
  { id: 'front',  label: 'Front',  icon: <Square size={13} /> },
  { id: 'right',  label: 'Right',  icon: <Columns2 size={13} /> },
  { id: 'left',   label: 'Left',   icon: <ArrowLeft size={13} /> },
  { id: 'bottom', label: 'Bottom', icon: <ArrowDown size={13} /> },
  { id: 'iso',    label: 'Iso',    icon: <LayoutGrid size={13} /> },
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="text-[11px] shrink-0 w-20" style={{ color: '#7A7E92' }}>{label}</span>
      <div className="flex-1 flex items-center gap-2">{children}</div>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#5B6CFF' }}>{title}</span>
    </div>
  )
}

export function CameraPanel() {
  const viewMode = useScene((s) => s.viewMode)
  const setViewMode = useScene((s) => s.setViewMode)
  const cameraFov = useScene((s) => s.cameraFov)
  const setCameraFov = useScene((s) => s.setCameraFov)
  const orthoZoom = useScene((s) => s.orthoZoom)
  const setOrthoZoom = useScene((s) => s.setOrthoZoom)
  const cameraPath = useScene((s) => s.cameraPath)
  const appMode = useScene((s) => s.appMode)
  const objects = useScene((s) => s.objects)

  const isPersp = viewMode === 'persp'

  function fitScene() {
    const objs = Object.values(objects)
    if (objs.length === 0) { setOrthoZoom(10); return }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const o of objs) {
      const [x, , z] = o.transform.position
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z)
    }
    const span = Math.max(maxX - minX, maxZ - minZ, 4) / 2 + 4
    setOrthoZoom(span)
  }

  return (
    <div className="flex flex-col overflow-y-auto flex-1" style={{ color: '#E8E9F0' }}>
      <Section title="View Preset" />
      <div className="grid grid-cols-2 gap-1 px-3 pb-2">
        {VIEW_PRESETS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: viewMode === id ? '#5B6CFF22' : '#1E2028',
              border: `1px solid ${viewMode === id ? '#5B6CFF' : '#2a2d40'}`,
              color: viewMode === id ? '#5B6CFF' : '#7A7E92',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="mx-3 h-px" style={{ background: '#1E2028' }} />

      {isPersp ? (
        <>
          <Section title="Perspective" />
          <Row label="FOV">
            <input
              type="range" min={20} max={120} step={1}
              value={cameraFov}
              onChange={(e) => setCameraFov(parseInt(e.target.value))}
              className="flex-1 h-1" style={{ accentColor: '#5B6CFF' }}
            />
            <span className="text-[11px] w-8 text-right font-mono" style={{ color: '#7A7E92' }}>{cameraFov}°</span>
          </Row>
        </>
      ) : (
        <>
          <Section title="Orthographic" />
          <Row label="Zoom">
            <input
              type="range" min={1} max={100} step={0.5}
              value={orthoZoom}
              onChange={(e) => setOrthoZoom(parseFloat(e.target.value))}
              className="flex-1 h-1" style={{ accentColor: '#5B6CFF' }}
            />
            <span className="text-[11px] w-8 text-right font-mono" style={{ color: '#7A7E92' }}>{orthoZoom.toFixed(1)}</span>
          </Row>
          <div className="px-3 pb-2">
            <button
              onClick={fitScene}
              className="w-full py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: '#1E2028', color: '#7A7E92', border: '1px solid #2a2d40' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#7A7E92' }}
            >
              <ZoomIn size={12} /> Fit Scene
            </button>
          </div>
        </>
      )}

      {appMode === 'website' && cameraPath.length > 0 && (
        <>
          <div className="mx-3 h-px" style={{ background: '#1E2028' }} />
          <Section title="Camera Keypoints" />
          <div className="flex flex-col gap-1 px-3 pb-3">
            {cameraPath.map((kp, i) => (
              <div
                key={kp.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ background: '#1E2028', border: '1px solid #2a2d40' }}
              >
                <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ background: '#5B6CFF22', color: '#5B6CFF' }}>
                  {i + 1}
                </span>
                <span className="flex-1 text-[11px] truncate" style={{ color: '#C8C9D0' }}>{kp.label || `Camera ${i + 1}`}</span>
                <button
                  onClick={() => moveCameraToKeypoint(kp)}
                  className="text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{ background: '#5B6CFF22', color: '#5B6CFF', border: '1px solid #5B6CFF44' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#5B6CFF44' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#5B6CFF22' }}
                >
                  Jump
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
