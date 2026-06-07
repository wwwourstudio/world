import type { SceneObject, MaterialConfig, GeometryConfig, LightConfig, AnimationConfig, PhysicsConfig, Transform, BehaviorConfig, HtmlObjectConfig } from '@/lib/scene/SceneStore'
import { MATERIAL_PRESETS } from '@/lib/scene/SceneStore'
import { useScene } from '@/lib/scene/SceneStore'
import { getTemplate } from '@/lib/ai/WorldTemplates'
import { resolveObjectQuery } from '@/lib/ai/resolveObjectQuery'
import { saveWorld, listWorlds, restoreWorldToStore } from '@/lib/worlds/WorldStore'

// Types for commands Claude emits
export interface AddObjectCmd {
  action: 'add_object'
  type?: 'mesh' | 'light' | 'group'
  geometry?: string
  name?: string
  size?: [number, number, number] | number
  radius?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  material?: string | Partial<MaterialConfig>
  color?: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  opacity?: number
  castShadow?: boolean
}

export interface AddLightCmd {
  action: 'add_light'
  lightType?: string
  type?: string
  color?: string
  intensity?: number
  distance?: number
  angle?: number
  penumbra?: number
  position?: [number, number, number]
  castShadow?: boolean
}

export interface SetMaterialCmd {
  action: 'set_material'
  objectId?: string
  preset?: string
  type?: string
  color?: string
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
  transmission?: number
  ior?: number
}

export interface SetHDRICmd {
  action: 'set_hdri'
  name?: string
  url?: string
  intensity?: number
  rotation?: number
}

export interface SetFogCmd {
  action: 'set_fog'
  type?: 'none' | 'linear' | 'exponential'
  color?: string
  density?: number
  near?: number
  far?: number
}

export interface SetCameraCmd {
  action: 'set_camera'
  position?: [number, number, number]
  target?: [number, number, number]
  fov?: number
}

export interface AddAnimationCmd {
  action: 'add_animation'
  objectId?: string
  objectName?: string
  preset?: string
  speed?: number
  amplitude?: number
  axis?: 'x' | 'y' | 'z'
}

export interface EnablePhysicsCmd {
  action: 'enable_physics'
  objectId?: string
  objectName?: string
  bodyType?: string
  type?: string
  shape?: string
  mass?: number
  restitution?: number
}

export interface SetEnvironmentCmd {
  action: 'set_environment'
  ambientColor?: string
  ambientIntensity?: number
  backgroundColor?: string
  directionalColor?: string
  directionalIntensity?: number
  // Sky / atmospheric scattering
  skyEnabled?: boolean
  sunElevation?: number   // degrees above horizon (0–90). 30 = midday, 5 = golden hour, 0 = sunset
  sunAzimuth?: number     // degrees, compass heading 0–360
  skyTurbidity?: number   // haze 1–20; 3 = clear, 10 = hazy, 20 = overcast
  skyRayleigh?: number    // blue sky scattering 1–6; default 3
}

export interface AddGrassCmd {
  action: 'add_grass'
  name?: string
  position?: [number, number, number]
  count?: number          // blade count 2000–30000 (default 8000)
  patchRadius?: number    // spread radius meters (default 15)
  bladeHeight?: number    // meters (default 0.5)
  bladeWidth?: number     // meters (default 0.04)
  windStrength?: number   // 0–2 (default 0.6)
  windSpeed?: number      // 1–4 (default 1.8)
  color?: string          // hex (default '#3a7a2a')
  colorVariation?: number // 0–1 (default 0.3)
  snapToTerrain?: boolean // default true
}

export interface DeleteObjectCmd {
  action: 'delete_object'
  id?: string
  name?: string
}

export interface DuplicateObjectCmd {
  action: 'duplicate_object'
  id?: string
  name?: string
  offset?: [number, number, number]
}

export interface GroupObjectsCmd {
  action: 'group_objects'
  ids?: string[]
  names?: string[]
  groupName?: string
  name?: string
}

export interface LoadTemplateCmd {
  action: 'load_template'
  name?: string
  id?: string
}

export interface SetPostFXCmd {
  action: 'set_postfx'
  bloom?: boolean
  bloomIntensity?: number
  vignette?: boolean
  noise?: boolean
  chromaticAberration?: boolean
  ssao?: boolean
  ssaoIntensity?: number
  ssaoRadius?: number
  dof?: boolean
  dofFocusDistance?: number
  dofFocalLength?: number
  dofBokehScale?: number
}

export interface AddTextCmd {
  action: 'add_text'
  text?: string
  fontSize?: number
  position?: [number, number, number]
  color?: string
  material?: string
  font?: 'helvetiker' | 'optimer' | 'gentilis'
  depth?: number
}

export interface AddKeyframeAnimationCmd {
  action: 'add_keyframe_animation'
  objectName?: string
  objectId?: string
  keyframes: Array<{
    time: number
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
  }>
}

export interface SubdivideMeshCmd {
  action: 'subdivide_mesh'
  target?: string        // object name match (omit = selected)
  targetId?: string
  levels?: number        // subdivision levels 1-3 (default 1)
}

export interface BooleanOperationCmd {
  action: 'boolean_operation'
  objectA?: string       // target object name (omit = selected)
  objectAId?: string
  objectB: string        // cutter/tool object name
  objectBId?: string
  operation: 'union' | 'subtract' | 'intersect'
  deleteB?: boolean      // remove objectB after operation (default true)
}

export interface SculptMeshCmd {
  action: 'sculpt_mesh'
  target?: string
  targetId?: string
  brushType?: 'raise' | 'lower' | 'smooth' | 'flatten' | 'inflate'
  position?: [number, number, number]
  radius?: number
  strength?: number
}

export interface AddSceneCmd {
  action: 'add_scene'
  name?: string
}

