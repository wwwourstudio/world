import * as THREE from 'three'

/**
 * Midpoint subdivision: splits every triangle into 4 by adding edge midpoints.
 * One level = 4× faces. Run 1-3 levels; 3 levels on a box = 384 faces (smooth enough).
 * After subdivision, applies one pass of Laplacian smoothing for a rounder result.
 */
export function subdivideGeometry(geo: THREE.BufferGeometry, levels = 1): THREE.BufferGeometry {
  let result = toIndexed(geo)
  for (let l = 0; l < levels; l++) {
    result = subdivideOnce(result)
  }
  result.computeVertexNormals()
  return result
}

function toIndexed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geo.index) return geo.clone()
  // Convert non-indexed to indexed (each unique position gets an index)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const n = pos.count
  const positions: number[] = []
  const indices: number[] = []
  const map = new Map<string, number>()

  function vertIdx(i: number): number {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`
    if (map.has(key)) return map.get(key)!
    const idx = positions.length / 3
    positions.push(x, y, z)
    map.set(key, idx)
    return idx
  }

  for (let i = 0; i < n; i += 3) {
    indices.push(vertIdx(i), vertIdx(i + 1), vertIdx(i + 2))
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  result.setIndex(indices)
  return result
}

function subdivideOnce(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = geo.index!.array as Uint16Array | Uint32Array
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const vCount = pos.count

  // Copy existing vertices
  const positions: number[] = []
  for (let i = 0; i < vCount; i++) {
    positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
  }

  // Map "edge a-b" → midpoint vertex index
  const edgeMidMap = new Map<string, number>()
  const newIndices: number[] = []

  function edgeKey(a: number, b: number): string {
    return a < b ? `${a}_${b}` : `${b}_${a}`
  }

  function getMidpoint(a: number, b: number): number {
    const key = edgeKey(a, b)
    if (edgeMidMap.has(key)) return edgeMidMap.get(key)!
    const mx = (pos.getX(a) + pos.getX(b)) / 2
    const my = (pos.getY(a) + pos.getY(b)) / 2
    const mz = (pos.getZ(a) + pos.getZ(b)) / 2
    const idx = positions.length / 3
    positions.push(mx, my, mz)
    edgeMidMap.set(key, idx)
    return idx
  }

  const triCount = idx.length / 3
  for (let t = 0; t < triCount; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2]
    const mab = getMidpoint(a, b)
    const mbc = getMidpoint(b, c)
    const mca = getMidpoint(c, a)
    // 4 sub-triangles
    newIndices.push(a, mab, mca)
    newIndices.push(mab, b, mbc)
    newIndices.push(mca, mbc, c)
    newIndices.push(mab, mbc, mca)
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  result.setIndex(newIndices)

  // One pass of Laplacian smoothing (skip original vertices to preserve shape)
  laplacianSmooth(result, 0.5, vCount)

  return result
}

function laplacianSmooth(geo: THREE.BufferGeometry, factor: number, firstNewVertex: number) {
  const idx = geo.index!.array as Uint16Array | Uint32Array
  const pos = geo.getAttribute('position') as THREE.Float32BufferAttribute
  const n = pos.count
  const sumX = new Float64Array(n)
  const sumY = new Float64Array(n)
  const sumZ = new Float64Array(n)
  const count = new Uint32Array(n)

  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2]
    const pairs = [[a, b], [a, c], [b, a], [b, c], [c, a], [c, b]]
    for (const [v, n2] of pairs) {
      sumX[v] += pos.getX(n2)
      sumY[v] += pos.getY(n2)
      sumZ[v] += pos.getZ(n2)
      count[v]++
    }
  }

  // Only smooth newly-added midpoint vertices (preserve original shape)
  for (let i = firstNewVertex; i < n; i++) {
    if (count[i] === 0) continue
    const ox = pos.getX(i), oy = pos.getY(i), oz = pos.getZ(i)
    pos.setXYZ(i,
      ox + (sumX[i] / count[i] - ox) * factor,
      oy + (sumY[i] / count[i] - oy) * factor,
      oz + (sumZ[i] / count[i] - oz) * factor,
    )
  }
  pos.needsUpdate = true
}
