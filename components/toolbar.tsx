'use client'

import { PanelRightOpen, Undo2, Redo2 } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useWorldBuilder } from '@/lib/store'
import { TOOLS } from '@/lib/constants'
import { cn } from '@/lib/utils'

function ToolButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'relative p-3 rounded-xl transition-all duration-200',
            active
              ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5',
          )}
        >
          {children}
          {active && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-1 h-1 rounded-full bg-blue-400" />
          )}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          sideOffset={8}
          className="z-50 px-3 py-1.5 rounded-lg bg-black/90 border border-white/10 text-sm text-white shadow-xl"
        >
          {label}{shortcut && <span className="ml-2 text-gray-500">({shortcut})</span>}
          <Tooltip.Arrow className="fill-black/90" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function Toolbar() {
  const { currentTool, setTool, undo, redo, togglePanel } = useWorldBuilder()

  return (
    <Tooltip.Provider delayDuration={0}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl">
          {TOOLS.map(({ id, label, shortcut, icon: Icon }) => (
            <ToolButton
              key={id}
              label={label}
              shortcut={shortcut}
              active={currentTool === id}
              onClick={() => setTool(id)}
            >
              <Icon className="w-5 h-5" />
            </ToolButton>
          ))}

          <div className="w-px h-8 bg-white/10 mx-1" />

          <ToolButton label="Undo" shortcut="Ctrl+Z" onClick={undo}>
            <Undo2 className="w-5 h-5" />
          </ToolButton>
          <ToolButton label="Redo" shortcut="Ctrl+Y" onClick={redo}>
            <Redo2 className="w-5 h-5" />
          </ToolButton>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <ToolButton label="Toggle Panel" onClick={togglePanel}>
            <PanelRightOpen className="w-5 h-5" />
          </ToolButton>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