export interface AddParticleCmd {
  action: 'add_particle'
  preset?: 'scatter' | 'rain' | 'snow' | 'leaves' | 'sparks' | 'fire' | 'smoke' | 'magic' | 'custom'
  count?: number
  spread?: [number, number, number]
  instanceGeometry?: 'sphere' | 'box' | 'cone' | 'tetrahedron'
  instanceScale?: number
  position?: [number, number, number]
  color?: string
  name?: string
  // Advanced physics & appearance
  lifetime?: number
  emitterShape?: 'point' | 'sphere' | 'box' | 'cone' | 'hemisphere' | 'ring'
  gravityFactor?: number
  drag?: number
  turbulence?: number
  velocityX?: number
  velocityY?: number
  velocityZ?: number
  renderMode?: 'mesh' | 'billboard' | 'point'
  opacityStart?: number
  opacityEnd?: number
  glowIntensity?: number
}

export interface ScatterObjectsCmd {
  action: 'scatter_objects'
  objectId?: string
  objectName?: string
  count?: number
  spread?: [number, number, number]
}

export interface SetViewModeCmd {
  action: 'set_view_mode'
  mode?: 'persp' | 'top' | 'front' | 'right' | 'left' | 'iso'
  fov?: number
}

export interface SetCameraClipCmd {
  action: 'set_camera_clip'
  near?: number
  far?: number
}

export interface UpdateObjectCmd {
  action: 'update_object'
  target: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  color?: string
  roughness?: number
  metalness?: number
  opacity?: number
  emissive?: string
  emissiveIntensity?: number
  visible?: boolean
}

export interface AddHtmlCmd {
  action: 'add_html'
  htmlType?: 'heading' | 'paragraph' | 'button' | 'badge' | 'card' | 'quote' | 'stat' | 'divider' | 'spacer' | 'icontext' | 'form' | 'countdown'
  content?: string
  position?: [number, number, number]
  name?: string
  color?: string
  fontSize?: number
}

export interface DelegateToAgentCmd {
  action: 'delegate_to_agent'
  agent: 'terrain_sculptor' | 'asset_populator' | 'mesh_editor' | 'lighting_director' | 'performance_guardian' | 'director'
  task: string
}

export interface OrchestrateMultiAgentCmd {
  action: 'orchestrate_multi_agent'
  vision: string
  steps?: Array<{ agent: string; task: string }>
}

export interface SaveWorldCmd {
  action: 'save_world'
  name: string
  description?: string
}

export interface LoadWorldCmd {
  action: 'load_world'
  name?: string
  id?: string
}

export interface ListWorldsCmd {
  action: 'list_worlds'
}

export interface AddTerrainCmd {
  action: 'add_terrain'
  size?: number
  heightScale?: number
  noiseScale?: number
  seed?: number
  layers?: number
  lowColor?: string
  midColor?: string
  highColor?: string
  position?: [number, number, number]
  name?: string
  // Extended terrain quality params
  domainWarp?: number
  worleyBlend?: number
  erosionSteps?: number
  biome?: string
}

export interface AddWaterCmd {
  action: 'add_water'
  size?: number
  color?: string
  opacity?: number
  waveHeight?: number
  waveSpeed?: number
  position?: [number, number, number]
  name?: string
}

export interface SetVisibilityCmd {
  action: 'set_visibility'
  target: string
  visible: boolean
}

export interface AddCameraKeypointCmd {
  action: 'add_camera_keypoint'
  label?: string
  position?: [number, number, number]
  target?: [number, number, number]
  fov?: number
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out'
}

export interface ClearCameraPathCmd {
  action: 'clear_camera_path'
}

export interface SketchfabFilters {
  animated?: boolean    // only animated models
  rigged?: boolean      // only rigged/skinned models
  pbr?: boolean         // only PBR-material models
  staffpicked?: boolean // only Sketchfab staff-curated models
  cc0?: boolean         // Creative Commons Zero license
}

export interface AddSketchfabModelCmd {
  action: 'add_sketchfab_model'
  query: string
  name?: string
  count?: number
  variety?: number
  layout?: 'grid' | 'line' | 'circle' | 'scatter'
  spacing?: number
  position?: [number, number, number]
  yOffset?: number
  rotation?: [number, number, number]
  scale?: [number, number, number]
  targetSize?: number     // real-world largest dimension in meters (building ~25, prop ~1)
  filters?: SketchfabFilters
  snapToTerrain?: boolean // auto-snap model base to terrain height at placement XZ
}

export interface PopulateSceneCmd {
  action: 'populate_scene_with_assets'
  theme?: string
  density?: 'sparse' | 'normal' | 'dense'
  snapToTerrain?: boolean
  models: Array<{
    query: string
    count: number
    layout?: 'grid' | 'line' | 'circle' | 'scatter'
    spacing?: number
    targetSize?: number
    filters?: SketchfabFilters
    position?: [number, number, number]
    yOffset?: number
  }>
}

export interface SetTextureCmd {
  action: 'set_texture'
  query: string              // natural-language texture description, e.g. "mossy grass"
  target?: string            // object name match; omit = apply to currently selected objects
  repeat?: [number, number]  // UV tile repeat; default [2,2]; use [8,16] for large ground planes
}

export interface UpdateTerrainCmd {
  action: 'update_terrain'
  target?: string         // terrain object name; default = first terrain in scene
  seed?: number
  heightScale?: number
  noiseScale?: number
  layers?: number
  domainWarp?: number     // 0–1.5; higher = more geological distortion
  worleyBlend?: number    // 0–1; adds rocky crater/pitting features
  erosionSteps?: number   // 0–8 thermal erosion passes
  biome?: string          // forest|highland|desert|arctic|volcanic|canyon
  lowColor?: string
  midColor?: string
  highColor?: string
}

export type SceneCommand =
  | AddObjectCmd | AddLightCmd | SetMaterialCmd | SetHDRICmd | SetFogCmd
  | SetCameraCmd | AddAnimationCmd | EnablePhysicsCmd | SetEnvironmentCmd
  | DeleteObjectCmd | DuplicateObjectCmd | GroupObjectsCmd | LoadTemplateCmd | SetPostFXCmd
  | AddTextCmd | AddParticleCmd | ScatterObjectsCmd | SetViewModeCmd
  | AddKeyframeAnimationCmd | AddSceneCmd | SetCameraClipCmd | UpdateObjectCmd
  | AddHtmlCmd | AddTerrainCmd | AddWaterCmd | SetVisibilityCmd
  | AddCameraKeypointCmd | ClearCameraPathCmd | AddSketchfabModelCmd
  | SetTextureCmd | UpdateTerrainCmd | PopulateSceneCmd | AddGrassCmd
  | SubdivideMeshCmd | BooleanOperationCmd | SculptMeshCmd
  | SaveWorldCmd | LoadWorldCmd | ListWorldsCmd
  | DelegateToAgentCmd | OrchestrateMultiAgentCmd

