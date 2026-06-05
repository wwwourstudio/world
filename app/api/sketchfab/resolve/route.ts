interface ResolveQuery {
  query: string
  count: number
}

interface SketchfabSearchModel {
  uid: string
  name: string
  thumbnails?: { images?: Array<{ url: string }> }
  isDownloadable: boolean
}

interface ResolvedModel {
  query: string
  uid: string
  name: string
  url: string
  thumbnail: string | null
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

  // Search all queries in parallel
  const searchResults = await Promise.allSettled(
    queries.map(async ({ query, count }) => {
      const fetchCount = Math.min(Math.max(count, 1) * 2, 10)
      const url = new URL('https://api.sketchfab.com/v3/models')
      url.searchParams.set('q', query)
      url.searchParams.set('count', String(fetchCount))
      url.searchParams.set('downloadable', 'true')
      url.searchParams.set('type', 'models')
      url.searchParams.set('sort_by', 'relevance')

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Token ${apiKey}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data = await res.json()
      const models = (data.results as SketchfabSearchModel[])
        .filter((m) => m.isDownloadable)
        .slice(0, Math.max(count, 1))
      return { query, models }
    })
  )

  // Collect models that need download URL resolution, track fallbacks
  const fallbacks: string[] = []
  const downloadTasks: Array<{ query: string; uid: string; name: string; thumbnail: string | null }> = []

  for (let i = 0; i < searchResults.length; i++) {
    const r = searchResults[i]
    if (r.status === 'rejected' || r.value.models.length === 0) {
      fallbacks.push(queries[i].query)
      continue
    }
    for (const model of r.value.models) {
      downloadTasks.push({
        query: r.value.query,
        uid: model.uid,
        name: model.name,
        thumbnail: model.thumbnails?.images?.[0]?.url ?? null,
      })
    }
  }

  // Cap total models at 20, fetch download URLs in parallel
  const cappedTasks = downloadTasks.slice(0, 20)
  const downloadResults = await Promise.allSettled(
    cappedTasks.map(async (task) => {
      const res = await fetch(`https://api.sketchfab.com/v3/models/${task.uid}/download`, {
        headers: { Authorization: `Token ${apiKey}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Download URL fetch failed for ${task.uid}: ${res.status}`)
      const data = await res.json()
      // Prefer GLB for Three.js, fall back to GLTF
      const glbUrl: string | undefined = data.glb?.url ?? data.gltf?.url
      if (!glbUrl) throw new Error(`No GLB/GLTF URL for ${task.uid}`)
      return { ...task, url: glbUrl } as ResolvedModel
    })
  )

  const results: ResolvedModel[] = []
  for (let i = 0; i < downloadResults.length; i++) {
    const dr = downloadResults[i]
    if (dr.status === 'fulfilled') {
      results.push(dr.value)
    }
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
