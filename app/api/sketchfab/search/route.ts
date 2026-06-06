import { fetchSketchfab } from '@/lib/sketchfab/fetchWithRetry'

interface SketchfabModel {
  uid: string
  name: string
  thumbnails?: { images?: Array<{ url: string }> }
  isDownloadable: boolean
  viewerUrl: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const count = searchParams.get('count') ?? '20'
  const sortBy = searchParams.get('sort_by') ?? 'relevance'
  const offset = searchParams.get('offset') ?? '0'

  const apiKey = process.env.SKETCHFAB_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'SKETCHFAB_API_KEY not configured.' }, { status: 500 })
  }

  const url = new URL('https://api.sketchfab.com/v3/models')
  url.searchParams.set('q', q)
  url.searchParams.set('count', count)
  url.searchParams.set('downloadable', 'true')
  url.searchParams.set('type', 'models')
  url.searchParams.set('sort_by', sortBy)
  if (Number(offset) > 0) url.searchParams.set('offset', offset)

  let res: Response
  try {
    res = await fetchSketchfab(url.toString(), apiKey)
  } catch (e) {
    return Response.json(
      { error: `Sketchfab network error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    )
  }

  if (!res.ok) {
    return Response.json({ error: `Sketchfab error: ${res.status}` }, { status: res.status })
  }

  const data = await res.json()
  const results = (data.results as SketchfabModel[]).map((m) => ({
    uid: m.uid,
    name: m.name,
    thumbnail: m.thumbnails?.images?.[0]?.url ?? null,
    downloadable: m.isDownloadable,
    viewerUrl: m.viewerUrl,
  }))

  return Response.json({ results, next: data.next ?? null })
}
