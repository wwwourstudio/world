import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ObjectType = 'mesh' | 'light' | 'group' | 'particle'
export type GeometryType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'ring' | 'capsule' | 'tetrahedron' | 'octahedron' | 'icosahedron' | 'text' | 'gltf'
export type LightType = 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere' | 'rectarea'
export type MaterialType = 'standard' | 'physical' | 'toon' | 'wireframe' | 'glass' | 'hologram'
export type AnimationPreset = 'none' | 'float' | 'spin' | 'pulse' | 'orbit' | 'shake' | 'wave' | 'bounce'
export type PhysicsBodyType = 'dynamic' | 'static' | 'kinematic'
export type PhysicsShape = 'auto' | 'box' | 'sphere' | 'capsule' | 'hull'
export type ActiveTool = 'select' | 'translate' | 'rotate' | 'scale'

export interface Transform {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

export interface MaterialMaps {
  map?: string
  roughnessMap?: string
  metalnessMap?: string
  normalMap?: string
}

export interface MaterialConfig {
  type: MaterialType
  color: string
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
  opacity: number
  transparent: boolean
  wireframe: boolean
  envMapIntensity: number
  transmission: number
  ior: number
  thickness: number
  flatShading: boolean
  side: 'front' | 'back' | 'double'
  maps?: MaterialMaps
  textureRepeat?: [number, number]
}

export interface GeometryConfig {
  type: GeometryType
  width?: number
  height?: number
  depth?: number
  radius?: number
  radiusTop?: number
  radiusBottom?: number
  segments?: number
  tube?: number
  url?: string
  text?: string
  fontSize?: number
  textDepth?: number
  bevelEnabled?: boolean
  font?: 'helvetiker' | 'optimer' | 'gentilis'
  letterSpacing?: number
  lineHeight?: number
  bevelThickness?: number
  bevelSize?: number
}

export interface LightConfig {
  type: LightType
  intensity: number
  color: string
  distance: number
  decay: number
  angle: number
  penumbra: number
  castShadow: boolean
  skyColor?: string
  groundColor?: string
  rectAreaWidth?: number
  rectAreaHeight?: number
}

export interface PhysicsConfig {
  enabled: boolean
  type: PhysicsBodyType
  shape: PhysicsShape
  mass: number
  restitution: number
  friction: number
  linearDamping: number
  gravityScale: number
}

export interface Keyframe {
  time: number
  transform: Transform
}

export interface ObjectInteraction {
  hoverEffect: 'none' | 'highlight' | 'scale'
  clickAction: 'none' | 'toggle-anim' | 'link' | 'toggle-visible'
  tooltipText?: string
  linkUrl?: string
}

export interface AnimationConfig {
  preset: AnimationPreset
  speed: number
  amplitude: number
  offset: number
  axis: 'x' | 'y' | 'z'
  keyframes?: Keyframe[]
}

export interface SceneSnapshot {
  id: string
  name: string
  objects: Record<string, SceneObject>
  rootIds: string[]
  environment: EnvironmentState
  postFX: PostFXState
  createdAt: number
}

export interface ParticleConfig {
  count: number
  spread: [number, number, number]
  instanceGeometry: 'sphere' | 'box' | 'cone' | 'tetrahedron'
  instanceScale: number
  randomScale: number
  preset: 'scatter' | 'rain' | 'snow' | 'leaves' | 'sparks' | 'custom'
}

export interface SceneObject {
  id: string
  name: string
  type: ObjectType
  geometry: GeometryConfig
  material: MaterialConfig
  light: LightConfig | null
  transform: Transform
  animation: AnimationConfig | null
  physics: PhysicsConfig | null
  children: string[]
  parentId: string | null
  visible: boolean
  locked: boolean
  tags: string[]
  expanded: boolean
  castShadow: boolean
  receiveShadow: boolean
  particle?: ParticleConfig
  interaction?: ObjectInteraction
}

export interface EnvironmentState {
  hdriUrl: string | null
  hdriName: string
  hdriIntensity: number
  hdriRotation: number
  showBackground: boolean
  fogType: 'none' | 'linear' | 'exponential'
  fogColor: string
  fogNear: number
  fogFar: number
  fogDensity: number
  ambientColor: string
  ambientIntensity: number
  backgroundColor: string
  directionalColor: string
  directionalIntensity: number
  directionalPosition: [number, number, number]
  shadowsEnabled: boolean
  shadowMapSize: number
  skyEnabled: boolean
  skyTurbidity: number
  skyRayleigh: number
  sunElevation: number
  sunAzimuth: number
}

export interface PostFXState {
  bloom: boolean
  bloomIntensity: number
  bloomThreshold: number
  bloomSmoothing: number
  vignette: boolean
  vignetteOffset: number
  vignetteDarkness: number
  noise: boolean
  noiseOpacity: number
  chromaticAberration: boolean
  chromaticOffset: number
  toneMappingExposure: number
}

export interface PanelState {
  leftOpen: boolean
  rightOpen: boolean
  bottomOpen: boolean
  leftTab: 'outliner' | 'material' | 'lighting'
  rightTab: 'chat' | 'assets'
  bottomTab: 'animation' | 'physics'
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_MATERIAL: MaterialConfig = {
  type: 'standard',
  color: '#888888',
  roughness: 0.5,
  metalness: 0.0,
  emissive: '#000000',
  emissiveIntensity: 0,
  opacity: 1,
  transparent: false,
  wireframe: false,
  envMapIntensity: 1,
  transmission: 0,
  ior: 1.5,
  thickness: 0.5,
  flatShading: false,
  side: 'front',
}

export const DEFAULT_GEOMETRY: GeometryConfig = { type: 'box', width: 1, height: 1, depth: 1, segments: 1 }

export const DEFAULT_LIGHT: LightConfig = {
  type: 'point',
  intensity: 1,
  color: '#ffffff',
  distance: 20,
  decay: 2,
  angle: Math.PI / 4,
  penumbra: 0.1,
  castShadow: true,
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
  enabled: false,
  type: 'dynamic',
  shape: 'auto',
  mass: 1,
  restitution: 0.3,
  friction: 0.5,
  linearDamping: 0.1,
  gravityScale: 1,
}

export const MATERIAL_PRESETS: Record<string, Partial<MaterialConfig>> = {
  gold: { color: '#d4a017', roughness: 0.1, metalness: 1.0, emissive: '#000000' },
  chrome: { color: '#aaaaaa', roughness: 0.05, metalness: 1.0 },
  rubber: { color: '#1a1a1a', roughness: 0.9, metalness: 0.0 },
  wood: { color: '#8B4513', roughness: 0.8, metalness: 0.0 },
  concrete: { color: '#6b6b6b', roughness: 0.95, metalness: 0.0 },
  glass: { type: 'glass', color: '#ffffff', roughness: 0.0, metalness: 0.0, transmission: 1, ior: 1.5, opacity: 0.1, transparent: true },
  neon: { color: '#00ffff', emissive: '#00ffff', emissiveIntensity: 2.0, roughness: 0.9, metalness: 0.0 },
  hologram: { type: 'hologram', color: '#00aaff', emissive: '#00aaff', emissiveIntensity: 1.5, opacity: 0.7, transparent: true },
  ceramic: { color: '#f5f5dc', roughness: 0.3, metalness: 0.0 },
  skin: { color: '#e8b89a', roughness: 0.7, metalness: 0.0 },
  lava: { color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 1.5, roughness: 0.8, metalness: 0.0 },
  ice: { type: 'physical', color: '#c8e8ff', roughness: 0.0, metalness: 0.0, transmission: 0.8, ior: 1.31, transparent: true },
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface SceneActions {
  addObject: (config: Partial<Omit<SceneObject, 'id'>>) => string
  updateObject: (id: string, patch: DeepPartial<SceneObject>) => void
  removeObject: (id: string) => void
  duplicateObject: (id: string, offset?: [number, number, number]) => string
  groupObjects: (ids: string[], name: string) => string
  ungroupObject: (id: string) => void
  reparent: (id: string, newParentId: string | null) => void

  selectObject: (id: string, multi?: boolean, range?: boolean) => void
  deselectAll: () => void
  selectAll: () => void
  setSelectedIds: (ids: string[]) => void

  setActiveTool: (tool: ActiveTool) => void
  setTransformSpace: (space: 'local' | 'world') => void
  setSnapEnabled: (v: boolean) => void
  setSnapSize: (v: number) => void

  setEnvironment: (patch: Partial<EnvironmentState>) => void
  setPostFX: (patch: Partial<PostFXState>) => void

  togglePanel: (panel: 'left' | 'right' | 'bottom') => void
  setPanelTab: (side: 'left' | 'right' | 'bottom', tab: string) => void

  setPlaying: (v: boolean) => void
  setPhysicsEnabled: (v: boolean) => void

  setPlayhead: (t: number) => void
  setAnimating: (v: boolean) => void

  setFPS: (fps: number) => void
  setShowStats: (v: boolean) => void
  setCameraMode: (mode: 'orbit' | 'fly') => void
  setViewMode: (mode: 'persp' | 'top' | 'front' | 'right') => void
  setCameraFov: (fov: number) => void

  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void
  setBakePreview: (url: string | null) => void
  setBakeBlend: (v: number) => void

  pushHistory: () => void
  undo: () => void
  redo: () => void

  addKeyframe: (objectId: string, time: number) => void
  removeKeyframe: (objectId: string, time: number) => void
  clearKeyframes: (objectId: string) => void

  saveCurrentScene: () => void
  switchScene: (id: string) => void
  addScene: (name?: string) => string
  duplicateScene: (id: string) => string
  removeScene: (id: string) => void
  renameScene: (id: string, name: string) => void
}

export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }

interface SceneState extends SceneActions {
  objects: Record<string, SceneObject>
  rootIds: string[]
  selectedIds: string[]

