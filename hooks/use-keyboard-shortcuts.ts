'use client'

import { useEffect } from 'react'
import { useWorldBuilder } from '@/lib/store'
import { TOOL_SHORTCUTS } from '@/lib/constants'

export function useKeyboardShortcuts() {
  const setTool = useWorldBuilder((s) => s.setTool)
  const undo = useWorldBuilder((s) => s.undo)
  const redo = useWorldBuilder((s) => s.redo)
  const removeObject = useWorldBuilder((s) => s.removeObject)
  const duplicateObject = useWorldBuilder((s) => s.duplicateObject)
  const selectedObjectId = useWorldBuilder((s) => s.selectedObjectId)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (selectedObjectId) duplicateObject(selectedObjectId)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault()
          removeObject(selectedObjectId)
        }
        return
      }

      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()]
      if (tool) setTool(tool)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTool, undo, redo, removeObject, duplicateObject, selectedObjectId])
}
