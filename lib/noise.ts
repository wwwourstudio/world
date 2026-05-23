// Simplex-style value noise for terrain generation

function hash(n: number): number {
  const x = Math.sin(n) * 43758.5453123
  return x - Math.floor(x)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export function valueNoise2D(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi

  const ux = smoothstep(xf)
  const uy = smoothstep(yf)

  const a = hash(xi + yi * 57)
  const b = hash(xi + 1 + yi * 57)
  const c = hash(xi + (yi + 1) * 57)
  const d = hash(xi + 1 + (yi + 1) * 57)

  return a + (b - a) * ux + (c - a) * uy + (d - a + a - b - c + b) * ux * uy
}

export function fbmNoise(
  x: number,
  y: number,
  seed: number,
  octaves: number,
  scale: number,
  persistence = 0.5,
  lacunarity = 2.0
): number {
  let value = 0
  let amplitude = 1
  let frequency = scale
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * frequency + seed * 13.7, y * frequency + seed * 7.3) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }

  return value / maxValue
}
