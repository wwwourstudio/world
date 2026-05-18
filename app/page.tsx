'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { LoadingScreen } from '@/components/loading-screen'
import { HeaderBar } from '@/components/header-bar'
import { ChatPanel } from '@/components/chat-panel'
import { ViewportToolbar } from '@/components/viewport-toolbar'
import { RightPanel } from '@/components/right-panel'
import { Notification } from '@/components/notification'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useWorldBuilder } from '@/lib/store'

const Canvas3D = dynamic(() => import('@/components/canvas-3d').then((m) => m.Canvas3D), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-950" />,
})

export default function WorldBuilderPage() {
  const [isLoading, setIsLoading] = useState(true)
  useKeyboardShortcuts()
  const isChatPanelOpen = useWorldBuilder((s) => s.isChatPanelOpen)
  const isRightPanelOpen = useWorldBuilder((s) => s.isRightPanelOpen)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {isLoading && <LoadingScreen />}
      <HeaderBar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        {isChatPanelOpen && <ChatPanel />}
        <div className="flex-1 relative overflow-hidden">
          <Canvas3D />
          <ViewportToolbar />
        </div>
        {isRightPanelOpen && <RightPanel />}
      </div>
      <Notification />
    </div>
  )
}
