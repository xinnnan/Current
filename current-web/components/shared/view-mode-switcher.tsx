'use client'

import { Monitor, Box } from 'lucide-react'
import { useViewStore } from '@/lib/stores/view-store'
import { useTranslation } from '@/lib/i18n'

/**
 * View Mode Switcher — Toggle between 2D Edit and 3D Simulation views.
 */
export function ViewModeSwitcher() {
  const { viewMode, setViewMode } = useViewStore()
  const { t } = useTranslation()

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5" role="radiogroup" aria-label={t('viewMode.ariaLabel')}>
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
        {t('viewMode.2d')}
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
        {t('viewMode.3d')}
      </button>
    </div>
  )
}
