'use client'

import { useState, useMemo } from 'react'
import { X, Download, Code, FileJson, Monitor, Camera, Frame } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { generateEmbedCode, generateThreeJSCode } from '@/lib/three/ExportSystem'
import { captureCanvas } from '@/lib/canvasCapture'

type ExportTab = 'embed' | 'threejs' | 'json' | 'screenshot' | 'iframe'

export function ExportModal({ onClose }: { onClose: () => void }) {
  const objects = useScene((s) => s.objects)
  const environment = useScene((s) => s.environment)
  const [tab, setTab] = useState<ExportTab>('embed')
  const [copied, setCopied] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [iframeWidth, setIframeWidth] = useState(800)
  const [iframeHeight, setIframeHeight] = useState(600)

  const scene = { objects, environment }
  const embedHtml = useMemo(() => generateEmbedCode(scene), [objects, environment])

  const content: Record<ExportTab, string> = {
    embed: embedHtml,
    threejs: generateThreeJSCode(scene),
    json: JSON.stringify({ objects, environment }, null, 2),
    screenshot: '',
    iframe: '',
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

  const TABS: { id: ExportTab; label: string; icon: typeof Code }[] = [
    { id: 'embed', label: 'Embed HTML', icon: Monitor },
    { id: 'threejs', label: 'Three.js', icon: Code },
    { id: 'json', label: 'Scene JSON', icon: FileJson },
    { id: 'screenshot', label: 'Screenshot', icon: Camera },
    { id: 'iframe', label: 'iFrame', icon: Frame },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-[700px] max-w-[95vw] h-[520px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
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
          {tab === 'iframe' ? (
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
        {tab !== 'screenshot' && tab !== 'iframe' && (
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
