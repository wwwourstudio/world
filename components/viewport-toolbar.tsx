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
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-0.5 bg-zinc-900/90 backdrop-blur-md rounded-full border border-zinc-800 px-2 py-1.5 shadow-xl shadow-black/40">
        {SIMPLE_TOOLS.map((t) => {
          const Icon = t.icon
          const active = currentTool === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 ${
                active
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/40'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Icon size={14} strokeWidth={1.75} />
            </button>
          )
        })}

        <div className="w-px h-5 bg-zinc-800 mx-1" />

        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Undo2 size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Redo2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
