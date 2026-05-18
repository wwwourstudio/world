'use client'

import { useWorldBuilder } from '@/lib/store'
import { CheckCircle2 } from 'lucide-react'

export function Notification() {
  const notification = useWorldBuilder((s) => s.notification)

  if (!notification) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 anim-fade-in pointer-events-none">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl shadow-black/40">
        <CheckCircle2 size={13} className="text-orange-400 shrink-0" strokeWidth={1.75} />
        <p className="text-[12px] text-zinc-200 font-medium whitespace-nowrap">{notification}</p>
      </div>
    </div>
  )
}
