'use client'

import { useEffect } from 'react'
import { useWorldBuilder } from '@/lib/store'
import { TOOL_SHORTCUTS } from '@/lib/constants'

export function useKeyboardShortcuts() {
  const { setTool, undo, redo } = useWorldBuilder()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
        return
      }

      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()]
      if (tool) setTool(tool)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTool, undo, redo])
}
