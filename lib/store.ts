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

export type RightPanelTab = 'scene' | 'object' | 'environment' | 'assets'

interface WorldBuilderState {
  // Tools
  currentTool: Tool
  setTool: (tool: Tool) => void

  // Layout panels
  isChatPanelOpen: boolean
  isRightPanelOpen: boolean
  toggleChatPanel: () => void
  toggleRightPanel: () => void
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void

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

  // Undo / Redo (with transaction support so AI turns are one undo)
  undoStack: WorldObject[][]
  redoStack: WorldObject[][]
  transactionDepth: number
  transactionSnapshot: WorldObject[] | null
  beginTransaction: () => void
  endTransaction: () => void
  undo: () => void
  redo: () => void

  // Notifications
  notification: string | null
  showNotification: (message: string) => void
  hideNotification: () => void
}

let notificationTimer: ReturnType<typeof setTimeout> | null = null

// Push the previous snapshot onto undoStack unless we're inside a transaction.
// Inside a transaction, the snapshot is captured once at begin and flushed at end.
function recordUndo(get: () => WorldBuilderState, prevObjects: WorldObject[]): Pick<WorldBuilderState, 'undoStack' | 'redoStack'> | object {
  const { transactionDepth } = get()
  if (transactionDepth > 0) return {}
  return {
    undoStack: [...get().undoStack, prevObjects],
    redoStack: [],
  }
}

export const useWorldBuilder = create<WorldBuilderState>((set, get) => ({
  currentTool: 'select',
  setTool: (tool) => {
    set({ currentTool: tool })
    get().showNotification(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool active`)
  },

  isChatPanelOpen: true,
  isRightPanelOpen: true,
  toggleChatPanel: () => set((s) => ({ isChatPanelOpen: !s.isChatPanelOpen })),
  toggleRightPanel: () => set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  rightPanelTab: 'scene',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

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
      ...recordUndo(get, s.objects),
    })),
  removeObject: (id) =>
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
      ...recordUndo(get, s.objects),
    })),
  updateObject: (id, patch) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      ...recordUndo(get, s.objects),
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
  transactionDepth: 0,
  transactionSnapshot: null,
  beginTransaction: () => {
    const { transactionDepth, objects } = get()
    set({
      transactionDepth: transactionDepth + 1,
      transactionSnapshot: transactionDepth === 0 ? objects : get().transactionSnapshot,
    })
  },
  endTransaction: () => {
    const { transactionDepth, transactionSnapshot, undoStack, objects } = get()
    const next = Math.max(0, transactionDepth - 1)
    if (next === 0 && transactionSnapshot && transactionSnapshot !== objects) {
      set({
        transactionDepth: 0,
        transactionSnapshot: null,
        undoStack: [...undoStack, transactionSnapshot],
        redoStack: [],
      })
    } else {
      set({ transactionDepth: next, transactionSnapshot: next === 0 ? null : transactionSnapshot })
    }
  },
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
