import * as THREE from 'three'
import type { CameraKeypoint } from '@/lib/scene/SceneStore'

function applyEasing(t: number, easing: CameraKeypoint['easing']): number {
  switch (easing) {
    case 'ease-in': return t * t
    case 'ease-out': return t * (2 - t)
    case 'ease': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    default: return t
  }
}

export function interpolateCameraPath(
  keypoints: CameraKeypoint[],
  progress: number
): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
  if (keypoints.length === 0) {
    return { position: new THREE.Vector3(0, 5, 10), target: new THREE.Vector3(0, 0, 0), fov: 60 }
  }
  if (keypoints.length === 1) {
    const kp = keypoints[0]
    return {
      position: new THREE.Vector3(...kp.position),
      target: new THREE.Vector3(...kp.target),
      fov: kp.fov,
    }
  }

  const clamped = Math.max(0, Math.min(1, progress))
  const segments = keypoints.length - 1
  const scaled = clamped * segments
  const segIdx = Math.min(Math.floor(scaled), segments - 1)
  const rawT = scaled - segIdx

  const kp0 = keypoints[segIdx]
  const kp1 = keypoints[segIdx + 1]
  const t = applyEasing(rawT, kp0.easing)

  // Catmull-rom control points
  const p0 = new THREE.Vector3(...(segIdx > 0 ? keypoints[segIdx - 1].position : kp0.position))
  const p1 = new THREE.Vector3(...kp0.position)
  const p2 = new THREE.Vector3(...kp1.position)
  const p3 = new THREE.Vector3(...(segIdx + 2 < keypoints.length ? keypoints[segIdx + 2].position : kp1.position))

  const t0 = new THREE.Vector3(...(segIdx > 0 ? keypoints[segIdx - 1].target : kp0.target))
  const t1 = new THREE.Vector3(...kp0.target)
  const t2 = new THREE.Vector3(...kp1.target)
  const t3 = new THREE.Vector3(...(segIdx + 2 < keypoints.length ? keypoints[segIdx + 2].target : kp1.target))

  const position = catmullRom(p0, p1, p2, p3, t)
  const target = catmullRom(t0, t1, t2, t3, t)
  const fov = kp0.fov + (kp1.fov - kp0.fov) * t

  return { position, target, fov }
}

function catmullRom(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
  const t2 = t * t
  const t3 = t2 * t
  return new THREE.Vector3(
    0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  )
}