export function isDelegateCmd(cmd: SceneCommand): cmd is DelegateToAgentCmd {
  return cmd.action === 'delegate_to_agent'
}

export function isOrchestrateCmd(cmd: SceneCommand): cmd is OrchestrateMultiAgentCmd {
  return cmd.action === 'orchestrate_multi_agent'
}

export function isSketchfabCmd(cmd: SceneCommand): cmd is AddSketchfabModelCmd {
  return cmd.action === 'add_sketchfab_model'
}

export function isTextureCmd(cmd: SceneCommand): cmd is SetTextureCmd {
  return cmd.action === 'set_texture'
}

export function isPopulateSceneCmd(cmd: SceneCommand): cmd is PopulateSceneCmd {
  return cmd.action === 'populate_scene_with_assets'
}

export function computeLayoutPositions(
  count: number,
  layout: 'grid' | 'line' | 'circle' | 'scatter',
  origin: [number, number, number],
  spacing: number,
  yOffset: number,
): Array<[number, number, number]> {
  const positions: Array<[number, number, number]> = []
  const n = Math.max(count, 1)

  if (layout === 'grid') {
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const startX = origin[0] - ((cols - 1) * spacing) / 2
    const startZ = origin[2] - ((rows - 1) * spacing) / 2
    for (let i = 0; i < n; i++) {
      positions.push([startX + (i % cols) * spacing, origin[1] + yOffset, startZ + Math.floor(i / cols) * spacing])
    }
  } else if (layout === 'line') {
    const startX = origin[0] - ((n - 1) * spacing) / 2
    for (let i = 0; i < n; i++) {
      positions.push([startX + i * spacing, origin[1] + yOffset, origin[2]])
    }
  } else if (layout === 'circle') {
    const r = n > 1 ? (n * spacing) / (2 * Math.PI) : 0
    const step = (2 * Math.PI) / n
    for (let i = 0; i < n; i++) {
      positions.push([origin[0] + Math.cos(i * step) * r, origin[1] + yOffset, origin[2] + Math.sin(i * step) * r])
    }
  } else {
    // scatter — deterministic LCG so positions don't jitter on re-render
    const spread = spacing * Math.sqrt(n)
    let seed = (Math.abs(Math.floor(origin[0] * 100 + origin[2] * 100)) + n) || 1
    function lcg() {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      return (seed >>> 0) / 0xffffffff
    }
    for (let i = 0; i < n; i++) {
      positions.push([origin[0] + (lcg() - 0.5) * spread, origin[1] + yOffset, origin[2] + (lcg() - 0.5) * spread])
    }
  }

  return positions
}

export interface BehaviorAttachment {
  objectId: string
  objectName: string
  behavior: BehaviorConfig
}

export interface SceneAction {
  op: 'add' | 'move' | 'delete' | 'scale' | 'material' | 'light' | 'behaviors'
  target?: string
  params?: Record<string, unknown>
}

export interface ExecutionResult {
  executed: number
  errors: string[]
  newObjectIds: string[]
  behaviorAttachments: BehaviorAttachment[]
}

export interface GallerySpec {
  type: 'hdri' | 'material' | 'sketchfab' | 'texture'
  query: string
  current?: string
}

export interface ParsedResponse {
  commands: SceneCommand[]
  actions: SceneAction[]
  text: string
  suggestions?: string[]
  gallery?: GallerySpec
}

// Extract JSON command blocks and action/suggestion blocks from Claude's response
export function parseCommands(raw: string): ParsedResponse {
  const commands: SceneCommand[] = []
  const actions: SceneAction[] = []
  let suggestions: string[] | undefined
  let gallery: GallerySpec | undefined
  const codeBlockRe = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
  let match: RegExpExecArray | null

  while ((match = codeBlockRe.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (Array.isArray(parsed.commands)) {
        for (const cmd of parsed.commands) {
          if (typeof cmd === 'object' && typeof cmd.action === 'string') {
            commands.push(cmd as SceneCommand)
          }
        }
      } else if (typeof parsed.action === 'string') {
        commands.push(parsed as SceneCommand)
      } else if (Array.isArray(parsed.actions)) {
        for (const action of parsed.actions) {
          if (typeof action === 'object' && typeof action.op === 'string') {
            actions.push(action as SceneAction)
          }
        }
      } else if (Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions.slice(0, 3).map(String)
      } else if (parsed.gallery && typeof parsed.gallery.type === 'string') {
        gallery = parsed.gallery as GallerySpec
      }
    } catch {}
  }

  // Strip code blocks from text
  const text = raw.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim()
  return { commands, actions, text, suggestions, gallery }
}

