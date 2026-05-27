'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Download, Code, FileJson, Monitor, Camera, Frame, Video, Share2, Package, Globe } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { generateEmbedCode, generateThreeJSCode, exportSceneGLB, generateWebsiteHTML } from '@/lib/three/ExportSystem'
import { captureCanvas } from '@/lib/canvasCapture'
import { videoRecorder } from '@/lib/three/VideoRecorder'

type ExportTab = 'embed' | 'threejs' | 'json' | 'screenshot' | 'iframe' | 'video' | 'glb' | 'share' | 'website'

export function ExportModal({ onClose }: { onClose: () => void }) {
  const objects = useScene((s) => s.objects)
  const environment = useScene((s) => s.environment)
  const cameraPath = useScene((s) => s.cameraPath)
  const isRecording = useScene((s) => s.isRecording)
  const setRecording = useScene((s) => s.setRecording)
  const showNotification = useScene((s) => s.showNotification)
  const [tab, setTab] = useState<ExportTab>('embed')
  const [copied, setCopied] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [glbExporting, setGlbExporting] = useState(false)
  const [iframeWidth, setIframeWidth] = useState(800)
  const [iframeHeight, setIframeHeight] = useState(600)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const scene = { objects, environment }
  const embedHtml = useMemo(() => generateEmbedCode(scene), [objects, environment])

  const content: Record<ExportTab, string> = {
    embed: embedHtml,
    threejs: generateThreeJSCode(scene),
    json: JSON.stringify({ objects, environment }, null, 2),
    screenshot: '',
    iframe: '',
    video: '',
    glb: '',
    share: '',
    website: '',
  }

  const iframeSnippet = `<iframe\n  srcdoc="${embedHtml.replace(/"/g, '&quot;').replace(/\n/g, '')}"\n  width="${iframeWidth}" height="${iframeHeight}"\n  style="border:none;border-radius:12px"\n  allowfullscreen\n></iframe>`

  function copyToClipboard() {
    navigator.clipboard.writeText(content[tab]).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function download() {
    const ext = tab === 'embed' ? 'html' : tab === 'threejs' ? 'js' : 'json'
    const mime = tab === 'embed' ? 'text/html' : tab === 'threejs' ? 'text/javascript' : 'application/json'
    const blob = new Blob([content[tab]], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `world-builder-${tab}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleStartRecording() {
    const canvas = captureCanvas.dom
    if (!canvas) { showNotification('Canvas not ready', 'error'); return }
    const ok = videoRecorder.start(canvas, 30)
    if (ok) { setRecording(true); setVideoUrl(null); showNotification('Recording started') }
    else showNotification('Recording not supported in this browser', 'error')
  }

  async function handleStopRecording() {
    const url = await videoRecorder.stop()
    setRecording(false)
    if (url) { setVideoUrl(url); showNotification('Recording ready for download') }
  }

  async function handleExportGLB() {
    setGlbExporting(true)
    try {
      await exportSceneGLB(objects)
      showNotification('GLB exported')
    } catch (e) {
      console.error(e); showNotification('GLB export failed', 'error')
    } finally {
      setGlbExporting(false)
    }
  }

  function handleCopyShareUrl() {
    try {
      const data = JSON.stringify({ objects, environment })
      const compressed = btoa(encodeURIComponent(data))
      const url = `${window.location.origin}${window.location.pathname}?scene=${compressed}`
      navigator.clipboard.writeText(url)
      showNotification('Share URL copied to clipboard')
    } catch {
      showNotification('Scene too large to share via URL', 'error')
    }
  }

  function handleSaveWBP() {
    const data = JSON.stringify({ objects, environment }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'scene.wbp'; a.click()
    URL.revokeObjectURL(url)
    showNotification('Scene saved as .wbp')
  }

  const TABS: { id: ExportTab; label: string; icon: typeof Code }[] = [
    { id: 'embed', label: 'Embed HTML', icon: Monitor },
    { id: 'threejs', label: 'Three.js', icon: Code },
    { id: 'json', label: 'Scene JSON', icon: FileJson },
    { id: 'screenshot', label: 'Screenshot', icon: Camera },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'glb', label: 'GLB', icon: Package },
    { id: 'website', label: 'Website', icon: Globe },
    { id: 'share', label: 'Share', icon: Share2 },
    { id: 'iframe', label: 'iFrame', icon: Frame },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-[760px] max-w-[95vw] h-[520px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#111318', border: '1px solid #1E2028' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
          <div className="flex items-center gap-2">
            <Download size={16} style={{ color: '#5B6CFF' }} />
            <span className="font-semibold text-[14px]" style={{ color: '#E8E9F0' }}>Export Scene</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-zinc-800">
            <X size={14} style={{ color: '#7A7E92' }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid #1E2028' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors"
              style={{
                color: tab === id ? '#E8E9F0' : '#7A7E92',
                borderBottom: tab === id ? '2px solid #5B6CFF' : '2px solid transparent',
              }}
            >
              <Icon size={12} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'video' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#1E2028' }}>
                <Video size={22} style={{ color: isRecording ? '#ff5c5c' : '#5B6CFF' }} />
              </div>
              {isRecording ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[13px] font-semibold" style={{ color: '#ff6060' }}>Recording…</span>
                  </div>
                  <p className="text-[12px] text-center" style={{ color: '#7A7E92' }}>Close this modal to see the scene while recording, then reopen to stop.</p>
                  <button onClick={handleStopRecording}
                    className="px-4 py-2 rounded-lg text-[12px] font-medium"
                    style={{ background: '#ff3a3a', color: '#fff' }}>
                    Stop &amp; Save
                  </button>
                </>
              ) : videoUrl ? (
                <>
                  <p className="text-[12px]" style={{ color: '#7A7E92' }}>Recording complete!</p>
                  <div className="flex gap-2">
                    <button onClick={() => setVideoUrl(null)}
                      className="px-4 py-2 rounded-lg text-[12px] font-medium border"
                      style={{ color: '#7A7E92', borderColor: '#1E2028' }}>
                      Discard
                    </button>
                    <a href={videoUrl} download="world-recording.webm"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium"
                      style={{ background: '#5B6CFF', color: '#fff' }}>
                      <Download size={12} strokeWidth={2} />
                      Download WebM
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-center" style={{ color: '#7A7E92' }}>
                    Captures the viewport as a WebM video. Close this modal while recording to interact with the scene.
                  </p>
                  <button onClick={handleStartRecording}
                    className="px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-2"
                    style={{ background: '#5B6CFF', color: '#fff' }}>
                    <Video size={13} strokeWidth={2} />
                    Start Recording
                  </button>
                </>
              )}
            </div>
          ) : tab === 'glb' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#1E2028' }}>
                <Package size={22} style={{ color: '#5B6CFF' }} />
              </div>
              <p className="text-[12px] text-center" style={{ color: '#7A7E92' }}>
                Exports mesh objects as a binary GLTF (.glb) file. Lights, particles, terrain, and water are not included.
              </p>
              <div className="flex gap-2">
                <button onClick={handleSaveWBP}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium border"
                  style={{ color: '#7A7E92', borderColor: '#1E2028' }}>
                  Save as .wbp
                </button>
                <button onClick={handleExportGLB} disabled={glbExporting}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-1.5"
                  style={{ background: glbExporting ? '#2a2a3a' : '#5B6CFF', color: '#fff', opacity: glbExporting ? 0.7 : 1 }}>
                  <Download size={12} strokeWidth={2} />
                  {glbExporting ? 'Exporting…' : 'Export GLB'}
                </button>
              </div>
            </div>
          ) : tab === 'website' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#1E2028' }}>
                <Globe size={22} style={{ color: '#5B6CFF' }} />
              </div>
              <p className="text-[12px] text-center" style={{ color: '#7A7E92' }}>
                Exports a self-contained HTML page with your 3D scene and scroll-driven camera path. Open in any browser — no server needed.
              </p>
              <p className="text-[11px] text-center px-4" style={{ color: '#4a4e62' }}>
                External GLTF models and HDRI textures are not included in the standalone export.
              </p>
              <button
                onClick={() => {
                  const html = generateWebsiteHTML(objects, cameraPath)
                  const blob = new Blob([html], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'world-website.html'
                  a.click()
                  URL.revokeObjectURL(url)
                  showNotification('Website HTML downloaded')
                }}
                className="px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-1.5"
                style={{ background: '#5B6CFF', color: '#fff' }}
              >
                <Download size={12} strokeWidth={2} />
                Download HTML
              </button>
            </div>
          ) : tab === 'share' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#1E2028' }}>
                <Share2 size={22} style={{ color: '#5B6CFF' }} />
              </div>
              <p className="text-[12px] text-center" style={{ color: '#7A7E92' }}>
                Generates a shareable URL containing the full scene. The URL may be long for complex scenes.
              </p>
              <div className="flex gap-2">
                <button onClick={handleSaveWBP}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium border"
                  style={{ color: '#7A7E92', borderColor: '#1E2028' }}>
                  <Download size={12} strokeWidth={2} className="inline mr-1" />
                  Save .wbp File
                </button>
                <button onClick={handleCopyShareUrl}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-1.5"
                  style={{ background: '#5B6CFF', color: '#fff' }}>
                  <Share2 size={12} strokeWidth={2} />
                  Copy Share URL
                </button>
              </div>
            </div>
          ) : tab === 'iframe' ? (
            <div className="flex flex-col h-full p-4 gap-3">
              {/* Size controls */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] w-14 shrink-0" style={{ color: '#7A7E92' }}>Width</span>
                  <input type="range" min={400} max={1920} step={40} value={iframeWidth}
                    onChange={(e) => setIframeWidth(Number(e.target.value))}
                    className="flex-1 accent-indigo-500" />
                  <span className="text-[11px] w-10 text-right font-mono" style={{ color: '#E8E9F0' }}>{iframeWidth}</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] w-14 shrink-0" style={{ color: '#7A7E92' }}>Height</span>
                  <input type="range" min={300} max={1080} step={40} value={iframeHeight}
                    onChange={(e) => setIframeHeight(Number(e.target.value))}
                    className="flex-1 accent-indigo-500" />
                  <span className="text-[11px] w-10 text-right font-mono" style={{ color: '#E8E9F0' }}>{iframeHeight}</span>
                </div>
              </div>
              {/* Snippet */}
              <pre className="flex-1 overflow-auto p-3 text-[10px] font-mono leading-relaxed rounded-lg custom-scrollbar"
                style={{ color: '#7A7E92', background: '#0B0C0F', border: '1px solid #1E2028', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <code>{`<iframe\n  srcdoc="[full HTML — click Copy to get snippet]"\n  width="${iframeWidth}" height="${iframeHeight}"\n  style="border:none;border-radius:12px"\n  allowfullscreen\n></iframe>`}</code>
              </pre>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { navigator.clipboard.writeText(iframeSnippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}
                  className="flex-1 py-2 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ background: copied ? '#1a3a1a' : '#5B6CFF', color: copied ? '#4ade80' : '#fff' }}
                >
                  {copied ? '✓ Copied iFrame snippet!' : 'Copy iFrame Snippet'}
                </button>
              </div>
            </div>
          ) : tab === 'screenshot' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              {screenshotUrl ? (
                <>
                  <img src={screenshotUrl} alt="Screenshot" className="max-h-64 rounded-lg object-contain"
                    style={{ border: '1px solid #1E2028' }} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setScreenshotUrl(null) }}
                      className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors border"
                      style={{ color: '#7A7E92', borderColor: '#1E2028' }}
                    >Retake</button>
                    <button
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = screenshotUrl
                        a.download = 'world-screenshot.png'
                        a.click()
                      }}
                      className="px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-1.5"
                      style={{ background: '#5B6CFF', color: '#fff' }}
                    >
                      <Download size={12} strokeWidth={2} />
                      Download PNG
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#1E2028' }}>
                    <Camera size={22} style={{ color: '#5B6CFF' }} />
                  </div>
                  <p className="text-[12px] text-center" style={{ color: '#7A7E92' }}>
                    Captures the current viewport as a PNG image.
                  </p>
                  <button
                    onClick={() => {
                      const canvas = captureCanvas.dom
                      if (!canvas) return
                      const url = canvas.toDataURL('image/png')
                      setScreenshotUrl(url)
                    }}
                    className="px-4 py-2 rounded-lg text-[12px] font-medium"
                    style={{ background: '#5B6CFF', color: '#fff' }}
                  >
                    Capture Screenshot
                  </button>
                </>
              )}
            </div>
          ) : (
            <pre className="h-full overflow-auto p-4 text-[11px] font-mono leading-relaxed custom-scrollbar"
              style={{ color: '#7A7E92', background: '#0B0C0F' }}>
              <code>{content[tab]}</code>
            </pre>
          )}
        </div>

        {/* Footer */}
        {tab !== 'screenshot' && tab !== 'iframe' && tab !== 'video' && tab !== 'glb' && tab !== 'share' && tab !== 'website' && (
          <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderTop: '1px solid #1E2028' }}>
            <span className="text-[11px]" style={{ color: '#7A7E92' }}>
              {Object.keys(objects).length} objects · {(new TextEncoder().encode(content[tab]).length / 1024).toFixed(1)} KB
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border"
                style={{ color: copied ? '#4ade80' : '#7A7E92', borderColor: '#1E2028' }}
                onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.background = '#1E2028' } }}
                onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.color = '#7A7E92'; e.currentTarget.style.background = '' } }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
              <button
                onClick={download}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5"
                style={{ background: '#5B6CFF', color: '#fff' }}
              >
                <Download size={12} strokeWidth={2} />
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
