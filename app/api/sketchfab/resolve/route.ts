import { fetchSketchfab } from '@/lib/sketchfab/fetchWithRetry'

interface SketchfabFilters {
  animated?: boolean
  rigged?: boolean
  pbr?: boolean
  staffpicked?: boolean
  cc0?: boolean
  license?: string
}

interface ResolveQuery {
  query: string
  count: number
  filters?: SketchfabFilters
}

interface SketchfabSearchModel {
  uid: string
  name: string
  thumbnails?: { images?: Array<{ url: string }> }
  isDownloadable: boolean
  faceCount?: number
  animationCount?: number
}

interface ResolvedModel {
  query: string
  uid: string
  name: string
  url: string
  thumbnail: string | null
  faceCount?: number
  animationCount?: number
}

type SearchModel = {
  uid: string
  name: string
  thumbnail: string | null
  faceCount?: number
  animationCount?: number
}

// ─── In-memory caches (best-effort; wiped on serverless cold start) ──────────
// Search results are stable → cache long. Download URLs are signed and expire
// in ~24h → cache short (30 min) so a served URL is always comfortably fresh.
const SEARCH_TTL = 6 * 60 * 60_000
const DL_TTL = 30 * 60_000
const MAX_CACHE = 500

const searchCache = new Map<string, { models: SearchModel[]; expires: number }>()
const dlCache = new Map<string, { url: string; expires: number }>()

const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ')

function filterKey(filters: SketchfabFilters | undefined): string {
  if (!filters) return ''
  const { animated, rigged, pbr, staffpicked, cc0, license } = filters
  return JSON.stringify({ animated, rigged, pbr, staffpicked, cc0, license })
}

function cacheBound<V>(map: Map<string, V>) {
  if (map.size > MAX_CACHE) map.clear()
}

export async function POST(request: Request) {
  const apiKey = process.env.SKETCHFAB_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'SKETCHFAB_API_KEY not configured.' }, { status: 500 })
  }

  let body: { queries?: ResolveQuery[] }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const queries = (body.queries ?? []).slice(0, 10)
  if (queries.length === 0) {
    return Response.json({ results: [], fallbacks: [] })
  }

  const now = Date.now()

  // ── Phase 1: search (cache-first) ──────────────────────────────────────────
  const searchResults = await Promise.allSettled(
    queries.map(async ({ query, count, filters }) => {
      const wanted = Math.max(count, 1)
      const key = `${norm(query)}::${wanted}::${filterKey(filters)}`
      const cached = searchCache.get(key)
      if (cached && cached.expires > now) {
        return { query, models: cached.models }
      }

      const fetchCount = Math.min(wanted * 2, 10)
      const url = new URL('https://api.sketchfab.com/v3/models')
      url.searchParams.set('q', query)
      url.searchParams.set('count', String(fetchCount))
      url.searchParams.set('downloadable', 'true')
      url.searchParams.set('type', 'models')
      url.searchParams.set('sort_by', 'relevance')

      if (filters?.animated)    url.searchParams.set('animated', 'true')
      if (filters?.rigged)      url.searchParams.set('rigged', 'true')
      if (filters?.pbr)         url.searchParams.set('pbr', 'true')
      if (filters?.staffpicked) url.searchParams.set('staffpicked', 'true')
      if (filters?.cc0 || filters?.license === 'cc0') url.searchParams.set('license', 'cc0')
      else if (filters?.license) url.searchParams.set('license', filters.license)

      const res = await fetchSketchfab(url.toString(), apiKey)
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data = await res.json()
      const models: SearchModel[] = (data.results as SketchfabSearchModel[])
        .filter((m) => m.isDownloadable)
        .slice(0, wanted)
        .map((m) => ({
          uid: m.uid,
          name: m.name,
          thumbnail: m.thumbnails?.images?.[0]?.url ?? null,
          faceCount: m.faceCount,
          animationCount: m.animationCount,
        }))

      cacheBound(searchCache)
      searchCache.set(key, { models, expires: now + SEARCH_TTL })
      return { query, models }
    })
  )

  // Collect download tasks, track fallbacks for failed/empty searches
  const fallbacks: string[] = []
  const downloadTasks: Array<{ query: string; uid: string; name: string; thumbnail: string | null; faceCount?: number; animationCount?: number }> = []

  for (let i = 0; i < searchResults.length; i++) {
    const r = searchResults[i]
    if (r.status === 'rejected' || r.value.models.length === 0) {
      fallbacks.push(queries[i].query)
      continue
    }
    for (const model of r.value.models) {
      downloadTasks.push({ query: r.value.query, uid: model.uid, name: model.name, thumbnail: model.thumbnail, faceCount: model.faceCount, animationCount: model.animationCount })
    }
  }

  // ── Phase 2: resolve download URLs (cache-first), capped at 20 total ────────
  const cappedTasks = downloadTasks.slice(0, 20)
  const downloadResults = await Promise.allSettled(
    cappedTasks.map(async (task) => {
      const cached = dlCache.get(task.uid)
      if (cached && cached.expires > now) {
        return { ...task, url: `/api/sketchfab/proxy?url=${encodeURIComponent(cached.url)}` } as ResolvedModel
      }

      const res = await fetchSketchfab(`https://api.sketchfab.com/v3/models/${task.uid}/download`, apiKey)
      if (!res.ok) throw new Error(`Download URL fetch failed for ${task.uid}: ${res.status}`)
      const data = await res.json()
      // Prefer GLB for Three.js, fall back to GLTF
      const glbUrl: string | undefined = data.glb?.url ?? data.gltf?.url
      if (!glbUrl) throw new Error(`No GLB/GLTF URL for ${task.uid}`)

      cacheBound(dlCache)
      dlCache.set(task.uid, { url: glbUrl, expires: now + DL_TTL })
      return { ...task, url: `/api/sketchfab/proxy?url=${encodeURIComponent(glbUrl)}` } as ResolvedModel
    })
  )

  const results: ResolvedModel[] = []
  for (const dr of downloadResults) {
    if (dr.status === 'fulfilled') results.push(dr.value)
    // Silently skip failed download URLs — search succeeded, just this model is unavailable
  }

  // Mark queries that ended up with zero resolved models as fallbacks
  for (const q of queries) {
    if (!results.some((r) => r.query === q.query) && !fallbacks.includes(q.query)) {
      fallbacks.push(q.query)
    }
  }

  return Response.json({ results, fallbacks })
}
