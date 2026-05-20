'use client'

import { useWorldBuilder } from '@/lib/store'
import { PanelLeft, PanelRight, Globe2 } from 'lucide-react'

export function HeaderBar() {
  const fps = useWorldBuilder((s) => s.fps)
  const isChatPanelOpen = useWorldBuilder((s) => s.isChatPanelOpen)
  const isRightPanelOpen = useWorldBuilder((s) => s.isRightPanelOpen)
  const toggleChatPanel = useWorldBuilder((s) => s.toggleChatPanel)
  const toggleRightPanel = useWorldBuilder((s) => s.toggleRightPanel)

  return (
    <header className="flex items-center h-11 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-3 shrink-0 select-none relative z-30">
      <button
        onClick={toggleChatPanel}
        title="Toggle chat panel"
        className={`p-1.5 rounded-md transition-colors ${
          isChatPanelOpen
            ? 'bg-orange-500/15 text-orange-400'
            : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300'
        }`}
      >
        <PanelLeft size={15} strokeWidth={1.75} />
      </button>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-sm shadow-orange-500/30">
          <Globe2 size={11} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-zinc-200 font-medium text-[13px] tracking-tight">World Builder</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span className="text-zinc-700 text-[11px] font-mono tabular-nums">{fps} fps</span>
        <div className="w-px h-4 bg-zinc-800" />
        <button
          onClick={toggleRightPanel}
          title="Toggle properties panel"
          className={`p-1.5 rounded-md transition-colors ${
            isRightPanelOpen
              ? 'bg-orange-500/15 text-orange-400'
              : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          <PanelRight size={15} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
