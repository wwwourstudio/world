'use client'

import { useWorldBuilder } from '@/lib/store'
import { PanelRight, PanelBottom } from 'lucide-react'

export function HeaderBar() {
  const fps = useWorldBuilder((s) => s.fps)
  const isRightPanelOpen = useWorldBuilder((s) => s.isRightPanelOpen)
  const isBottomPanelOpen = useWorldBuilder((s) => s.isBottomPanelOpen)
  const toggleRightPanel = useWorldBuilder((s) => s.toggleRightPanel)
  const toggleBottomPanel = useWorldBuilder((s) => s.toggleBottomPanel)

  return (
    <header className="flex items-center h-10 bg-[#2a2a2a] border-b border-[#3a3a3a] px-3 gap-4 shrink-0 select-none">
      <span className="text-blue-400 font-bold text-xs tracking-widest uppercase">▲ World Builder</span>

      <div className="flex gap-0.5">
        {['Edit', 'Add', 'View'].map((m) => (
          <button
            key={m}
            className="px-2.5 py-1 text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-200 rounded text-xs"
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <span className="text-gray-500 text-xs font-mono tabular-nums">FPS {fps}</span>

      <div className="flex gap-0.5">
        <button
          onClick={toggleRightPanel}
          title="Toggle properties panel"
          className={`p-1.5 rounded hover:bg-[#3a3a3a] transition-colors ${
            isRightPanelOpen ? 'text-blue-400' : 'text-gray-600'
          }`}
        >
          <PanelRight size={15} />
        </button>
        <button
          onClick={toggleBottomPanel}
          title="Toggle bottom panel"
          className={`p-1.5 rounded hover:bg-[#3a3a3a] transition-colors ${
            isBottomPanelOpen ? 'text-blue-400' : 'text-gray-600'
          }`}
        >
          <PanelBottom size={15} />
        </button>
      </div>
    </header>
  )
}