  activeTool: ActiveTool
  transformSpace: 'local' | 'world'
  snapEnabled: boolean
  snapSize: number

  environment: EnvironmentState
  postFX: PostFXState
  panels: PanelState

  physicsEnabled: boolean
  isPlaying: boolean
  physicsGravity: [number, number, number]

  playhead: number
  isAnimating: boolean
  animDuration: number

  showStats: boolean
  fps: number
  cameraMode: 'orbit' | 'fly'
  viewMode: 'persp' | 'top' | 'front' | 'right'
  cameraFov: number

  notification: { message: string; type: 'success' | 'error' | 'info'; id: string } | null
  bakePreviewUrl: string | null
  bakeBlend: number

  past: string[]
  future: string[]

  scenes: SceneSnapshot[]
  activeSceneId: string
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

let _notifTimer: ReturnType<typeof setTimeout> | null = null

function createDefault(config: Partial<Omit<SceneObject, 'id'>>): SceneObject {
  const id = makeId()
  const isLight = config.type === 'light'
  return {
    id,
    name: config.name ?? (isLight ? 'Light' : 'Object'),
    type: config.type ?? 'mesh',
    geometry: config.geometry ?? DEFAULT_GEOMETRY,
    material: { ...DEFAULT_MATERIAL, ...config.material },
    light: config.light ?? (isLight ? { ...DEFAULT_LIGHT } : null),
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      ...(config.transform ?? {}),
    },
    animation: config.animation ?? null,
    physics: config.physics ?? null,
    children: [],
    parentId: null,
    visible: true,
    locked: false,
    tags: [],
    expanded: false,
    castShadow: config.castShadow ?? true,
    receiveShadow: config.receiveShadow ?? true,
  }
}

function snapshotObjects(objects: Record<string, SceneObject>, rootIds: string[]): string {
  return JSON.stringify({ objects, rootIds })
}

function restoreSnapshot(snap: string): { objects: Record<string, SceneObject>; rootIds: string[] } {
  return JSON.parse(snap)
}

export const useScene = create<SceneState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      objects: {},
      rootIds: [],
      selectedIds: [],

