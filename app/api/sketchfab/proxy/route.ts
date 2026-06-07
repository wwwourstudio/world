export const runtime = 'edge'

const ALLOWED_HOSTS = [
  'media.sketchfab.com',
  'sketchfab.com',
]

function isAllowed(hostname: string): boolean {
  if (ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))) return true
  // Sketchfab S3 buckets: sketchfab-prod-*.s3.amazonaws.com
  if (/^sketchfab-prod-[a-z0-9-]+\.s3\.amazonaws\.com$/.test(hostname)) return true
  return false
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('url')
  if (!raw) return new Response('Missing url param', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  if (parsed.protocol !== 'https:') return new Response('Only HTTPS allowed', { status: 400 })
  if (!isAllowed(parsed.hostname)) return new Response('Domain not allowed', { status: 403 })

  let upstream: Response
  try {
    upstream = await fetch(raw)
  } catch (e) {
    return new Response(`Upstream fetch failed: ${e instanceof Error ? e.message : String(e)}`, { status: 502 })
  }

  if (!upstream.ok) {
    return new Response(`Upstream error ${upstream.status}`, { status: upstream.status })
  }

  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600, immutable',
  })
  const ct = upstream.headers.get('Content-Type')
  if (ct) headers.set('Content-Type', ct)
  const cl = upstream.headers.get('Content-Length')
  if (cl) headers.set('Content-Length', cl)

  return new Response(upstream.body, { headers })
}
