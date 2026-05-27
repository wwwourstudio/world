import type { CameraKeypoint } from '@/lib/scene/SceneStore'

// Global ref — set by ViewportCanvas's CameraCapture component
export const jumpToCamera = {
  fn: null as ((pos: [number, number, number], target: [number, number, number], fov: number) => void) | null,
}

export function moveCameraToKeypoint(kp: CameraKeypoint): void {
  if (jumpToCamera.fn) {
    jumpToCamera.fn(kp.position, kp.target, kp.fov)
  }
}
