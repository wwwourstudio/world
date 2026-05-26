import type { CameraKeypoint } from '@/lib/scene/SceneStore'

// Set by ViewportCanvas to allow external code to animate the camera to a keypoint
export const cameraJumpFn = {
  fn: null as ((kp: CameraKeypoint) => void) | null,
}

export function moveCameraToKeypoint(kp: CameraKeypoint) {
  cameraJumpFn.fn?.(kp)
}