      activeTool: 'select',
      transformSpace: 'world',
      snapEnabled: false,
      snapSize: 0.5,

      environment: {
        hdriUrl: null,
        hdriName: 'None',
        hdriIntensity: 1,
        hdriRotation: 0,
        showBackground: true,
        fogType: 'none',
        fogColor: '#aaaaaa',
        fogNear: 10,
        fogFar: 100,
        fogDensity: 0.02,
        ambientColor: '#ffffff',
        ambientIntensity: 0.3,
        backgroundColor: '#0B0C0F',
        directionalColor: '#ffffff',
        directionalIntensity: 1.5,
        directionalPosition: [5, 10, 5],
        shadowsEnabled: true,
        shadowMapSize: 2048,
        skyEnabled: false,
        skyTurbidity: 10,
        skyRayleigh: 3,
        sunElevation: 45,
        sunAzimuth: 180,
      },

      postFX: {
        bloom: true,
        bloomIntensity: 0.4,
        bloomThreshold: 0.85,
        bloomSmoothing: 0.025,
        vignette: true,
        vignetteOffset: 0.35,
        vignetteDarkness: 0.5,
        noise: true,
        noiseOpacity: 0.03,
        chromaticAberration: false,
        chromaticOffset: 0.002,
        toneMappingExposure: 1,
      },

