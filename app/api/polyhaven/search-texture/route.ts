import { NextResponse } from 'next/server'
import type { MaterialMaps } from '@/lib/scene/SceneStore'

interface PHAsset {
  name: string
  categories: string[]
  tags: string[]
}

// In-memory cache to avoid hammering the Poly Haven API
let assetCache: Record<string, PHAsset> | null = null
let assetCacheExpiry = 0

async function getTextureAssets(): Promise<Record<string, PHAsset>> {
  const now = Date.now()
  if (assetCache && now < assetCacheExpiry) return assetCache
  const res = await fetch('https://api.polyhaven.com/assets?t=textures', {
    headers: { 'User-Agent': 'WorldBuilderPro/1.0' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Poly Haven assets API ${res.status}`)
  assetCache = await res.json()
  assetCacheExpiry = now + 60 * 60 * 1000
  return assetCache!
}

function score(id: string, asset: PHAsset, terms: string[]): number {
  const haystack = [id, asset.name, ...(asset.categories ?? []), ...(asset.tags ?? [])]
    .join(' ').toLowerCase()
  return terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0)
}

function parseTextureMaps(files: Record<string, unknown>, res = '1k'): MaterialMaps {
  type FileEntry = Record<string, { jpg?: { url: string }; png?: { url: string } }>
  const f = files as Record<string, FileEntry>
  const maps: MaterialMaps = {}

  const colorUrl =
    f?.Color?.[res]?.jpg?.url ??
    f?.Diffuse?.[res]?.jpg?.url ??
    f?.diff?.[res]?.jpg?.url ?? null
  if (colorUrl) maps.map = colorUrl

  const roughUrl =
    f?.Roughness?.[res]?.jpg?.url ??
    f?.rough?.[res]?.jpg?.url ?? null
  if (roughUrl) maps.roughnessMap = roughUrl

  const metalUrl =
    f?.Metalness?.[res]?.jpg?.url ??
    f?.Metallic?.[res]?.jpg?.url ??
    f?.metal?.[res]?.jpg?.url ?? null
  if (metalUrl) maps.metalnessMap = metalUrl

  const normalUrl =
    f?.nor_gl?.[res]?.jpg?.url ??
    f?.Normal?.[res]?.jpg?.url ??
    f?.nor_dx?.[res]?.jpg?.url ?? null
  if (normalUrl) maps.normalMap = normalUrl

  return maps
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') ?? '').trim().toLowerCase()
  const resolution = searchParams.get('res') ?? '1k'

  if (!query) {
    return NextResponse.json({ error: 'Missing q param' }, { status: 400 })
  }

  try {
    const assets = await getTextureAssets()
    const terms = query.split(/\s+/).filter(Boolean)

    // Score all assets, pick highest scorer
    let bestId = ''
    let bestScore = -1
    for (const [id, asset] of Object.entries(assets)) {
      const s = score(id, asset, terms)
      if (s > bestScore) { bestScore = s; bestId = id }
    }

    if (!bestId || bestScore === 0) {
      return NextResponse.json({ error: `No texture found for: ${query}` }, { status: 404 })
    }

    // Fetch file maps for the best match
    const filesRes = await fetch(`https://api.polyhaven.com/files/${bestId}`, {
      headers: { 'User-Agent': 'WorldBuilderPro/1.0' },
    })
    if (!filesRes.ok) throw new Error(`Poly Haven files API ${filesRes.status}`)
    const files = await filesRes.json()
    const maps = parseTextureMaps(files, resolution)

    return NextResponse.json(
      { id: bestId, name: assets[bestId].name ?? bestId, maps },
      { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
    )
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
