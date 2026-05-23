'use client'

import { Upload, Search, Box, Download } from 'lucide-react'
import { ModelViewer } from '@/components/viewer-3d/model-viewer'
import { useTranslation } from '@/lib/i18n'

export default function AssetsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full">
      {/* Left Panel - Asset List */}
      <div className="w-72 border-r border-panel-border bg-panel-bg flex flex-col shrink-0">
        <div className="p-3 border-b border-panel-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('assets.search')}
              aria-label={t('assets.searchAriaLabel')}
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1 p-3 border-b border-panel-border overflow-x-auto">
          {[t('assets.all'), 'AGV', t('assets.shelf'), t('assets.conveyor'), t('assets.workstation')].map((cat) => (
            <button
              key={cat}
              className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-muted hover:bg-accent/10 hover:text-accent transition-colors whitespace-nowrap"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Asset list */}
        <div className="flex-1 overflow-auto p-3">
          <div className="text-center py-12 text-muted text-sm">
            <Box size={32} className="mx-auto mb-2 opacity-30" />
            <p>{t('assets.empty')}</p>
            <p className="text-xs mt-1">{t('assets.emptyDesc')}</p>
          </div>
        </div>

        {/* Upload button */}
        <div className="p-3 border-t border-panel-border">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors" aria-label={t('assets.uploadAriaLabel')}>
            <Upload size={16} aria-hidden="true" />
            {t('assets.upload')}
          </button>
        </div>
      </div>

      {/* Center - 3D Viewer */}
      <div className="flex-1 relative">
        <ModelViewer />
        {/* Viewer controls overlay */}
        <div className="absolute top-3 right-3 flex gap-1">
          <button className="p-1.5 bg-white/90 rounded shadow-sm text-muted hover:text-foreground transition-colors" title={t('assets.exportGlb')} aria-label={t('assets.exportGlbAriaLabel')}>
            <Download size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 border-l border-panel-border bg-panel-bg overflow-auto shrink-0">
        <div className="p-4 border-b border-panel-border">
          <h3 className="text-sm font-medium">{t('assets.properties')}</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Basic info */}
          <section>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{t('assets.basicInfo')}</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-muted mb-0.5">{t('assets.name')}</label>
                <input
                  type="text"
                  placeholder="--"
                  className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">{t('assets.category')}</label>
                <select className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent">
                  <option>{t('assets.selectCategory')}</option>
                  <option>{t('assets.agvLmr')}</option>
                  <option>{t('assets.agvFmr')}</option>
                  <option>{t('assets.shelf')}</option>
                  <option>{t('assets.conveyor')}</option>
                  <option>{t('assets.workstation')}</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.lengthCm')}</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.widthCm')}</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.heightCm')}</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
            </div>
          </section>

          {/* Physical properties */}
          <section>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{t('assets.physical')}</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.density')}</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.mass')}</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.friction')}</label>
                  <input type="number" step="0.01" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-0.5">{t('assets.youngsModulus')}</label>
                  <input type="number" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-0.5">{t('assets.poissonRatio')}</label>
                <input type="number" step="0.01" placeholder="--" className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent" />
              </div>
            </div>
          </section>

          {/* Export */}
          <section>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{t('assets.export')}</h4>
            <div className="flex gap-2">
              <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors">
                GLB
              </button>
              <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors">
                URDF
              </button>
              <button className="flex-1 py-1.5 text-xs bg-gray-100 text-muted rounded hover:bg-gray-200 transition-colors">
                MJCF
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
