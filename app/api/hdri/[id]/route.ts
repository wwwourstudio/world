import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdriId = id.replace(/\.hdr$/, '')

  // Look up the real CDN URL via the Poly Haven files API
  const filesRes = await fetch(`https://api.polyhaven.com/files/${hdriId}`, {
    headers: { 'User-Agent': 'WorldBuilderPro/1.0' },
    next: { revalidate: 3600 },
  })

  if (!filesRes.ok) {
    return NextResponse.json(
      { error: `HDRI not found: ${hdriId}` },
      { status: 404 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const files: any = await filesRes.json()
  const url: string | undefined =
    files?.hdri?.['1k']?.hdr?.url ??
    files?.hdri?.['2k']?.hdr?.url ??
    files?.hdri?.['4k']?.hdr?.url

  if (!url) {
    return NextResponse.json(
      { error: `No HDR file found for: ${hdriId}` },
      { status: 404 }
    )
  }

  // Redirect — avoids proxying large binary files through the serverless function
  // Poly Haven CDN has CORS headers so Three.js can load it directly
  return NextResponse.redirect(url, { status: 302 })
}
