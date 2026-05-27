import type { CameraKeypoint } from '@/lib/scene/SceneStore'

// Set by CameraCapture component — instant teleport (Website Panel "Jump" button)
export const jumpToCamera = {
  fn: null as ((pos: [number, number, number], target: [number, number, number], fov: number) => void) | null,
}

// Set by CameraLinkAnimator — smooth lerp animation (camera-link click actions on objects)
export const cameraJumpFn = {
  fn: null as ((kp: CameraKeypoint) => void) | null,
}

export function moveCameraToKeypoint(kp: CameraKeypoint): void {
  if (jumpToCamera.fn) {
    jumpToCamera.fn(kp.position, kp.target, kp.fov)
  }
}
