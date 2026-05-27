'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, FileJson, FileText } from 'lucide-react'
import { useScene } from '@/lib/scene/SceneStore'

export function ImportModal({ onClose }: { onClose: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const showNotification = useScene((s) => s.showNotification)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  const addObject = useScene((s) => s.addObject)
  const setEnvironment = useScene((s) => s.setEnvironment)

  const processFile = useCallback((file: File) => {
    if (file.name.endsWith('.json') || file.name.endsWith('.wbp')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.objects && data.environment) {
            // Full scene JSON
            const store = useScene.getState()
            for (const id of [...store.rootIds]) store.removeObject(id)
            for (const obj of Object.values(data.objects)) {
              store.addObject(obj as Parameters<typeof store.addObject>[0])
            }
            store.setEnvironment(data.environment)
            showNotification('Scene imported successfully')
            onClose()
          } else {
            setStatus('Invalid scene JSON format')
          }
        } catch {
          setStatus('Failed to parse JSON')
        }
      }
      reader.readAsText(file)
    } else if (file.name.endsWith('.gltf') || file.name.endsWith('.glb')) {
      // For GLTF files, add as a GLTF object
      const url = URL.createObjectURL(file)
      addObject({
        name: file.name.replace(/\.[^.]+$/, ''),
        type: 'mesh',
        geometry: { type: 'gltf', url },
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      })
      showNotification(`Imported GLTF: ${file.name}`)
      onClose()
    } else {
      setStatus(`Unsupported format: ${file.name.split('.').pop()}. Supported: .json, .wbp, .gltf, .glb`)
    }
  }, [addObject, setEnvironment, showNotification, onClose])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-[480px] max-w-[95vw] rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#111318', border: '1px solid #1E2028' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1E2028' }}>
          <div className="flex items-center gap-2">
            <Upload size={16} style={{ color: '#5B6CFF' }} />
            <span className="font-semibold text-[14px]" style={{ color: '#E8E9F0' }}>Import File</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800">
            <X size={14} style={{ color: '#7A7E92' }} />
          </button>
        </div>

        <div className="p-5">
          {/* Drop zone */}
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl p-8 cursor-pointer transition-colors border-2 border-dashed"
            style={{
              borderColor: dragging ? '#5B6CFF' : '#1E2028',
              background: dragging ? '#0d1022' : '#0B0C0F',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={28} style={{ color: dragging ? '#5B6CFF' : '#7A7E92' }} />
            <div className="text-center">
              <p className="text-[13px] font-medium" style={{ color: '#E8E9F0' }}>
                Drop a file or click to browse
              </p>
              <p className="text-[11px] mt-1" style={{ color: '#7A7E92' }}>
                Supported formats: .json (scene), .gltf, .glb
              </p>
            </div>
          </div>

          <input ref={fileRef} type="file" accept=".json,.gltf,.glb" className="hidden" onChange={handleFileChange} />

          {status && (
            <p className="mt-3 text-[11px] text-red-400 text-center">{status}</p>
          )}

          {/* Supported formats */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { icon: FileJson, label: 'Scene JSON', desc: 'Full scene with objects and environment' },
              { icon: FileText, label: 'GLTF / GLB', desc: '3D models from Blender, Maya, or Sketchfab' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2 p-3 rounded-lg border"
                style={{ background: '#0B0C0F', borderColor: '#1E2028' }}>
                <Icon size={14} style={{ color: '#5B6CFF' }} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium" style={{ color: '#E8E9F0' }}>{label}</p>
                  <p className="text-[10px]" style={{ color: '#7A7E92' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
