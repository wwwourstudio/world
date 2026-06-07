export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params
  const apiKey = process.env.SKETCHFAB_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'SKETCHFAB_API_KEY not configured. Add it to .env.local.' },
      { status: 500 }
    )
  }

  const res = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, {
    headers: { Authorization: `Token ${apiKey}` },
  })

  if (!res.ok) {
    return Response.json(
      { error: `Cannot get download URL: ${res.status}` },
      { status: res.status }
    )
  }

  const data = await res.json()
  const rawUrl: string | null = data.glb?.url ?? data.gltf?.url ?? null
  const url = rawUrl ? `/api/sketchfab/proxy?url=${encodeURIComponent(rawUrl)}` : null

  return Response.json({ url })
}
