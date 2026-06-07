import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { useScene, DEFAULT_GEOMETRY, DEFAULT_MATERIAL } from '@/lib/scene/SceneStore'
import type { SceneObject, EnvironmentState, PostFXState, SceneSnapshot, CameraKeypoint } from '@/lib/scene/SceneStore'
import { captureCanvas } from '@/lib/canvasCapture'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedWorldData {
  objects: Record<string, SceneObject>
  rootIds: string[]
  environment: EnvironmentState
  postFX: PostFXState
  scenes: SceneSnapshot[]
  activeSceneId: string
  cameraPath: CameraKeypoint[]
}

export interface SavedWorld {
  id: string
  name: string
  description: string
  thumbnail: string       // JPEG data URL
  sceneData: SavedWorldData
  createdAt: number
  updatedAt: number
}

interface WorldsDB extends DBSchema {
  worlds: {
    key: string
    value: SavedWorld
    indexes: { 'by-name': string; 'by-date': number }
  }
}

// ─── Database ─────────────────────────────────────────────────────────────────

let _db: IDBPDatabase<WorldsDB> | null = null

async function getDB(): Promise<IDBPDatabase<WorldsDB>> {
  if (_db) return _db
  _db = await openDB<WorldsDB>('wbp-worlds', 1, {
    upgrade(db) {
      const store = db.createObjectStore('worlds', { keyPath: 'id' })
      store.createIndex('by-name', 'name')
      store.createIndex('by-date', 'updatedAt')
    },
  })
  return _db
}

// ─── Thumbnail capture ────────────────────────────────────────────────────────

function captureThumbnail(): string {
  const canvas = captureCanvas.dom
  if (!canvas) return ''
  try {
    // Crop to 16:9 centered and scale to 320×180
    const w = canvas.width, h = canvas.height
    const aspect = 16 / 9
    let sx = 0, sy = 0, sw = w, sh = h
    if (w / h > aspect) { sw = h * aspect; sx = (w - sw) / 2 }
    else { sh = w / aspect; sy = (h - sh) / 2 }
    const tmp = document.createElement('canvas')
    tmp.width = 320; tmp.height = 180
    const ctx = tmp.getContext('2d')
    if (!ctx) return canvas.toDataURL('image/jpeg', 0.6)
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, 320, 180)
    return tmp.toDataURL('image/jpeg', 0.65)
  } catch {
    return ''
  }
}

// ─── Strip blob URLs (same pattern as SceneStore.ts:1595–1602) ────────────────

function stripBlobUrls(env: EnvironmentState): EnvironmentState {
  if (!env.hdriUrl?.startsWith('blob:')) return env
  return { ...env, hdriUrl: null, hdriName: 'None' }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function saveWorld(name: string, description = ''): Promise<SavedWorld> {
  const s = useScene.getState()
  const thumbnail = captureThumbnail()
  const now = Date.now()
  const world: SavedWorld = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled World',
    description,
    thumbnail,
    sceneData: {
      objects: s.objects,
      rootIds: s.rootIds,
      environment: stripBlobUrls(s.environment),
      postFX: s.postFX,
      scenes: s.scenes,
      activeSceneId: s.activeSceneId,
      cameraPath: s.cameraPath,
    },
    createdAt: now,
    updatedAt: now,
  }
  const db = await getDB()
  await db.put('worlds', world)
  return world
}

export async function loadWorld(id: string): Promise<SavedWorld | null> {
  const db = await getDB()
  return (await db.get('worlds', id)) ?? null
}

export async function listWorlds(): Promise<SavedWorld[]> {
  const db = await getDB()
  const all = await db.getAll('worlds')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteWorld(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('worlds', id)
}

export async function searchWorlds(query: string): Promise<SavedWorld[]> {
  const q = query.toLowerCase()
  const all = await listWorlds()
  return all.filter(w => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
}

/** Restore a saved world into the live scene store — mirrors loadPersistedScene() pattern. */
export function restoreWorldToStore(data: SavedWorldData): void {
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
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], ...(o.transform ?? {}) },
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
      behaviors: Array.isArray(o.behaviors) ? o.behaviors : undefined,
      interaction: o.interaction ?? undefined,
      htmlConfig: o.htmlConfig ?? undefined,
      scrollAnim: o.scrollAnim ?? undefined,
      terrain: o.terrain ?? undefined,
      water: o.water ?? undefined,
      grass: o.grass ?? undefined,
      particle: o.particle ?? undefined,
    }
  }

  useScene.setState((s) => {
    s.objects = objects
    s.rootIds = Array.isArray(data.rootIds) ? data.rootIds : []
    const loadedEnv = { ...s.environment, ...data.environment }
    if (loadedEnv.hdriUrl?.startsWith('blob:')) { loadedEnv.hdriUrl = null; loadedEnv.hdriName = 'None' }
    s.environment = loadedEnv
    s.postFX = { ...s.postFX, ...data.postFX }
    if (Array.isArray(data.scenes)) s.scenes = data.scenes
    if (data.activeSceneId) s.activeSceneId = data.activeSceneId
    if (Array.isArray(data.cameraPath)) s.cameraPath = data.cameraPath
    s.selectedIds = []
  })
}

/** Format a timestamp as a relative time string ("2h ago", "yesterday", etc.) */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}
