'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { LoadingScreen } from '@/components/loading-screen'
import { HeaderBar } from '@/components/header-bar'
import { LeftToolbar } from '@/components/left-toolbar'
import { RightPanel } from '@/components/right-panel'
import { BottomPanel } from '@/components/bottom-panel'
import { Notification } from '@/components/notification'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useWorldBuilder } from '@/lib/store'

const Canvas3D = dynamic(() => import('@/components/canvas-3d').then((m) => m.Canvas3D), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#1a1a1a]" />,
})

export default function WorldBuilderPage() {
  const [isLoading, setIsLoading] = useState(true)
  useKeyboardShortcuts()
  const isRightPanelOpen = useWorldBuilder((s) => s.isRightPanelOpen)
  const isBottomPanelOpen = useWorldBuilder((s) => s.isBottomPanelOpen)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#1a1a1a] text-gray-100">
      {isLoading && <LoadingScreen />}
      <HeaderBar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftToolbar />
        <div className="flex-1 relative overflow-hidden">
          <Canvas3D />
        </div>
        {isRightPanelOpen && <RightPanel />}
      </div>
      {isBottomPanelOpen && <BottomPanel />}
      <Notification />
    </div>
  )
}
