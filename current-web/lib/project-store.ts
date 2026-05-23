import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectState {
  currentProjectId: string | null
  currentProjectName: string | null
  setCurrentProject: (id: string, name: string) => void
  clearCurrentProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProjectId: null,
      currentProjectName: null,
      setCurrentProject: (id, name) => set({ currentProjectId: id, currentProjectName: name }),
      clearCurrentProject: () => set({ currentProjectId: null, currentProjectName: null }),
    }),
    { name: 'current-project' }
  )
)
