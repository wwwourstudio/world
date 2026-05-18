'use client'

import { useWorldBuilder } from '@/lib/store'
import { TOOLS } from '@/lib/constants'
import { Undo2, Redo2 } from 'lucide-react'

export function LeftToolbar() {
  const currentTool = useWorldBuilder((s) => s.currentTool)
  const setTool = useWorldBuilder((s) => s.setTool)
  const undo = useWorldBuilder((s) => s.undo)
  const redo = useWorldBuilder((s) => s.redo)
  const canUndo = useWorldBuilder((s) => s.undoStack.length > 0)
  const canRedo = useWorldBuilder((s) => s.redoStack.length > 0)

  return (
    <aside className="flex flex-col items-center w-12 bg-[#2a2a2a] border-r border-[#3a3a3a] py-2 gap-0.5 shrink-0">
      {TOOLS.map((t) => {
        const Icon = t.icon
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
              currentTool === t.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-[#3a3a3a] hover:text-gray-200'
            }`}
          >
            <Icon size={17} />
          </button>
        )
      })}

      <div className="flex-1" />

      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="w-9 h-9 flex items-center justify-center rounded text-gray-500 hover:bg-[#3a3a3a] hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Undo2 size={15} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="w-9 h-9 flex items-center justify-center rounded text-gray-500 hover:bg-[#3a3a3a] hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Redo2 size={15} />
      </button>
    </aside>
  )
}
