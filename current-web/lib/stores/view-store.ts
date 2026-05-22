import { create } from 'zustand'

export type ViewMode = '2d' | '3d'
export type CameraPreset = 'top' | 'perspective' | 'follow' | 'free'

interface ViewState {
  // View mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void

  // Camera
  cameraPreset: CameraPreset
  setCameraPreset: (preset: CameraPreset) => void

  // Playback
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void

  // Selection
  selectedAGVId: string | null
  setSelectedAGVId: (id: string | null) => void

  // Scene bounds (for camera framing)
  sceneBounds: { minX: number; maxX: number; minY: number; maxY: number }
  setSceneBounds: (bounds: { minX: number; maxX: number; minY: number; maxY: number }) => void
}

export const useViewStore = create<ViewState>((set) => ({
  // View mode
  viewMode: '2d',
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === '2d' ? '3d' : '2d' })),

  // Camera
  cameraPreset: 'perspective',
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  // Playback
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  playbackSpeed: 1,
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  // Selection
  selectedAGVId: null,
  setSelectedAGVId: (id) => set({ selectedAGVId: id }),

  // Scene bounds
  sceneBounds: { minX: 0, maxX: 30, minY: 0, maxY: 30 },
  setSceneBounds: (bounds) => set({ sceneBounds: bounds }),
}))
