'use client'

import { useWorldBuilder } from '@/lib/store'
import type { RightPanelTab } from '@/lib/store'
import { SceneTab } from '@/components/panels/scene-tab'
import { ObjectTab } from '@/components/panels/object-tab'
import { EnvTab } from '@/components/panels/env-tab'
import { AssetsTab } from '@/components/panels/assets-tab'
import { Boxes, SlidersHorizontal, Sun, Package } from 'lucide-react'

const TABS: { id: RightPanelTab; label: string; Icon: typeof Boxes }[] = [
  { id: 'scene', label: 'Scene', Icon: Boxes },
  { id: 'object', label: 'Object', Icon: SlidersHorizontal },
  { id: 'environment', label: 'Env', Icon: Sun },
  { id: 'assets', label: 'Assets', Icon: Package },
]

export function RightPanel() {
  const rightPanelTab = useWorldBuilder((s) => s.rightPanelTab)
  const setRightPanelTab = useWorldBuilder((s) => s.setRightPanelTab)

  return (
    <aside className="flex flex-col w-80 bg-zinc-900 border-l border-zinc-800 shrink-0 overflow-hidden">
      <div className="flex border-b border-zinc-800 shrink-0 h-11 px-1">
        {TABS.map((t) => {
          const Icon = t.Icon
          const active = rightPanelTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setRightPanelTab(t.id)}
              title={t.label}
              className={`relative flex-1 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors ${
                active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span>{t.label}</span>
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-px bg-orange-500" />
              )}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'scene' && <SceneTab />}
        {rightPanelTab === 'object' && <ObjectTab />}
        {rightPanelTab === 'environment' && <EnvTab />}
        {rightPanelTab === 'assets' && <AssetsTab />}
      </div>
    </aside>
  )
}
