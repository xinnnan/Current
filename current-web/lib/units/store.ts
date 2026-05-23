import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UnitSystem = 'metric' | 'imperial' | 'us_customary'

interface UnitState {
  unitSystem: UnitSystem
  setUnitSystem: (system: UnitSystem) => void
}

export const useUnitStore = create<UnitState>()(
  persist(
    (set) => ({
      unitSystem: 'metric',
      setUnitSystem: (unitSystem) => set({ unitSystem }),
    }),
    { name: 'current-units' }
  )
)
