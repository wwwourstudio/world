'use client'

import { useWorldBuilder } from '@/lib/store'
import { PanelLeft, PanelRight } from 'lucide-react'

export function HeaderBar() {
  const fps = useWorldBuilder((s) => s.fps)
  const isChatPanelOpen = useWorldBuilder((s) => s.isChatPanelOpen)
  const isRightPanelOpen = useWorldBuilder((s) => s.isRightPanelOpen)
  const toggleChatPanel = useWorldBuilder((s) => s.toggleChatPanel)
  const toggleRightPanel = useWorldBuilder((s) => s.toggleRightPanel)

  return (
    <header className="flex items-center h-11 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 gap-3 shrink-0 select-none relative z-30">
      <button
        onClick={toggleChatPanel}
        title="Toggle chat panel"
        className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${
          isChatPanelOpen ? 'text-zinc-200' : 'text-zinc-600'
        }`}
      >
        <PanelLeft size={15} strokeWidth={1.75} />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-[10px] font-bold text-white">W</div>
        <span className="text-zinc-200 font-medium text-[13px] tracking-tight">World Builder</span>
        <span className="text-zinc-600 text-[11px]">/ chat-based 3D</span>
      </div>

      <div className="flex-1" />

      <span className="text-zinc-600 text-[11px] font-mono tabular-nums">{fps} fps</span>

      <button
        onClick={toggleRightPanel}
        title="Toggle properties panel"
        className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${
          isRightPanelOpen ? 'text-zinc-200' : 'text-zinc-600'
        }`}
      >
        <PanelRight size={15} strokeWidth={1.75} />
      </button>
    </header>
  )
}