      panels: {
        leftOpen: true,
        rightOpen: true,
        bottomOpen: false,
        leftTab: 'outliner',
        rightTab: 'chat',
        bottomTab: 'animation',
      },

      physicsEnabled: false,
      isPlaying: false,
      physicsGravity: [0, -9.81, 0],

      playhead: 0,
      isAnimating: false,
      animDuration: 8,

      showStats: false,
      fps: 60,
      cameraMode: 'orbit',
      viewMode: 'persp',
      cameraFov: 60,

      notification: null,
      bakePreviewUrl: null,
      bakeBlend: 0.5,

      past: [],
      future: [],

      scenes: [],
      activeSceneId: 'default',

      // ── Object CRUD ──────────────────────────────────────────────────────

      addObject(config) {
        const obj = createDefault(config)
        set((s) => {
          s.past.push(snapshotObjects(s.objects, s.rootIds))
          s.future = []
          s.objects[obj.id] = obj
          if (obj.parentId && s.objects[obj.parentId]) {
            s.objects[obj.parentId].children.push(obj.id)
          } else {
            s.rootIds.push(obj.id)
          }
          s.selectedIds = [obj.id]
        })
        return obj.id
      },

      updateObject(id, patch) {
        set((s) => {
          const obj = s.objects[id]
          if (!obj) return
          function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
            for (const k of Object.keys(source)) {
              if (source[k] !== null && typeof source[k] === 'object' && !Array.isArray(source[k]) && typeof target[k] === 'object' && target[k] !== null) {
                deepMerge(target[k] as Record<string, unknown>, source[k] as Record<string, unknown>)
              } else {
                target[k] = source[k]
              }
            }
          }
          deepMerge(obj as unknown as Record<string, unknown>, patch as Record<string, unknown>)
        })
      },

      removeObject(id) {
        set((s) => {
          s.past.push(snapshotObjects(s.objects, s.rootIds))
          s.future = []
          const obj = s.objects[id]
          if (!obj) return
          // Remove from parent or rootIds
          if (obj.parentId && s.objects[obj.parentId]) {
            s.objects[obj.parentId].children = s.objects[obj.parentId].children.filter((c) => c !== id)
          } else {
            s.rootIds = s.rootIds.filter((i) => i !== id)
          }
          // Recursively delete children
          function deleteTree(oid: string) {
            const o = s.objects[oid]
            if (!o) return
            for (const c of o.children) deleteTree(c)
            delete s.objects[oid]
          }
          deleteTree(id)
          s.selectedIds = s.selectedIds.filter((i) => i !== id)
        })
      },

