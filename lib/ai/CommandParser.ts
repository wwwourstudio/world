import type { SceneObject, MaterialConfig, GeometryConfig, LightConfig, AnimationConfig, PhysicsConfig, Transform, BehaviorConfig } from '@/lib/scene/SceneStore'
import { MATERIAL_PRESETS } from '@/lib/scene/SceneStore'
import { useScene } from '@/lib/scene/SceneStore'
import { getTemplate } from '@/lib/ai/WorldTemplates'
import { resolveObjectQuery } from '@/lib/ai/resolveObjectQuery'

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

export interface AddSceneCmd {
  action: 'add_scene'
  name?: string
}

export interface AddParticleCmd {
  action: 'add_particle'
  preset?: 'scatter' | 'rain' | 'snow' | 'leaves' | 'sparks' | 'custom'
  count?: number
  spread?: [number, number, number]
  instanceGeometry?: 'sphere' | 'box' | 'cone' | 'tetrahedron'
  instanceScale?: number
  position?: [number, number, number]
  color?: string
  name?: string
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

export type SceneCommand =
  | AddObjectCmd | AddLightCmd | SetMaterialCmd | SetHDRICmd | SetFogCmd
  | SetCameraCmd | AddAnimationCmd | EnablePhysicsCmd | SetEnvironmentCmd
  | DeleteObjectCmd | DuplicateObjectCmd | GroupObjectsCmd | LoadTemplateCmd | SetPostFXCmd
  | AddTextCmd | AddParticleCmd | ScatterObjectsCmd | SetViewModeCmd
  | AddKeyframeAnimationCmd | AddSceneCmd | SetCameraClipCmd | UpdateObjectCmd

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
      const obj = c.objectId
        ? store.objects[c.objectId]
        : c.objectName
        ? findObjectByName(store.objects, c.objectName)
        : store.selectedIds.length ? store.objects[store.selectedIds[0]] : undefined
      if (!obj) break

      for (const kf of (c.keyframes ?? [])) {
        const transform: Transform = {
          position: kf.position ?? obj.transform.position,
          rotation: kf.rotation ?? obj.transform.rotation,
          scale: kf.scale ?? obj.transform.scale,
        }
        store.updateObject(obj.id, {
          animation: {
            ...(obj.animation ?? { preset: 'none' as const, speed: 1, amplitude: 0.5, offset: 0, axis: 'y' as const }),
            keyframes: [
              ...(obj.animation?.keyframes?.filter((k) => Math.abs(k.time - kf.time) > 0.05) ?? []),
              { time: kf.time, transform },
            ].sort((a, b) => a.time - b.time),
          },
        })
        // Re-fetch obj from store after each update
        const updated = useScene.getState().objects[obj.id]
        if (updated) Object.assign(obj, updated)
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
