import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const res = await fetch(`https://api.polyhaven.com/files/${id}`, {
      headers: { 'User-Agent': 'WorldBuilderPro/1.0' },
    })
    if (!res.ok) throw new Error(`Poly Haven API ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
