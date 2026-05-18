'use client'

import { useWorldBuilder } from '@/lib/store'
import { TOOLS } from '@/lib/constants'
import { Undo2, Redo2 } from 'lucide-react'

const SIMPLE_TOOLS = TOOLS.filter((t) => ['select', 'move', 'rotate', 'scale'].includes(t.id))

export function ViewportToolbar() {
  const currentTool = useWorldBuilder((s) => s.currentTool)
  const setTool = useWorldBuilder((s) => s.setTool)
  const undo = useWorldBuilder((s) => s.undo)
  const redo = useWorldBuilder((s) => s.redo)
  const canUndo = useWorldBuilder((s) => s.undoStack.length > 0)
  const canRedo = useWorldBuilder((s) => s.redoStack.length > 0)

  return (
    <div className="absolute top-3 left-3 z-20 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 bg-zinc-900/85 backdrop-blur-md rounded-lg border border-zinc-800 p-1 shadow-xl shadow-black/30">
        {SIMPLE_TOOLS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 ${
                currentTool === t.id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Icon size={14} strokeWidth={1.75} />
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-0.5 bg-zinc-900/85 backdrop-blur-md rounded-lg border border-zinc-800 p-1 shadow-xl shadow-black/30">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Undo2 size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Redo2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
