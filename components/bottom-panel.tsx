'use client'

import { useWorldBuilder } from '@/lib/store'
import type { BottomPanelTab } from '@/lib/store'
import { AssetsTab } from '@/components/panels/assets-tab'
import { AITab } from '@/components/panels/ai-tab'

const TABS: { id: BottomPanelTab; label: string }[] = [
  { id: 'assets', label: 'Assets (Sketchfab)' },
  { id: 'ai', label: 'AI Assistant' },
]

export function BottomPanel() {
  const bottomPanelTab = useWorldBuilder((s) => s.bottomPanelTab)
  const setBottomPanelTab = useWorldBuilder((s) => s.setBottomPanelTab)

  return (
    <div className="flex flex-col h-56 bg-[#252525] border-t border-[#3a3a3a] shrink-0">
      <div className="flex border-b border-[#3a3a3a] shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setBottomPanelTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              bottomPanelTab === t.id
                ? 'text-blue-400 border-b-2 border-blue-500 bg-[#1e1e1e]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {bottomPanelTab === 'assets' && <AssetsTab />}
        {bottomPanelTab === 'ai' && <AITab />}
      </div>
    </div>
  )
}
