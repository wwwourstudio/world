export const cameraFrameFn = {
  current: null as ((pos: [number, number, number], distance?: number) => void) | null,
}
