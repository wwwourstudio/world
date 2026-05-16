import { create } from 'zustand'
import type { Tool, HDRI, Weather } from './constants'

export interface WorldObject {
  id: string
  type: 'cube' | 'sphere' | 'cylinder'
  position: [number, number, number]
}

interface WorldBuilderState {
  // Tools
  currentTool: Tool
  setTool: (tool: Tool) => void

  // Panel
  isPanelOpen: boolean
  togglePanel: () => void

  // Environment
  currentHDRI: HDRI
  setHDRI: (hdri: HDRI) => void
  timeOfDay: number
  setTimeOfDay: (time: number) => void
  weather: Weather
  setWeather: (weather: Weather) => void

  // Post-processing
  bloom: number
  exposure: number
  contrast: number
  setBloom: (value: number) => void
  setExposure: (value: number) => void
  setContrast: (value: number) => void

  // Scene objects
  objects: WorldObject[]
  addObject: (obj: WorldObject) => void
  removeObject: (id: string) => void

  // Stats (updated by the 3D scene)
  fps: number
  setFPS: (fps: number) => void

  // Undo / Redo
  undoStack: WorldObject[][]
  redoStack: WorldObject[][]
  undo: () => void
  redo: () => void

  // Notifications
  notification: string | null
  showNotification: (message: string) => void
  hideNotification: () => void
}

let notificationTimer: ReturnType<typeof setTimeout> | null = null

export const useWorldBuilder = create<WorldBuilderState>((set, get) => ({
  currentTool: 'select',
  setTool: (tool) => {
    set({ currentTool: tool })
    get().showNotification(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool active`)
  },

  isPanelOpen: false,
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),

  currentHDRI: 'forest',
  setHDRI: (hdri) => {
    set({ currentHDRI: hdri })
    get().showNotification(`Loaded ${hdri} environment`)
  },

  timeOfDay: 12,
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),

  weather: 'clear',
  setWeather: (weather) => {
    set({ weather })
    get().showNotification(`Weather: ${weather}`)
  },

  bloom: 0.3,
  exposure: 1,
  contrast: 1,
  setBloom: (bloom) => set({ bloom }),
  setExposure: (exposure) => set({ exposure }),
  setContrast: (contrast) => set({ contrast }),

  objects: [],
  addObject: (obj) =>
    set((s) => ({
      objects: [...s.objects, obj],
      undoStack: [...s.undoStack, s.objects],
      redoStack: [],
    })),
  removeObject: (id) =>
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      undoStack: [...s.undoStack, s.objects],
      redoStack: [],
    })),

  fps: 60,
  setFPS: (fps) => set({ fps }),

  undoStack: [],
  redoStack: [],
  undo: () => {
    const { undoStack, objects } = get()
    if (!undoStack.length) return
    const previous = undoStack[undoStack.length - 1]
    set((s) => ({
      objects: previous,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [objects, ...s.redoStack],
    }))
    get().showNotification('Undo')
  },
  redo: () => {
    const { redoStack, objects } = get()
    if (!redoStack.length) return
    const next = redoStack[0]
    set((s) => ({
      objects: next,
      undoStack: [...s.undoStack, objects],
      redoStack: s.redoStack.slice(1),
    }))
    get().showNotification('Redo')
  },

  notification: null,
  showNotification: (message) => {
    if (notificationTimer) clearTimeout(notificationTimer)
    set({ notification: message })
    notificationTimer = setTimeout(() => set({ notification: null }), 2500)
  },
  hideNotification: () => {
    if (notificationTimer) clearTimeout(notificationTimer)
    set({ notification: null })
  },
}))
