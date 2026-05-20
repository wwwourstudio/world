'use client'

import { useState } from 'react'
import { X, Download, Code, FileJson, Monitor, Camera } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'
import { generateEmbedCode, generateThreeJSCode } from '@/lib/three/ExportSystem'

type ExportTab = 'embed' | 'threejs' | 'json' | 'screenshot'

export function ExportModal({ onClose }: { onClose: () => void }) {
  const objects = useScene((s) => s.objects)
  const environment = useScene((s) => s.environment)
  const [tab, setTab] = useState<ExportTab>('embed')
  const [copied, setCopied] = useState(false)

  const scene = { objects, environment }

  const content: Record<ExportTab, string> = {
    embed: generateEmbedCode(scene),
    threejs: generateThreeJSCode(scene),
    json: JSON.stringify({ objects, environment }, null, 2),
    screenshot: '',
  }

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
          {tab === 'screenshot' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Camera size={40} style={{ color: '#1E2028' }} />
              <p className="text-[12px]" style={{ color: '#7A7E92' }}>
                Use your browser&apos;s screenshot tool or press <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: '#1E2028', color: '#E8E9F0' }}>F12</kbd> → DevTools screenshot.
              </p>
              <button
                onClick={() => {
                  // Try to trigger browser screenshot via keyboard event
                  const event = new KeyboardEvent('keydown', { key: 'F12' })
                  document.dispatchEvent(event)
                }}
                className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
                style={{ background: '#5B6CFF', color: '#fff' }}
              >
                Open DevTools
              </button>
            </div>
          ) : (
            <pre className="h-full overflow-auto p-4 text-[11px] font-mono leading-relaxed custom-scrollbar"
              style={{ color: '#7A7E92', background: '#0B0C0F' }}>
              <code>{content[tab]}</code>
            </pre>
          )}
        </div>

        {/* Footer */}
        {tab !== 'screenshot' && (
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