      duplicateObject(id, offset = [1, 0, 1]) {
        const orig = get().objects[id]
        if (!orig) return id
        const copy = createDefault({
          ...JSON.parse(JSON.stringify(orig)),
          name: `${orig.name} (copy)`,
          transform: {
            ...orig.transform,
            position: [
              orig.transform.position[0] + offset[0],
              orig.transform.position[1] + offset[1],
              orig.transform.position[2] + offset[2],
            ],
          },
        })
        set((s) => {
          s.past.push(snapshotObjects(s.objects, s.rootIds))
          s.future = []
          s.objects[copy.id] = copy
          s.rootIds.push(copy.id)
          s.selectedIds = [copy.id]
        })
        return copy.id
      },

      groupObjects(ids, name) {
        const groupId = makeId()
        set((s) => {
          s.past.push(snapshotObjects(s.objects, s.rootIds))
          s.future = []
          const group: SceneObject = {
            id: groupId,
            name,
            type: 'group',
            geometry: DEFAULT_GEOMETRY,
            material: { ...DEFAULT_MATERIAL },
            light: null,
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            animation: null,
            physics: null,
            children: [...ids],
            parentId: null,
            visible: true,
            locked: false,
            tags: [],
            expanded: true,
            castShadow: false,
            receiveShadow: false,
          }
          s.objects[groupId] = group
          s.rootIds.push(groupId)
          for (const id of ids) {
            if (s.objects[id]) {
              s.objects[id].parentId = groupId
              s.rootIds = s.rootIds.filter((r) => r !== id)
            }
          }
          s.selectedIds = [groupId]
        })
        return groupId
      },

      ungroupObject(id) {
        set((s) => {
          const obj = s.objects[id]
          if (!obj || obj.type !== 'group') return
          for (const cid of obj.children) {
            if (s.objects[cid]) {
              s.objects[cid].parentId = null
              s.rootIds.push(cid)
            }
          }
          s.rootIds = s.rootIds.filter((r) => r !== id)
          delete s.objects[id]
          s.selectedIds = []
        })
      },

      reparent(id, newParentId) {
        set((s) => {
          const obj = s.objects[id]
          if (!obj) return
          // Remove from old parent
          if (obj.parentId && s.objects[obj.parentId]) {
            s.objects[obj.parentId].children = s.objects[obj.parentId].children.filter((c) => c !== id)
          } else {
            s.rootIds = s.rootIds.filter((r) => r !== id)
          }
          obj.parentId = newParentId
          if (newParentId && s.objects[newParentId]) {
            s.objects[newParentId].children.push(id)
          } else {
            s.rootIds.push(id)
          }
        })
      },

      // ── Selection ────────────────────────────────────────────────────────

      selectObject(id, multi = false) {
        set((s) => {
          if (multi) {
            if (s.selectedIds.includes(id)) {
              s.selectedIds = s.selectedIds.filter((i) => i !== id)
            } else {
              s.selectedIds.push(id)
            }
          } else {
            s.selectedIds = [id]
          }
          // Auto-open left panel to material if we have a selection
          if (s.selectedIds.length === 1) {
            s.panels.leftOpen = true
          }
        })
      },

      deselectAll() {
        set((s) => { s.selectedIds = [] })
      },

      selectAll() {
        set((s) => { s.selectedIds = Object.keys(s.objects) })
      },

      setSelectedIds(ids) {
        set((s) => { s.selectedIds = ids })
      },

      // ── Tools ────────────────────────────────────────────────────────────

      setActiveTool(tool) {
        set((s) => { s.activeTool = tool })
      },

      setTransformSpace(space) {
        set((s) => { s.transformSpace = space })
      },

      setSnapEnabled(v) {
        set((s) => { s.snapEnabled = v })
      },

