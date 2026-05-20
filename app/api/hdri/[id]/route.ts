import { NextResponse } from 'next/server'

const POLY_HAVEN_CDN = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdriId = id.replace(/\.hdr$/, '')
  const url = `${POLY_HAVEN_CDN}/${hdriId}_1k.hdr`

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'WorldBuilderPro/1.0' },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `HDRI not found: ${hdriId}` },
        { status: 404 }
      )
    }

    const buffer = await upstream.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch HDRI: ${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
