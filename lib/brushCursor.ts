// Module-level brush cursor — updated on every pointer move, read in useFrame.
// Intentionally NOT Zustand (no re-renders needed; useFrame polls imperatively).
export const brushCursor: { pos: [number, number, number] | null } = { pos: null }