      setSnapSize(v) {
        set((s) => { s.snapSize = v })
      },

      // ── Environment / PostFX ─────────────────────────────────────────────

      setEnvironment(patch) {
        set((s) => { Object.assign(s.environment, patch) })
      },

      setPostFX(patch) {
        set((s) => { Object.assign(s.postFX, patch) })
      },

      // ── Panels ───────────────────────────────────────────────────────────

      togglePanel(panel) {
        set((s) => {
          if (panel === 'left') s.panels.leftOpen = !s.panels.leftOpen
          if (panel === 'right') s.panels.rightOpen = !s.panels.rightOpen
          if (panel === 'bottom') s.panels.bottomOpen = !s.panels.bottomOpen
        })
      },

      setPanelTab(side, tab) {
        set((s) => {
          if (side === 'left') s.panels.leftTab = tab as PanelState['leftTab']
          if (side === 'right') s.panels.rightTab = tab as PanelState['rightTab']
          if (side === 'bottom') s.panels.bottomTab = tab as PanelState['bottomTab']
        })
      },

      // ── Physics / Play ───────────────────────────────────────────────────

      setPlaying(v) {
        set((s) => { s.isPlaying = v })
      },

      setPhysicsEnabled(v) {
        set((s) => { s.physicsEnabled = v })
      },

      // ── Animation ────────────────────────────────────────────────────────

      setPlayhead(t) {
        set((s) => { s.playhead = t })
      },

      setAnimating(v) {
        set((s) => { s.isAnimating = v })
      },

      // ── Stats / Camera ───────────────────────────────────────────────────

      setFPS(fps) {
        set((s) => { s.fps = fps })
      },

      setShowStats(v) {
        set((s) => { s.showStats = v })
      },

      setCameraMode(mode) {
        set((s) => { s.cameraMode = mode })
      },

      setViewMode(mode) {
        set((s) => { s.viewMode = mode })
      },

      setCameraFov(fov) {
        set((s) => { s.cameraFov = fov })
      },

      // ── Notifications ─────────────────────────────────────────────────────

      showNotification(msg, type = 'success') {
        if (_notifTimer) clearTimeout(_notifTimer)
        const id = makeId()
        set((s) => { s.notification = { message: msg, type, id } })
        _notifTimer = setTimeout(() => set((s) => { s.notification = null }), 3000)
      },

      setBakePreview(url) { set((s) => { s.bakePreviewUrl = url }) },
      setBakeBlend(v) { set((s) => { s.bakeBlend = v }) },

      // ── Undo / Redo ──────────────────────────────────────────────────────

      pushHistory() {
        set((s) => {
          s.past.push(snapshotObjects(s.objects, s.rootIds))
          if (s.past.length > 50) s.past.shift()
          s.future = []
        })
      },

      undo() {
        set((s) => {
          if (!s.past.length) return
          const snap = s.past.pop()!
          s.future.unshift(snapshotObjects(s.objects, s.rootIds))
          const restored = restoreSnapshot(snap)
          s.objects = restored.objects
          s.rootIds = restored.rootIds
          s.selectedIds = []
        })
      },

      redo() {
        set((s) => {
          if (!s.future.length) return
          const snap = s.future.shift()!
          s.past.push(snapshotObjects(s.objects, s.rootIds))
          const restored = restoreSnapshot(snap)
          s.objects = restored.objects
          s.rootIds = restored.rootIds
          s.selectedIds = []
        })
      },

      // ── Keyframes ────────────────────────────────────────────────────────

      addKeyframe(objectId, time) {
        const obj = get().objects[objectId]
        if (!obj) return
        set((s) => {
          const o = s.objects[objectId]
          if (!o) return
          if (!o.animation) {
            o.animation = { preset: 'none', speed: 1, amplitude: 0.5, offset: 0, axis: 'y', keyframes: [] }
          }
          const kfs = o.animation.keyframes ?? []
          const existing = kfs.findIndex((k) => Math.abs(k.time - time) < 0.05)
          const kf: Keyframe = { time, transform: JSON.parse(JSON.stringify(o.transform)) }
          if (existing >= 0) kfs[existing] = kf
          else kfs.push(kf)
          kfs.sort((a, b) => a.time - b.time)
          o.animation.keyframes = kfs
        })
      },

