'use client'

import { useScene } from '@/lib/scene/SceneStore'

export function ViewportOverlay() {
  const fps = useScene((s) => s.fps)
  const showStats = useScene((s) => s.showStats)
  const objects = useScene((s) => s.objects)
  const isPlaying = useScene((s) => s.isPlaying)
  const selectedIds = useScene((s) => s.selectedIds)
  const activeTool = useScene((s) => s.activeTool)
  const transformSpace = useScene((s) => s.transformSpace)
  const snapEnabled = useScene((s) => s.snapEnabled)
  const viewMode = useScene((s) => s.viewMode)
  const setViewMode = useScene((s) => s.setViewMode)
  const cameraFov = useScene((s) => s.cameraFov)
  const setCameraFov = useScene((s) => s.setCameraFov)
  const isRecording = useScene((s) => s.isRecording)

  const objCount = Object.keys(objects).length
  const selectedObj = selectedIds.length === 1 ? objects[selectedIds[0]] : null

  return (
    <>
      {/* View mode switcher */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1">
        {(['persp', 'top', 'front', 'right'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="px-2 h-6 rounded text-[10px] font-mono uppercase transition-colors"
            style={{
              background: viewMode === mode ? '#5B6CFF' : 'rgba(11,12,15,0.8)',
              color: viewMode === mode ? '#fff' : '#7A7E92',
              border: '1px solid #1E2028',
              backdropFilter: 'blur(4px)',
            }}
          >
            {mode}
          </button>
        ))}
        {viewMode === 'persp' && (
          <>
            <div className="w-px h-4 mx-1" style={{ background: '#1E2028' }} />
            <span className="text-[10px] font-mono" style={{ color: '#7A7E92' }}>FOV</span>
            <input
              type="range"
              min={20} max={120} step={1}
              value={cameraFov}
              onChange={(e) => setCameraFov(parseInt(e.target.value))}
              className="w-16 h-1"
              style={{ accentColor: '#5B6CFF' }}
            />
            <span className="text-[10px] font-mono w-6" style={{ color: '#7A7E92' }}>{cameraFov}°</span>
          </>
        )}
      </div>

      {/* REC indicator */}
      {isRecording && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border" style={{ background: 'rgba(180,0,0,0.25)', borderColor: 'rgba(220,50,50,0.6)' }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest" style={{ color: '#ff6060' }}>REC</span>
          </div>
        </div>
      )}

      {/* Playing badge */}
      {isPlaying && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[11px] text-red-300 font-medium uppercase tracking-widest">Playing</span>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {showStats && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none font-mono">
          <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-md bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px]">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">FPS</span>
              <span className={fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}>{fps}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Objects</span>
              <span className="text-zinc-300">{objCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tool / space indicator */}
      <div className="absolute bottom-16 left-3 z-20 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{activeTool}</span>
          {activeTool !== 'select' && (
            <>
              <span className="text-zinc-700">·</span>
              <span className={`text-[10px] uppercase tracking-widest ${transformSpace === 'local' ? 'text-blue-400' : 'text-zinc-400'}`}>
                {transformSpace}
              </span>
            </>
          )}
          {snapEnabled && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-[10px] text-amber-400 uppercase tracking-widest">Snap</span>
            </>
          )}
        </div>
      </div>

      {/* Selected object info */}
      {selectedObj && (
        <div className="absolute bottom-16 right-3 z-20 pointer-events-none">
          <div className="px-2.5 py-2 rounded-md bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px] font-mono">
            <div className="text-zinc-400 mb-1 truncate max-w-[160px]">{selectedObj.name}</div>
            {(['position', 'rotation', 'scale'] as const).map((prop) => (
              <div key={prop} className="flex gap-2 text-zinc-600">
                <span className="w-6 uppercase text-zinc-700">{prop[0]}</span>
                {selectedObj.transform[prop].map((v, i) => (
                  <span key={i} className={i === 0 ? 'text-red-400' : i === 1 ? 'text-green-400' : 'text-blue-400'}>
                    {v.toFixed(2)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Axis labels */}
      <div className="absolute bottom-20 right-3 z-20 pointer-events-none flex flex-col items-end gap-0.5 mr-[168px]">
        <span className="text-[9px] font-mono text-red-500 opacity-60">X</span>
        <span className="text-[9px] font-mono text-green-500 opacity-60">Y</span>
        <span className="text-[9px] font-mono text-blue-500 opacity-60">Z</span>
      </div>

      {/* Keyboard hints (only when nothing selected) */}
      {selectedIds.length === 0 && !isPlaying && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-zinc-800/50">
            {[
              ['Q', 'Select'], ['W', 'Move'], ['E', 'Rotate'], ['R', 'Scale'],
              ['G', 'Snap'], ['F3', 'Stats'],
            ].map(([k, l]) => (
              <span key={k} className="flex items-center gap-1 text-[10px]">
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono text-[9px]">{k}</kbd>
                <span className="text-zinc-600">{l}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
