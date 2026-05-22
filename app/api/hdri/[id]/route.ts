import { NextResponse } from 'next/server'

// Poly Haven's CDN supports CORS, so we redirect instead of proxying.
// This avoids buffering large binary files in the serverless function.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdriId = id.replace(/\.hdr$/, '')
  const cdnUrl = `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${hdriId}_1k.hdr`
  return NextResponse.redirect(cdnUrl, { status: 302 })
}