      removeKeyframe(objectId, time) {
        set((s) => {
          const o = s.objects[objectId]
          if (!o?.animation?.keyframes) return
          o.animation.keyframes = o.animation.keyframes.filter((k) => Math.abs(k.time - time) >= 0.05)
        })
      },

      clearKeyframes(objectId) {
        set((s) => {
          const o = s.objects[objectId]
          if (o?.animation) o.animation.keyframes = []
        })
      },

      // ── Scenes ───────────────────────────────────────────────────────────

      saveCurrentScene() {
        set((s) => {
          const snap: SceneSnapshot = {
            id: s.activeSceneId,
            name: s.scenes.find((sc) => sc.id === s.activeSceneId)?.name ?? 'Scene 1',
            objects: JSON.parse(JSON.stringify(s.objects)),
            rootIds: [...s.rootIds],
            environment: JSON.parse(JSON.stringify(s.environment)),
            postFX: JSON.parse(JSON.stringify(s.postFX)),
            createdAt: Date.now(),
          }
          const idx = s.scenes.findIndex((sc) => sc.id === s.activeSceneId)
          if (idx >= 0) s.scenes[idx] = snap
          else s.scenes.push(snap)
        })
      },

      switchScene(id) {
        const state = get()
        // Save current
        const currentSnap: SceneSnapshot = {
          id: state.activeSceneId,
          name: state.scenes.find((sc) => sc.id === state.activeSceneId)?.name ?? 'Scene 1',
          objects: JSON.parse(JSON.stringify(state.objects)),
          rootIds: [...state.rootIds],
          environment: JSON.parse(JSON.stringify(state.environment)),
          postFX: JSON.parse(JSON.stringify(state.postFX)),
          createdAt: Date.now(),
        }
        const target = state.scenes.find((sc) => sc.id === id)
        if (!target) return
        set((s) => {
          const idx = s.scenes.findIndex((sc) => sc.id === s.activeSceneId)
          if (idx >= 0) s.scenes[idx] = currentSnap
          else s.scenes.push(currentSnap)
          s.objects = JSON.parse(JSON.stringify(target.objects))
          s.rootIds = [...target.rootIds]
          s.environment = JSON.parse(JSON.stringify(target.environment))
          s.postFX = JSON.parse(JSON.stringify(target.postFX))
          s.activeSceneId = id
          s.selectedIds = []
          s.past = []
          s.future = []
        })
      },

      addScene(name) {
        const newId = makeId()
        const sceneCount = get().scenes.length + 1
        const sceneName = name ?? `Scene ${sceneCount}`
        const state = get()
        // Save current scene first
        const currentSnap: SceneSnapshot = {
          id: state.activeSceneId,
          name: state.scenes.find((sc) => sc.id === state.activeSceneId)?.name ?? 'Scene 1',
          objects: JSON.parse(JSON.stringify(state.objects)),
          rootIds: [...state.rootIds],
          environment: JSON.parse(JSON.stringify(state.environment)),
          postFX: JSON.parse(JSON.stringify(state.postFX)),
          createdAt: Date.now(),
        }
        const newSnap: SceneSnapshot = {
          id: newId,
          name: sceneName,
          objects: {},
          rootIds: [],
          environment: JSON.parse(JSON.stringify(state.environment)),
          postFX: JSON.parse(JSON.stringify(state.postFX)),
          createdAt: Date.now(),
        }
        set((s) => {
          const idx = s.scenes.findIndex((sc) => sc.id === s.activeSceneId)
          if (idx >= 0) s.scenes[idx] = currentSnap
          else s.scenes.push(currentSnap)
          s.scenes.push(newSnap)
          s.objects = {}
          s.rootIds = []
          s.activeSceneId = newId
          s.selectedIds = []
          s.past = []
          s.future = []
        })
        return newId
      },

