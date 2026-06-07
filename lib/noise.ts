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

// Domain-warped fBm — offsets sample coordinates by another fBm pass, creating
// geological ridges and folded rock formations that plain fBm can't reproduce.
export function domainWarpedFbm(
  x: number,
  z: number,
  seed: number,
  octaves: number,
  scale: number,
  warpStrength: number,
  persistence = 0.5,
  lacunarity = 2.0
): number {
  const wx = fbmNoise(x + 1.7, z + 9.2, seed, 3, scale, persistence, lacunarity)
  const wz = fbmNoise(x + 8.3, z + 2.8, seed + 5, 3, scale, persistence, lacunarity)
  return fbmNoise(
    x + warpStrength * wx,
    z + warpStrength * wz,
    seed, octaves, scale, persistence, lacunarity
  )
}

// Simple 2D Worley (cellular) noise — returns 0–1 distance to nearest cell center.
// Useful for adding rocky pitting, craters, or karst features to terrain.
export function worleyNoise2D(x: number, z: number, seed: number): number {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  let minDist = Infinity
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx
      const cz = zi + dz
      const rx = hash(cx + cz * 57 + seed * 31) + cx
      const rz = hash(cx * 113 + cz + seed * 17) + cz
      const d = Math.sqrt((x - rx) ** 2 + (z - rz) ** 2)
      if (d < minDist) minDist = d
    }
  }
  return Math.min(1, minDist)
}

// Sample terrain height at world XZ coordinates, matching the renderer's height
// formula so objects can be auto-snapped to the terrain surface.
export interface TerrainSampleConfig {
  seed: number
  heightScale: number
  noiseScale: number
  layers: number
  domainWarp?: number
  position?: [number, number, number]
}

export function sampleTerrainHeight(x: number, z: number, cfg: TerrainSampleConfig): number {
  const { seed, heightScale, noiseScale, layers, domainWarp = 0, position = [0, 0, 0] } = cfg
  const lx = x - position[0]
  const lz = z - position[2]
  const raw = domainWarp > 0
    ? domainWarpedFbm(lx, lz, seed, layers, noiseScale, domainWarp)
    : fbmNoise(lx, lz, seed, layers, noiseScale)
  return position[1] + raw * heightScale
}

// Thermal erosion — iteratively redistributes material from steep slopes to
// flat neighbors, simulating rock talus and sediment deposition.
// Operates on a flat heights array (row-major, res×res). Mutates in place.
export function thermalErosion(
  heights: Float32Array,
  res: number,
  steps: number,
  talus = 0.4,
  transferRate = 0.5
): void {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (let s = 0; s < steps; s++) {
    for (let iz = 1; iz < res - 1; iz++) {
      for (let ix = 1; ix < res - 1; ix++) {
        const idx = iz * res + ix
        const h = heights[idx]
        for (const [dz, dx] of dirs) {
          const nidx = (iz + dz) * res + (ix + dx)
          const diff = h - heights[nidx]
          if (diff > talus) {
            const transfer = transferRate * (diff - talus) * 0.5
            heights[idx] -= transfer
            heights[nidx] += transfer
          }
        }
      }
    }
  }
}
