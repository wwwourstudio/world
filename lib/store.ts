import { create } from 'zustand'
import type { Tool, HDRI, Weather, ObjectType } from './constants'
import { PRIMITIVE_Y_OFFSET, PRIMITIVE_NAMES } from './constants'

export interface WorldObject {
  id: string
  type: ObjectType
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  visible: boolean
  locked: boolean
  url?: string
}

export type RightPanelTab = 'scene' | 'object' | 'environment'
export type BottomPanelTab = 'assets' | 'ai'

interface WorldBuilderState {
  // Tools
  currentTool: Tool
  setTool: (tool: Tool) => void

  // Layout panels
  isRightPanelOpen: boolean
  isBottomPanelOpen: boolean
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void
  bottomPanelTab: BottomPanelTab
  setBottomPanelTab: (tab: BottomPanelTab) => void

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
  selectedObjectId: string | null
  setSelectedObject: (id: string | null) => void
  addObject: (obj: WorldObject) => void
  removeObject: (id: string) => void
  updateObject: (id: string, patch: Partial<WorldObject>) => void
  duplicateObject: (id: string) => void
  addPrimitive: (type: 'cube' | 'sphere' | 'cylinder') => void

  // Stats
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

  isRightPanelOpen: true,
  isBottomPanelOpen: true,
  toggleRightPanel: () => set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ isBottomPanelOpen: !s.isBottomPanelOpen })),
  rightPanelTab: 'scene',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  bottomPanelTab: 'assets',
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),

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
  selectedObjectId: null,
  setSelectedObject: (id) => {
    set({ selectedObjectId: id })
    if (id) set({ rightPanelTab: 'object' })
  },
  addObject: (obj) =>
    set((s) => ({
      objects: [...s.objects, obj],
      undoStack: [...s.undoStack, s.objects],
      redoStack: [],
    })),
  removeObject: (id) =>
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
      undoStack: [...s.undoStack, s.objects],
      redoStack: [],
    })),
  updateObject: (id, patch) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      undoStack: [...s.undoStack, s.objects],
      redoStack: [],
    })),
  duplicateObject: (id) => {
    const obj = get().objects.find((o) => o.id === id)
    if (!obj) return
    const copy: WorldObject = {
      ...obj,
      id: crypto.randomUUID(),
      name: `${obj.name} (copy)`,
      position: [obj.position[0] + 1, obj.position[1], obj.position[2] + 1],
    }
    get().addObject(copy)
    get().setSelectedObject(copy.id)
  },
  addPrimitive: (type) => {
    const count = get().objects.filter((o) => o.type === type).length + 1
    const obj: WorldObject = {
      id: crypto.randomUUID(),
      type,
      name: `${PRIMITIVE_NAMES[type]} ${count}`,
      position: [0, PRIMITIVE_Y_OFFSET[type], 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
    }
    get().addObject(obj)
    get().setSelectedObject(obj.id)
    get().showNotification(`Added ${PRIMITIVE_NAMES[type]}`)
  },

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