      duplicateScene(id) {
        const state = get()
        const src = state.scenes.find((sc) => sc.id === id) ?? {
          id: state.activeSceneId,
          name: state.scenes.find((sc) => sc.id === state.activeSceneId)?.name ?? 'Scene 1',
          objects: JSON.parse(JSON.stringify(state.objects)),
          rootIds: [...state.rootIds],
          environment: JSON.parse(JSON.stringify(state.environment)),
          postFX: JSON.parse(JSON.stringify(state.postFX)),
          createdAt: Date.now(),
        }
        const newId = makeId()
        const dup: SceneSnapshot = { ...JSON.parse(JSON.stringify(src)), id: newId, name: `${src.name} (copy)`, createdAt: Date.now() }
        set((s) => { s.scenes.push(dup) })
        return newId
      },

      removeScene(id) {
        set((s) => {
          if (s.scenes.length <= 1) return
          s.scenes = s.scenes.filter((sc) => sc.id !== id)
          if (s.activeSceneId === id) {
            const next = s.scenes[0]
            s.objects = JSON.parse(JSON.stringify(next.objects))
            s.rootIds = [...next.rootIds]
            s.environment = JSON.parse(JSON.stringify(next.environment))
            s.postFX = JSON.parse(JSON.stringify(next.postFX))
            s.activeSceneId = next.id
            s.selectedIds = []
            s.past = []
            s.future = []
          }
        })
      },

      renameScene(id, name) {
        set((s) => {
          const sc = s.scenes.find((x) => x.id === id)
          if (sc) sc.name = name
        })
      },
    }))
  )
)

const SCENE_STORAGE_KEY = 'wbp-scene-v2'

// Persist to localStorage
if (typeof window !== 'undefined') {
  useScene.subscribe(
    (s) => ({ objects: s.objects, rootIds: s.rootIds, environment: s.environment, postFX: s.postFX, scenes: s.scenes, activeSceneId: s.activeSceneId }),
    (state) => {
      clearTimeout((window as typeof window & { _persistTimer?: ReturnType<typeof setTimeout> })._persistTimer)
      ;(window as typeof window & { _persistTimer?: ReturnType<typeof setTimeout> })._persistTimer = setTimeout(() => {
        try {
          localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(state))
        } catch {}
      }, 500)
    }
  )
}

export function loadPersistedScene() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(SCENE_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return
    const objects: Record<string, SceneObject> = {}
    for (const [id, obj] of Object.entries(data.objects ?? {})) {
      const o = obj as Partial<SceneObject>
      objects[id] = {
        id,
        name: o.name ?? 'Object',
        type: o.type ?? 'mesh',
        geometry: o.geometry ?? DEFAULT_GEOMETRY,
        material: { ...DEFAULT_MATERIAL, ...(o.material ?? {}) },
        light: o.light ?? null,
        transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1], ...(o.transform ?? {}) },
        animation: o.animation ?? null,
        physics: o.physics ?? null,
        children: Array.isArray(o.children) ? o.children : [],
        parentId: o.parentId ?? null,
        visible: o.visible ?? true,
        locked: o.locked ?? false,
        tags: Array.isArray(o.tags) ? o.tags : [],
        expanded: o.expanded ?? false,
        castShadow: o.castShadow ?? true,
        receiveShadow: o.receiveShadow ?? true,
      }
    }
    useScene.setState((s) => {
      s.objects = objects
      s.rootIds = Array.isArray(data.rootIds) ? data.rootIds : []
      s.environment = { ...s.environment, ...data.environment }
      s.postFX = { ...s.postFX, ...data.postFX }
      if (Array.isArray(data.scenes)) s.scenes = data.scenes
      if (data.activeSceneId) s.activeSceneId = data.activeSceneId
    })
  } catch {}
}
