// Resilient Sketchfab fetch: 12s timeout per attempt + one retry.
// Retries on network error, timeout, 5xx, and 429 (rate limit). Does NOT
// retry other 4xx responses (auth/not-found/bad-request are not transient).
export async function fetchSketchfab(
  url: string,
  apiKey: string,
  tries = 2,
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt < tries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Token ${apiKey}` },
        cache: 'no-store',
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (res.ok) return res
      // Non-retryable client errors (except 429) — return as-is for the caller to handle
      if (res.status < 500 && res.status !== 429) return res
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (e) {
      clearTimeout(timer)
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Sketchfab fetch failed')
}
