'use client'

import { useMemo } from 'react'
import { useWorldBuilder } from '@/lib/store'
import { formatTime } from '@/lib/utils'

function getTimeOfDayInfo(hours: number) {
  const timeString = formatTime(hours)
  if (hours >= 5 && hours < 7) return { timeString, period: 'Dawn', icon: '🌅' }
  if (hours >= 7 && hours < 18) return { timeString, period: 'Day', icon: '☀️' }
  if (hours >= 18 && hours < 20) return { timeString, period: 'Dusk', icon: '🌆' }
  return { timeString, period: 'Night', icon: '🌙' }
}

export function TimeDisplay() {
  const timeOfDay = useWorldBuilder((s) => s.timeOfDay)
  const { timeString, period, icon } = useMemo(() => getTimeOfDayInfo(timeOfDay), [timeOfDay])

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="px-4 py-2 rounded-xl backdrop-blur-xl bg-black/40 border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label={period}>{icon}</span>
          <span className="text-sm font-mono text-blue-400">{timeString}</span>
          <span className="text-sm text-gray-400">{period}</span>
        </div>
      </div>
    </div>
  )
}
