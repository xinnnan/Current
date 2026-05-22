'use client'

import { Monitor, Box } from 'lucide-react'
import { useViewStore } from '@/lib/stores/view-store'

/**
 * View Mode Switcher — Toggle between 2D Edit and 3D Simulation views.
 * 
 * Design: Apple-style minimal toggle with smooth transition.
 */
export function ViewModeSwitcher() {
  const { viewMode, setViewMode } = useViewStore()

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5" role="radiogroup" aria-label="视图模式切换">
      <button
        onClick={() => setViewMode('2d')}
        role="radio"
        aria-checked={viewMode === '2d'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          viewMode === '2d'
            ? 'bg-white text-foreground shadow-sm'
            : 'text-muted hover:text-foreground'
        }`}
      >
        <Monitor size={14} aria-hidden="true" />
        2D 编辑
      </button>
      <button
        onClick={() => setViewMode('3d')}
        role="radio"
        aria-checked={viewMode === '3d'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          viewMode === '3d'
            ? 'bg-white text-foreground shadow-sm'
            : 'text-muted hover:text-foreground'
        }`}
      >
        <Box size={14} aria-hidden="true" />
        3D 演示
      </button>
    </div>
  )
}
