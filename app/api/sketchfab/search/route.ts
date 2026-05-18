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

  const apiKey = process.env.SKETCHFAB_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'SKETCHFAB_API_KEY not configured. Add it to .env.local.' },
      { status: 500 }
    )
  }

  const url = new URL('https://api.sketchfab.com/v3/models')
  url.searchParams.set('q', q)
  url.searchParams.set('count', count)
  url.searchParams.set('downloadable', 'true')
  url.searchParams.set('type', 'models')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Token ${apiKey}` },
    next: { revalidate: 300 },
  })

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

  return Response.json({ results })
}