// Execute a SceneAction (op-based format for modifying existing objects)
export function executeAction(action: SceneAction, collector?: BehaviorAttachment[]): void {
  const store = useScene.getState()
  const { op, target, params = {} } = action

  switch (op) {
    case 'move': {
      const obj = findObjectByName(store.objects, target)
      if (!obj) throw new Error(`Object "${target}" not found`)
      store.updateObject(obj.id, { transform: { position: params.position as [number, number, number] } })
      break
    }
    case 'scale': {
      const obj = findObjectByName(store.objects, target)
      if (!obj) throw new Error(`Object "${target}" not found`)
      store.updateObject(obj.id, { transform: { scale: params.scale as [number, number, number] } })
      break
    }
    case 'delete': {
      const obj = findObjectByName(store.objects, target) ?? (target ? store.objects[target] : undefined)
      if (obj) store.removeObject(obj.id)
      break
    }
    case 'material': {
      const obj = findObjectByName(store.objects, target)
      if (!obj) throw new Error(`Object "${target}" not found`)
      store.updateObject(obj.id, { material: params as Partial<MaterialConfig> })
      break
    }
    case 'light': {
      const existing = target ? findObjectByName(store.objects, target) : undefined
      if (existing?.light) {
        store.updateObject(existing.id, { light: params as unknown as LightConfig })
      } else {
        const lightType = ((params.lightType ?? params.type ?? 'point') as string) as LightConfig['type']
        store.addObject({
          name: target ?? `${lightType} light`,
          type: 'light',
          geometry: { type: 'sphere', radius: 0.1 },
          material: {} as MaterialConfig,
          light: {
            type: lightType as LightConfig['type'],
            intensity: (params.intensity as number) ?? 1,
            color: (params.color as string) ?? '#ffffff',
            distance: (params.distance as number) ?? 20,
            decay: 2,
            angle: (params.angle as number) ?? Math.PI / 4,
            penumbra: (params.penumbra as number) ?? 0.1,
            castShadow: (params.castShadow as boolean) ?? true,
          },
          transform: {
            position: (params.position as [number, number, number]) ?? [0, 5, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        })
      }
      break
    }
    case 'add': {
      executeCommand({
        action: 'add_object',
        name: (params.name as string) ?? target ?? 'Object',
        geometry: (params.geometry as string) ?? 'box',
        position: params.position as [number, number, number] | undefined,
        size: params.size as [number, number, number] | number | undefined,
        color: params.color as string | undefined,
        roughness: params.roughness as number | undefined,
        metalness: params.metalness as number | undefined,
        material: params.material as string | undefined,
      } as AddObjectCmd)
      break
    }
    case 'behaviors': {
      const ids = resolveObjectQuery(target ?? '', store.objects, store.selectedIds)
      const p = params as {
        attach?: Array<Omit<BehaviorConfig, 'id'>>
        detach?: string[]
        detach_all?: boolean
        update?: Partial<BehaviorConfig> & { id: string }
      }
      for (const objId of ids) {
        const obj = store.objects[objId]
        if (!obj) continue
        if (p.detach_all) {
          store.detachAllBehaviors(objId)
        }
        if (Array.isArray(p.detach)) {
          for (const bid of p.detach) store.detachBehavior(objId, bid)
        }
        if (p.update) {
          store.updateBehavior(objId, p.update.id, p.update)
        }
        if (Array.isArray(p.attach)) {
          for (const bCfg of p.attach) {
            const bid = store.attachBehavior(objId, bCfg)
            const attached = useScene.getState().objects[objId]?.behaviors?.find((x) => x.id === bid)
            if (attached && collector) {
              collector.push({ objectId: objId, objectName: obj.name, behavior: attached })
            }
          }
        }
      }
      break
    }
  }
}

// Resolve geometry from string name
function resolveGeometry(geomStr?: string, cmd?: AddObjectCmd): GeometryConfig {
  const g = geomStr?.toLowerCase() ?? 'box'
  const size = Array.isArray(cmd?.size) ? cmd.size : [1, 1, 1]
  const radius = cmd?.radius ?? (Array.isArray(cmd?.size) ? cmd.size[0] : typeof cmd?.size === 'number' ? cmd.size : 1)

  if (g.includes('sphere') || g.includes('ball')) return { type: 'sphere', radius, segments: 24 }
  if (g.includes('cylinder')) return { type: 'cylinder', radiusTop: radius * 0.5, radiusBottom: radius * 0.5, height: size[1] ?? 1, segments: 16 }
  if (g.includes('cone')) return { type: 'cone', radius, height: size[1] ?? 2, segments: 12 }
  if (g.includes('torus') || g.includes('ring')) return { type: 'torus', radius, tube: 0.3, segments: 32 }
  if (g.includes('plane') || g.includes('floor') || g.includes('ground')) return { type: 'plane', width: size[0] ?? 10, height: size[2] ?? 10 }
  if (g.includes('capsule')) return { type: 'capsule', radius: radius * 0.5, height: size[1] ?? 2 }
  if (g.includes('tetra') || g.includes('diamond')) return { type: 'tetrahedron', radius }
  return { type: 'box', width: size[0] ?? 1, height: size[1] ?? 1, depth: size[2] ?? 1 }
}

// Resolve material from preset name or partial config
function resolveMaterial(mat?: string | Partial<MaterialConfig>, cmd?: Partial<AddObjectCmd>): Partial<MaterialConfig> {
  const base: Partial<MaterialConfig> = {}
  if (cmd?.color) base.color = cmd.color
  if (cmd?.emissive) base.emissive = cmd.emissive
  if (cmd?.emissiveIntensity !== undefined) base.emissiveIntensity = cmd.emissiveIntensity
  if (cmd?.roughness !== undefined) base.roughness = cmd.roughness
  if (cmd?.metalness !== undefined) base.metalness = cmd.metalness
  if (cmd?.opacity !== undefined) { base.opacity = cmd.opacity; base.transparent = cmd.opacity < 1 }

  if (typeof mat === 'string') {
    const key = mat.toLowerCase()
    for (const [presetKey, presetVal] of Object.entries(MATERIAL_PRESETS)) {
      if (key.includes(presetKey)) return { ...presetVal, ...base }
    }
    // Treat as color if it looks like a hex or color name
    if (mat.startsWith('#') || mat.match(/^[a-z]+$/i)) return { color: mat, ...base }
  } else if (mat && typeof mat === 'object') {
    return { ...mat, ...base }
  }

  return base
}

// Find object by name (fuzzy match)
function findObjectByName(objects: Record<string, SceneObject>, name?: string): SceneObject | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  return Object.values(objects).find((o) => o.name.toLowerCase().includes(lower))
}

// Execute a parsed command against the store
export function executeCommand(cmd: SceneCommand): void {
  const store = useScene.getState()

  switch (cmd.action) {
    case 'add_object': {
      const c = cmd as AddObjectCmd
      const geom = resolveGeometry(c.geometry, c)
      const mat = resolveMaterial(c.material, c)
      const isLight = c.type === 'light'
      store.addObject({
        name: c.name ?? geom.type,
        type: isLight ? 'light' : 'mesh',
        geometry: geom,
        material: mat as MaterialConfig,
        transform: {
          position: c.position ?? [0, 0, 0],
          rotation: c.rotation ?? [0, 0, 0],
          scale: c.scale ?? [1, 1, 1],
        },
        castShadow: c.castShadow ?? true,
        receiveShadow: true,
      })
      break
    }

    case 'add_light': {
      const c = cmd as AddLightCmd
      const lightType = (c.lightType ?? c.type ?? 'point') as LightConfig['type']
      store.addObject({
        name: `${lightType} light`,
        type: 'light',
        geometry: { type: 'sphere', radius: 0.1 },
        material: {} as MaterialConfig,
        light: {
          type: lightType,
          intensity: c.intensity ?? 1,
          color: c.color ?? '#ffffff',
          distance: c.distance ?? 20,
          decay: 2,
          angle: c.angle ?? Math.PI / 4,
          penumbra: c.penumbra ?? 0.1,
          castShadow: c.castShadow ?? true,
        },
        transform: {
          position: c.position ?? [0, 5, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      })
      break
    }

    case 'set_material': {
      const c = cmd as SetMaterialCmd
      const targets = c.objectId
        ? [store.objects[c.objectId]].filter(Boolean)
        : store.selectedIds.length
        ? store.selectedIds.map((id) => store.objects[id]).filter(Boolean)
        : []

      const preset = c.preset ? MATERIAL_PRESETS[c.preset.toLowerCase()] : {}
      const patch: Partial<MaterialConfig> = {
        ...preset,
        ...(c.type ? { type: c.type as MaterialConfig['type'] } : {}),
        ...(c.color ? { color: c.color } : {}),
        ...(c.roughness !== undefined ? { roughness: c.roughness } : {}),
        ...(c.metalness !== undefined ? { metalness: c.metalness } : {}),
        ...(c.emissive ? { emissive: c.emissive } : {}),
        ...(c.emissiveIntensity !== undefined ? { emissiveIntensity: c.emissiveIntensity } : {}),
        ...(c.opacity !== undefined ? { opacity: c.opacity, transparent: c.opacity < 1 } : {}),
        ...(c.transmission !== undefined ? { transmission: c.transmission } : {}),
        ...(c.ior !== undefined ? { ior: c.ior } : {}),
      }

      for (const obj of targets) {
        store.updateObject(obj.id, { material: patch })
      }
      break
    }

    case 'set_hdri': {
      const c = cmd as SetHDRICmd
      const url = c.url ?? (c.name ? `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${c.name}_1k.hdr` : null)
      store.setEnvironment({
        ...(url ? { hdriUrl: url, hdriName: c.name ?? url } : {}),
        ...(c.intensity !== undefined ? { hdriIntensity: c.intensity } : {}),
        ...(c.rotation !== undefined ? { hdriRotation: c.rotation } : {}),
      })
      break
    }

    case 'set_fog': {
      const c = cmd as SetFogCmd
      store.setEnvironment({
        fogType: (c.type ?? 'exponential') as 'none' | 'linear' | 'exponential',
        ...(c.color ? { fogColor: c.color } : {}),
        ...(c.density !== undefined ? { fogDensity: c.density } : {}),
        ...(c.near !== undefined ? { fogNear: c.near } : {}),
        ...(c.far !== undefined ? { fogFar: c.far } : {}),
      })
      break
    }

    case 'set_environment': {
      const c = cmd as SetEnvironmentCmd
      store.setEnvironment({
        ...(c.ambientColor ? { ambientColor: c.ambientColor } : {}),
        ...(c.ambientIntensity !== undefined ? { ambientIntensity: c.ambientIntensity } : {}),
        ...(c.backgroundColor ? { backgroundColor: c.backgroundColor } : {}),
        ...(c.directionalColor ? { directionalColor: c.directionalColor } : {}),
        ...(c.directionalIntensity !== undefined ? { directionalIntensity: c.directionalIntensity } : {}),
        ...(c.skyEnabled !== undefined ? { skyEnabled: c.skyEnabled } : {}),
        ...(c.sunElevation !== undefined ? { sunElevation: c.sunElevation } : {}),
        ...(c.sunAzimuth !== undefined ? { sunAzimuth: c.sunAzimuth } : {}),
        ...(c.skyTurbidity !== undefined ? { skyTurbidity: c.skyTurbidity } : {}),
        ...(c.skyRayleigh !== undefined ? { skyRayleigh: c.skyRayleigh } : {}),
      })
      break
    }

    case 'add_grass': {
      const c = cmd as AddGrassCmd
      store.addObject({
        name: c.name ?? 'Grass',
        type: 'grass',
        geometry: { type: 'plane' },
        material: { type: 'standard', color: c.color ?? '#3a7a2a', roughness: 0.8, metalness: 0, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' },
        transform: { position: c.position ?? [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        grass: {
          count: c.count ?? 8000,
          patchRadius: c.patchRadius ?? 15,
          bladeHeight: c.bladeHeight ?? 0.5,
          bladeWidth: c.bladeWidth ?? 0.04,
          windStrength: c.windStrength ?? 0.6,
          windSpeed: c.windSpeed ?? 1.8,
          color: c.color ?? '#3a7a2a',
          colorVariation: c.colorVariation ?? 0.3,
          snapToTerrain: c.snapToTerrain ?? true,
        },
      })
      break
    }

    case 'add_animation': {
      const c = cmd as AddAnimationCmd
      const targets = c.objectId
        ? [store.objects[c.objectId]].filter(Boolean)
        : c.objectName
        ? [findObjectByName(store.objects, c.objectName)].filter(Boolean) as SceneObject[]
        : store.selectedIds.map((id) => store.objects[id]).filter(Boolean)

      const anim: AnimationConfig = {
        preset: (c.preset as AnimationConfig['preset']) ?? 'float',
        speed: c.speed ?? 1,
        amplitude: c.amplitude ?? 0.5,
        offset: Math.random() * Math.PI * 2,
        axis: c.axis ?? 'y',
      }
      for (const obj of targets) {
        store.updateObject(obj.id, { animation: anim })
      }
      break
    }

    case 'enable_physics': {
      const c = cmd as EnablePhysicsCmd
      const obj = c.objectId
        ? store.objects[c.objectId]
        : c.objectName
        ? findObjectByName(store.objects, c.objectName)
        : store.selectedIds.length ? store.objects[store.selectedIds[0]] : undefined

      if (!obj) break
      const phys: PhysicsConfig = {
        enabled: true,
        type: (c.bodyType ?? c.type ?? 'dynamic') as PhysicsConfig['type'],
        shape: (c.shape ?? 'auto') as PhysicsConfig['shape'],
        mass: c.mass ?? 1,
        restitution: c.restitution ?? 0.3,
        friction: 0.5,
        linearDamping: 0.1,
        gravityScale: 1,
      }
      store.updateObject(obj.id, { physics: phys })
      break
    }

    case 'delete_object': {
      const c = cmd as DeleteObjectCmd
      const id = c.id ?? findObjectByName(store.objects, c.name)?.id
      if (id) store.removeObject(id)
      break
    }

    case 'duplicate_object': {
      const c = cmd as DuplicateObjectCmd
      const id = c.id ?? findObjectByName(store.objects, c.name)?.id
      if (id) store.duplicateObject(id, c.offset)
      break
    }

    case 'group_objects': {
      const c = cmd as GroupObjectsCmd
      const ids = c.ids ?? (c.names ?? []).map((n) => findObjectByName(store.objects, n)?.id).filter(Boolean) as string[]
      if (ids.length > 0) store.groupObjects(ids, c.groupName ?? c.name ?? 'Group')
      break
    }

    case 'load_template': {
      const c = cmd as LoadTemplateCmd
      const templateId = c.id ?? c.name?.toLowerCase().replace(/\s+/g, '_')
      if (!templateId) break
      const template = getTemplate(templateId)
      if (!template) break
      // Clear scene and load template
      const s = useScene.getState()
      for (const id of [...s.rootIds]) s.removeObject(id)
      for (const objConfig of template.objects) {
        s.addObject(objConfig)
      }
      s.setEnvironment(template.environment)
      s.showNotification(`Loaded template: ${template.name}`)
      break
    }

    case 'set_postfx': {
      const c = cmd as SetPostFXCmd
      store.setPostFX({
        ...(c.bloom !== undefined ? { bloom: c.bloom } : {}),
        ...(c.bloomIntensity !== undefined ? { bloomIntensity: c.bloomIntensity } : {}),
        ...(c.vignette !== undefined ? { vignette: c.vignette } : {}),
        ...(c.noise !== undefined ? { noise: c.noise } : {}),
        ...(c.chromaticAberration !== undefined ? { chromaticAberration: c.chromaticAberration } : {}),
        ...(c.ssao !== undefined ? { ssao: c.ssao } : {}),
        ...(c.ssaoIntensity !== undefined ? { ssaoIntensity: c.ssaoIntensity } : {}),
        ...(c.ssaoRadius !== undefined ? { ssaoRadius: c.ssaoRadius } : {}),
        ...(c.dof !== undefined ? { dof: c.dof } : {}),
        ...(c.dofFocusDistance !== undefined ? { dofFocusDistance: c.dofFocusDistance } : {}),
        ...(c.dofFocalLength !== undefined ? { dofFocalLength: c.dofFocalLength } : {}),
        ...(c.dofBokehScale !== undefined ? { dofBokehScale: c.dofBokehScale } : {}),
      })
      break
    }

    case 'add_text': {
      const c = cmd as AddTextCmd
      const mat = resolveMaterial(c.material, { color: c.color } as Partial<AddObjectCmd>)
      store.addObject({
        name: c.text ?? '3D Text',
        type: 'mesh',
        geometry: {
          type: 'text',
          text: c.text ?? 'Hello',
          fontSize: c.fontSize ?? 0.5,
          ...(c.font ? { font: c.font } : {}),
          ...(c.depth !== undefined ? { textDepth: c.depth } : {}),
        },
        material: mat as MaterialConfig,
        transform: { position: c.position ?? [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        castShadow: true,
      })
      break
    }

    case 'add_keyframe_animation': {
      const c = cmd as AddKeyframeAnimationCmd
      let obj = c.objectId
        ? store.objects[c.objectId]
        : c.objectName
        ? findObjectByName(store.objects, c.objectName)
        : store.selectedIds.length ? store.objects[store.selectedIds[0]] : undefined
      if (!obj) break

      for (const kf of (c.keyframes ?? [])) {
        if (!obj) break
        const curObj = obj  // non-null alias for this iteration
        const transform: Transform = {
          position: kf.position ?? curObj.transform.position,
          rotation: kf.rotation ?? curObj.transform.rotation,
          scale: kf.scale ?? curObj.transform.scale,
        }
        store.updateObject(curObj.id, {
          animation: {
            ...(curObj.animation ?? { preset: 'none' as const, speed: 1, amplitude: 0.5, offset: 0, axis: 'y' as const }),
            keyframes: [
              ...(curObj.animation?.keyframes?.filter((k) => Math.abs(k.time - kf.time) > 0.05) ?? []),
              { time: kf.time, transform },
            ].sort((a, b) => a.time - b.time),
          },
        })
        // Re-fetch after each update so next iteration sees fresh keyframes
        const updated: typeof obj = useScene.getState().objects[curObj.id]
        if (updated) obj = updated
      }
      break
    }

    case 'add_scene': {
      const c = cmd as AddSceneCmd
      store.addScene(c.name)
      break
    }

    case 'add_particle': {
      const c = cmd as AddParticleCmd
      const mat = resolveMaterial(undefined, { color: c.color } as Partial<AddObjectCmd>)
      store.addObject({
        name: c.name ?? `${c.preset ?? 'scatter'} particles`,
        type: 'particle',
        geometry: { type: 'sphere', radius: 0.1 },
        material: mat as MaterialConfig,
        particle: {
          count: c.count ?? 200,
          spread: c.spread ?? [6, 6, 6],
          instanceGeometry: c.instanceGeometry ?? 'sphere',
          instanceScale: c.instanceScale ?? 0.08,
          randomScale: 0.5,
          preset: c.preset ?? 'scatter',
          ...(c.lifetime    !== undefined && { lifetime: c.lifetime }),
          ...(c.emitterShape !== undefined && { emitterShape: c.emitterShape }),
          ...(c.gravityFactor !== undefined && { gravityFactor: c.gravityFactor }),
          ...(c.drag        !== undefined && { drag: c.drag }),
          ...(c.turbulence  !== undefined && { turbulence: c.turbulence }),
          ...(c.velocityX   !== undefined && { velocityX: c.velocityX }),
          ...(c.velocityY   !== undefined && { velocityY: c.velocityY }),
          ...(c.velocityZ   !== undefined && { velocityZ: c.velocityZ }),
          ...(c.renderMode  !== undefined && { renderMode: c.renderMode }),
          ...(c.opacityStart !== undefined && { opacityStart: c.opacityStart }),
          ...(c.opacityEnd  !== undefined && { opacityEnd: c.opacityEnd }),
          ...(c.glowIntensity !== undefined && { glowIntensity: c.glowIntensity }),
        },
        transform: { position: c.position ?? [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      })
      break
    }

    case 'scatter_objects': {
      const c = cmd as ScatterObjectsCmd
      const src = c.objectId
        ? store.objects[c.objectId]
        : c.objectName
        ? findObjectByName(store.objects, c.objectName)
        : store.selectedIds.length ? store.objects[store.selectedIds[0]] : undefined
      if (!src) break
      const count = c.count ?? 5
      const spread = c.spread ?? [5, 0, 5]
      for (let i = 0; i < count; i++) {
        store.duplicateObject(src.id, [
          (Math.random() - 0.5) * spread[0],
          (Math.random() - 0.5) * spread[1],
          (Math.random() - 0.5) * spread[2],
        ])
      }
      break
    }

    case 'set_view_mode': {
      const c = cmd as SetViewModeCmd
      if (c.mode) store.setViewMode(c.mode)
      if (c.fov !== undefined) store.setCameraFov(c.fov)
      break
    }

    case 'set_camera_clip': {
      const c = cmd as SetCameraClipCmd
      if (c.near !== undefined) store.setCameraNear(c.near)
      if (c.far !== undefined) store.setCameraFar(c.far)
      break
    }

    case 'update_object': {
      const c = cmd as UpdateObjectCmd
      const obj = findObjectByName(store.objects, c.target)
      if (!obj) break
      const patch: Record<string, unknown> = {}
      if (c.position || c.rotation || c.scale) {
        patch.transform = {
          position: c.position ?? obj.transform.position,
          rotation: c.rotation ?? obj.transform.rotation,
          scale: c.scale ?? obj.transform.scale,
        }
      }
      if (c.color || c.roughness !== undefined || c.metalness !== undefined || c.opacity !== undefined || c.emissive || c.emissiveIntensity !== undefined) {
        patch.material = {
          ...(c.color ? { color: c.color } : {}),
          ...(c.roughness !== undefined ? { roughness: c.roughness } : {}),
          ...(c.metalness !== undefined ? { metalness: c.metalness } : {}),
          ...(c.opacity !== undefined ? { opacity: c.opacity, transparent: c.opacity < 1 } : {}),
          ...(c.emissive ? { emissive: c.emissive } : {}),
          ...(c.emissiveIntensity !== undefined ? { emissiveIntensity: c.emissiveIntensity } : {}),
        }
      }
      if (c.visible !== undefined) patch.visible = c.visible
      store.updateObject(obj.id, patch as Parameters<typeof store.updateObject>[1])
      break
    }

    case 'add_html': {
      const c = cmd as AddHtmlCmd
      const HTML_LABELS: Record<string, string> = {
        heading: 'Heading', paragraph: 'Text', button: 'Button', badge: 'Badge',
        card: 'Card', quote: 'Quote', stat: 'Stat', divider: 'Divider',
        spacer: 'Spacer', icontext: 'Icon+Text', form: 'Form', countdown: 'Timer',
      }
      const htmlType = (c.htmlType ?? 'heading') as HtmlObjectConfig['htmlType']
      store.addObject({
        name: c.name ?? HTML_LABELS[htmlType] ?? 'Element',
        type: 'html',
        geometry: { type: 'box' },
        material: { type: 'standard', color: '#ffffff', roughness: 0.5, metalness: 0, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' },
        htmlConfig: {
          htmlType,
          content: c.content,
          ...(c.color ? { color: c.color } : {}),
          ...(c.fontSize !== undefined ? { fontSize: c.fontSize } : {}),
        },
        transform: { position: c.position ?? [0, 1.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      })
      break
    }

    case 'add_terrain': {
      const c = cmd as AddTerrainCmd
      const size = c.size ?? 50
      store.addObject({
        name: c.name ?? 'Terrain',
        type: 'terrain',
        geometry: { type: 'plane', width: size, height: size },
        material: { type: 'standard', color: c.lowColor ?? '#3a7d44', roughness: 0.9, metalness: 0, emissive: '#000000', emissiveIntensity: 0, opacity: 1, transparent: false, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' },
        terrain: {
          size,
          resolution: 64,
          heightScale: c.heightScale ?? 5,
          noiseScale: c.noiseScale ?? 0.1,
          seed: c.seed ?? Math.floor(Math.random() * 100),
          layers: c.layers ?? 4,
          lowColor: c.lowColor ?? '#3a7d44',
          midColor: c.midColor ?? '#5a5a3a',
          highColor: c.highColor ?? '#888888',
          domainWarp: c.domainWarp,
          worleyBlend: c.worleyBlend,
          erosionSteps: c.erosionSteps,
          biome: c.biome as import('@/lib/scene/SceneStore').BiomePreset | undefined,
        },
        transform: { position: c.position ?? [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        castShadow: true,
        receiveShadow: true,
      })
      break
    }

    case 'update_terrain': {
      const c = cmd as UpdateTerrainCmd
      const objects = Object.values(store.objects)
      const terrain = c.target
        ? objects.find(o => o.type === 'terrain' && o.name.toLowerCase().includes(c.target!.toLowerCase()))
        : objects.find(o => o.type === 'terrain')
      if (!terrain) break
      const existing = terrain.terrain ?? {}
      const patch: Partial<import('@/lib/scene/SceneStore').TerrainConfig> = {}
      if (c.seed !== undefined) patch.seed = c.seed
      if (c.heightScale !== undefined) patch.heightScale = c.heightScale
      if (c.noiseScale !== undefined) patch.noiseScale = c.noiseScale
      if (c.layers !== undefined) patch.layers = c.layers
      if (c.domainWarp !== undefined) patch.domainWarp = c.domainWarp
      if (c.worleyBlend !== undefined) patch.worleyBlend = c.worleyBlend
      if (c.erosionSteps !== undefined) patch.erosionSteps = c.erosionSteps
      if (c.biome) patch.biome = c.biome as import('@/lib/scene/SceneStore').BiomePreset
      if (c.lowColor) patch.lowColor = c.lowColor
      if (c.midColor) patch.midColor = c.midColor
      if (c.highColor) patch.highColor = c.highColor
      store.updateObject(terrain.id, { terrain: { ...existing, ...patch } as import('@/lib/scene/SceneStore').TerrainConfig })
      break
    }

    case 'add_water': {
      const c = cmd as AddWaterCmd
      const size = c.size ?? 30
      store.addObject({
        name: c.name ?? 'Water',
        type: 'water',
        geometry: { type: 'plane', width: size, height: size },
        material: { type: 'standard', color: c.color ?? '#0055bb', roughness: 0.05, metalness: 0.2, emissive: '#000000', emissiveIntensity: 0, opacity: c.opacity ?? 0.85, transparent: true, wireframe: false, envMapIntensity: 1, transmission: 0, ior: 1.5, thickness: 0.5, flatShading: false, side: 'front' },
        water: {
          size,
          color: c.color ?? '#0055bb',
          opacity: c.opacity ?? 0.85,
          waveHeight: c.waveHeight ?? 0.3,
          waveSpeed: c.waveSpeed ?? 1.5,
          waveScale: 1,
        },
        transform: { position: c.position ?? [0, 0, 0], rotation: [-1.5708, 0, 0], scale: [1, 1, 1] },
      })
      break
    }

    case 'set_visibility': {
      const c = cmd as SetVisibilityCmd
      const obj = findObjectByName(store.objects, c.target)
      if (!obj) break
      store.updateObject(obj.id, { visible: c.visible })
      break
    }

    case 'add_camera_keypoint': {
      const c = cmd as AddCameraKeypointCmd
      const keypointCount = store.cameraPath.length
      store.addCameraKeypoint({
        label: c.label ?? `Camera ${keypointCount + 1}`,
        position: c.position ?? [0, 5, 10],
        target: c.target ?? [0, 0, 0],
        fov: c.fov ?? 60,
        easing: c.easing ?? 'ease',
      })
      break
    }

    case 'clear_camera_path': {
      for (const kp of [...store.cameraPath]) {
        store.removeCameraKeypoint(kp.id)
      }
      break
    }

    case 'subdivide_mesh': {
      const c = cmd as SubdivideMeshCmd
      const obj = c.targetId
        ? store.objects[c.targetId]
        : c.target
        ? findObjectByName(store.objects, c.target)
        : store.selectedIds.length ? store.objects[store.selectedIds[0]] : undefined
      if (!obj) break
      store.setPendingOp(obj.id, { type: 'subdivide', levels: c.levels ?? 1 })
      break
    }

    case 'boolean_operation': {
      const c = cmd as BooleanOperationCmd
      const objA = c.objectAId
        ? store.objects[c.objectAId]
        : c.objectA
        ? findObjectByName(store.objects, c.objectA)
        : store.selectedIds.length ? store.objects[store.selectedIds[0]] : undefined
      const objB = c.objectBId
        ? store.objects[c.objectBId]
        : findObjectByName(store.objects, c.objectB)
      if (!objA || !objB) break
      store.setPendingOp(objA.id, {
        type: 'boolean',
        targetId: objB.id,
        operation: c.operation,
        deleteB: c.deleteB !== false,
      })
      break
    }

    case 'sculpt_mesh': {
      const c = cmd as SculptMeshCmd
      const obj = c.targetId
        ? store.objects[c.targetId]
        : c.target
        ? findObjectByName(store.objects, c.target)
        : store.selectedIds.length ? store.objects[store.selectedIds[0]] : undefined
      if (!obj) break
      store.selectObject(obj.id)
      store.setActiveTool('sculpt')
      if (c.brushType) store.setSculptMode(c.brushType)
      if (c.radius) store.setSculptRadius(c.radius)
      break
    }

    case 'save_world': {
      const c = cmd as SaveWorldCmd
      saveWorld(c.name, c.description).then(w =>
        store.showNotification(`World "${w.name}" saved`, 'success')
      ).catch(() => store.showNotification('Save failed', 'error'))
      break
    }

    case 'load_world': {
      const c = cmd as LoadWorldCmd
      listWorlds().then(worlds => {
        const match = c.id
          ? worlds.find(w => w.id === c.id)
          : worlds.find(w => w.name.toLowerCase().includes((c.name ?? '').toLowerCase()))
        if (!match) { store.showNotification('World not found', 'error'); return }
        restoreWorldToStore(match.sceneData)
        store.showNotification(`Loaded "${match.name}"`, 'success')
      }).catch(() => store.showNotification('Load failed', 'error'))
      break
    }

    case 'list_worlds': {
      listWorlds().then(worlds =>
        store.showNotification(
          `${worlds.length} world${worlds.length !== 1 ? 's' : ''} saved locally`,
          'info'
        )
      )
      break
    }

    // Handled by ChatPanel orchestration layer — no-op here
    case 'delegate_to_agent':
    case 'orchestrate_multi_agent':
      break
  }
}

// Execute all commands and actions from parsed response
export function executeCommands(commands: SceneCommand[], actions: SceneAction[] = []): ExecutionResult {
  const errors: string[] = []
  let executed = 0
  const behaviorAttachments: BehaviorAttachment[] = []
  const beforeIds = new Set(Object.keys(useScene.getState().objects))

  for (const cmd of commands) {
    try {
      executeCommand(cmd)
      executed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      console.error('Command execution error:', cmd.action, e)
      errors.push(`${cmd.action}: ${msg}`)
    }
  }

  for (const action of actions) {
    try {
      executeAction(action, behaviorAttachments)
      executed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      console.error('Action execution error:', action.op, e)
      errors.push(`${action.op}${action.target ? ` "${action.target}"` : ''}: ${msg}`)
    }
  }

  const newObjectIds = Object.keys(useScene.getState().objects).filter((id) => !beforeIds.has(id))

  return { executed, errors, newObjectIds, behaviorAttachments }
}
