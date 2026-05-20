import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('t') ?? 'hdris'

  try {
    const res = await fetch(`https://api.polyhaven.com/assets?t=${type}`, {
      headers: { 'User-Agent': 'WorldBuilderPro/1.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`Poly Haven API ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
