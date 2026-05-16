'use client'

import { useWorldBuilder } from '@/lib/store'

export function Notification() {
  const notification = useWorldBuilder((s) => s.notification)

  if (!notification) return null

  return (
    <div
      className="
        fixed top-20 left-1/2 -translate-x-1/2 z-50
        px-6 py-3 rounded-xl
        backdrop-blur-xl bg-black/60 border border-white/20
        shadow-2xl shadow-black/50
        animate-in fade-in-0 slide-in-from-top-2 duration-200
      "
    >
      <p className="text-sm text-white font-medium whitespace-nowrap">{notification}</p>
    </div>
  )
}
