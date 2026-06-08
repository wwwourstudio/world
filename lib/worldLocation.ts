import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorldLocation {
  name: string
  lat: number
  lon: number
}

interface WorldLocationState {
  location: WorldLocation | null
  setLocation: (loc: WorldLocation | null) => void
}

export const useWorldLocation = create<WorldLocationState>()(
  persist(
    (set) => ({
      location: null,
      setLocation: (loc) => set({ location: loc }),
    }),
    { name: 'wbp-world-location' }
  )
)
