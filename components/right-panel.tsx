'use client'

import { useWorldBuilder } from '@/lib/store'
import type { RightPanelTab } from '@/lib/store'
import { SceneTab } from '@/components/panels/scene-tab'
import { ObjectTab } from '@/components/panels/object-tab'
import { EnvTab } from '@/components/panels/env-tab'

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'object', label: 'Object' },
  { id: 'environment', label: 'Env' },
]

export function RightPanel() {
  const rightPanelTab = useWorldBuilder((s) => s.rightPanelTab)
  const setRightPanelTab = useWorldBuilder((s) => s.setRightPanelTab)

  return (
    <aside className="flex flex-col w-72 bg-[#252525] border-l border-[#3a3a3a] shrink-0 overflow-hidden">
      <div className="flex border-b border-[#3a3a3a] shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setRightPanelTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              rightPanelTab === t.id
                ? 'text-blue-400 border-b-2 border-blue-500 bg-[#1e1e1e]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'scene' && <SceneTab />}
        {rightPanelTab === 'object' && <ObjectTab />}
        {rightPanelTab === 'environment' && <EnvTab />}
      </div>
    </aside>
  )
}
