'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { LoadingScreen } from '@/components/loading-screen'
import { Toolbar } from '@/components/toolbar'
import { AIInput } from '@/components/ai-input'
import { EnvironmentPanel } from '@/components/environment-panel'
import { StatsDisplay } from '@/components/stats-display'
import { TimeDisplay } from '@/components/time-display'
import { Notification } from '@/components/notification'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

const Canvas3D = dynamic(() => import('@/components/canvas-3d').then((m) => m.Canvas3D), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-[#0a0e1a]" />,
})

export default function WorldBuilderPage() {
  const [isLoading, setIsLoading] = useState(true)
  useKeyboardShortcuts()

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0e1a]">
      {isLoading && <LoadingScreen />}

      <div className="absolute inset-0">
        <Canvas3D />
      </div>

      <Toolbar />
      <AIInput />
      <EnvironmentPanel />
      <StatsDisplay />
      <TimeDisplay />
      <Notification />
    </div>
  )
}
