'use client'

import { useState } from 'react'
import { Package, Search, Plus, Info } from 'lucide-react'
import type { AssetCategory } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

interface AssetLibraryItem {
  id: string
  name: string
  category: AssetCategory
  modelUrl: string | null
  thumbnailUrl: string | null
  dimension_length: number | null
  dimension_width: number | null
  dimension_height: number | null
}

interface AssetPickerProps {
  onSelect: (asset: AssetLibraryItem) => void
  selectedAssetId?: string | null
}

const CATEGORY_ICON_MAP: Record<AssetCategory, string> = {
  agv_lmr: '🤖',
  agv_fmr: '🚗',
  agv_ctu: '📦',
  shelf: '🗄️',
  conveyor: '⛓️',
  robot_arm: '🦾',
  workstation: '🔧',
  pallet: '📋',
  charger: '🔋',
  other: '📦',
}

const CATEGORY_KEY_MAP: Record<AssetCategory, string> = {
  agv_lmr: 'assetPicker.agvLmr',
  agv_fmr: 'assetPicker.agvFmr',
  agv_ctu: 'assetPicker.agvCtu',
  shelf: 'assetPicker.shelf',
  conveyor: 'assetPicker.conveyor',
  robot_arm: 'assetPicker.robotArm',
  workstation: 'assetPicker.workstation',
  pallet: 'assetPicker.pallet',
  charger: 'assetPicker.charger',
  other: 'assetPicker.other',
}

// Demo assets — names are localized via keys
const DEMO_ASSET_KEYS: { id: string; nameKey: string; category: AssetCategory; dimension_length: number; dimension_width: number; dimension_height: number }[] = [
  { id: 'agv_1', nameKey: 'assetPicker.agvLmr', category: 'agv_lmr', dimension_length: 1.2, dimension_width: 0.8, dimension_height: 0.3 },
  { id: 'agv_2', nameKey: 'assetPicker.agvFmr', category: 'agv_fmr', dimension_length: 2.0, dimension_width: 1.0, dimension_height: 1.5 },
  { id: 'shelf_1', nameKey: 'assetPicker.shelf', category: 'shelf', dimension_length: 1.2, dimension_width: 0.5, dimension_height: 2.0 },
  { id: 'shelf_2', nameKey: 'assetPicker.shelf', category: 'shelf', dimension_length: 2.7, dimension_width: 1.0, dimension_height: 3.0 },
  { id: 'charger_1', nameKey: 'assetPicker.charger', category: 'charger', dimension_length: 0.5, dimension_width: 0.3, dimension_height: 1.2 },
  { id: 'conv_1', nameKey: 'assetPicker.conveyor', category: 'conveyor', dimension_length: 3.0, dimension_width: 0.6, dimension_height: 0.8 },
  { id: 'ws_1', nameKey: 'assetPicker.workstation', category: 'workstation', dimension_length: 1.5, dimension_width: 0.8, dimension_height: 0.9 },
  { id: 'pallet_1', nameKey: 'assetPicker.pallet', category: 'pallet', dimension_length: 1.2, dimension_width: 1.0, dimension_height: 0.15 },
]

export function AssetPicker({ onSelect, selectedAssetId }: AssetPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all')
  const { t } = useTranslation()

  // Build localized demo assets
  const DEMO_ASSETS: AssetLibraryItem[] = DEMO_ASSET_KEYS.map(a => ({
    id: a.id,
    name: t(a.nameKey),
    category: a.category,
    modelUrl: null,
    thumbnailUrl: null,
    dimension_length: a.dimension_length,
    dimension_width: a.dimension_width,
    dimension_height: a.dimension_height,
  }))

  const filteredAssets = DEMO_ASSETS.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-panel-border">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Package size={14} />
          {t('assetPicker.title')}
        </h3>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-panel-border">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('assetPicker.search')}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="p-2 border-b border-panel-border flex flex-wrap gap-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            categoryFilter === 'all' ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-muted hover:bg-gray-200'
          }`}
        >
          {t('assetPicker.all')}
        </button>
        {(['agv_lmr', 'agv_fmr', 'shelf', 'charger', 'conveyor', 'workstation', 'pallet'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              categoryFilter === cat ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-muted hover:bg-gray-200'
            }`}
          >
            {CATEGORY_ICON_MAP[cat]} {t(CATEGORY_KEY_MAP[cat])}
          </button>
        ))}
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {filteredAssets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            className={`w-full text-left p-2 rounded-md text-xs transition-colors ${
              selectedAssetId === asset.id
                ? 'bg-accent/10 border border-accent/30'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{CATEGORY_ICON_MAP[asset.category]}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{asset.name}</div>
                <div className="text-[10px] text-muted">
                  {asset.dimension_length && `${asset.dimension_length}×${asset.dimension_width}×${asset.dimension_height}m`}
                </div>
              </div>
              <Plus size={14} className="text-muted" />
            </div>
          </button>
        ))}
        {filteredAssets.length === 0 && (
          <div className="text-center text-muted text-xs py-4">
            {t('assetPicker.noMatch')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 border-t border-panel-border">
        <div className="flex items-center gap-1 text-[10px] text-muted">
          <Info size={10} />
          <span>{t('assetPicker.hint')}</span>
        </div>
      </div>
    </div>
  )
}

export { CATEGORY_KEY_MAP, CATEGORY_ICON_MAP }
export type { AssetLibraryItem }
