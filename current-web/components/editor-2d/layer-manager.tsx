'use client'

import { useState, useCallback } from 'react'
import {
  Eye, EyeOff, Lock, Unlock, Plus, Trash2,
  ChevronUp, ChevronDown, Layers, GripVertical,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export interface LayerItem {
  id: string
  name: string
  type: 'base_map' | 'constraint_zone' | 'routing' | 'custom'
  visible: boolean
  locked: boolean
  opacity: number
  zIndex: number
  objectCount: number
}

interface LayerManagerProps {
  layers: LayerItem[]
  activeLayerId: string | null
  onLayersChange: (layers: LayerItem[]) => void
  onActiveLayerChange: (layerId: string | null) => void
  onAddLayer?: (name: string, type: LayerItem['type']) => void
  onDeleteLayer?: (layerId: string) => void
}

const LAYER_TYPE_KEYS: Record<LayerItem['type'], string> = {
  base_map: 'layer.baseMap',
  constraint_zone: 'layer.constraintZone',
  routing: 'layer.routing',
  custom: 'layer.custom',
}

const LAYER_TYPE_COLORS: Record<LayerItem['type'], string> = {
  base_map: 'text-blue-500',
  constraint_zone: 'text-red-500',
  routing: 'text-green-500',
  custom: 'text-purple-500',
}

export function LayerManager({
  layers,
  activeLayerId,
  onLayersChange,
  onActiveLayerChange,
  onAddLayer,
  onDeleteLayer,
}: LayerManagerProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const { t } = useTranslation()

  const toggleVisibility = useCallback((layerId: string) => {
    onLayersChange(
      layers.map(l =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      )
    )
  }, [layers, onLayersChange])

  const toggleLock = useCallback((layerId: string) => {
    onLayersChange(
      layers.map(l =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      )
    )
  }, [layers, onLayersChange])

  const moveLayer = useCallback((layerId: string, direction: 'up' | 'down') => {
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex)
    const idx = sorted.findIndex(l => l.id === layerId)
    if (idx < 0) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const newLayers = layers.map(l => {
      if (l.id === sorted[idx].id) return { ...l, zIndex: sorted[swapIdx].zIndex }
      if (l.id === sorted[swapIdx].id) return { ...l, zIndex: sorted[idx].zIndex }
      return l
    })
    onLayersChange(newLayers)
  }, [layers, onLayersChange])

  const handleAddLayer = (type: LayerItem['type']) => {
    if (onAddLayer) {
      const name = `${t(LAYER_TYPE_KEYS[type])}${t('layer.layerSuffix')} ${layers.filter(l => l.type === type).length + 1}`
      onAddLayer(name, type)
    }
    setShowAddMenu(false)
  }

  const handleDelete = (layerId: string) => {
    if (onDeleteLayer) {
      onDeleteLayer(layerId)
    }
    if (activeLayerId === layerId) {
      onActiveLayerChange(null)
    }
  }

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-panel-border flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('layer.title')}</h3>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="p-1 rounded hover:bg-gray-100 text-muted hover:text-foreground transition-colors"
            title={t('layer.addLayer')}
          >
            <Plus size={14} />
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 min-w-[120px]">
              {(['routing', 'constraint_zone', 'custom'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleAddLayer(type)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  <Layers size={12} className={LAYER_TYPE_COLORS[type]} />
                  {t(LAYER_TYPE_KEYS[type])}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {sortedLayers.map(layer => (
          <div
            key={layer.id}
            className={`group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
              activeLayerId === layer.id
                ? 'bg-accent/10 text-foreground'
                : 'text-muted hover:bg-gray-50 hover:text-foreground'
            }`}
            onClick={() => onActiveLayerChange(layer.id)}
          >
            <GripVertical size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
            <Layers size={14} className={LAYER_TYPE_COLORS[layer.type]} />
            <span className="flex-1 truncate text-xs">{layer.name}</span>

            {layer.objectCount > 0 && (
              <span className="text-[10px] text-gray-400">{layer.objectCount}</span>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id) }}
              className="p-0.5 rounded hover:bg-gray-200 transition-colors"
              title={layer.visible ? t('layer.hide') : t('layer.show')}
            >
              {layer.visible ? (
                <Eye size={12} className="text-gray-500" />
              ) : (
                <EyeOff size={12} className="text-gray-300" />
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); toggleLock(layer.id) }}
              className="p-0.5 rounded hover:bg-gray-200 transition-colors"
              title={layer.locked ? t('layer.unlock') : t('layer.lock')}
            >
              {layer.locked ? (
                <Lock size={12} className="text-orange-500" />
              ) : (
                <Unlock size={12} className="text-gray-300" />
              )}
            </button>

            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up') }}
                className="p-0 hover:bg-gray-200 rounded"
                title={t('layer.moveUp')}
              >
                <ChevronUp size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down') }}
                className="p-0 hover:bg-gray-200 rounded"
                title={t('layer.moveDown')}
              >
                <ChevronDown size={10} />
              </button>
            </div>

            {layer.type !== 'base_map' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(layer.id) }}
                className="p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title={t('layer.deleteLayer')}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Opacity slider for active layer */}
      {activeLayerId && (() => {
        const activeLayer = layers.find(l => l.id === activeLayerId)
        if (!activeLayer) return null
        return (
          <div className="p-3 border-t border-panel-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">{t('layer.opacity')}</span>
              <span className="text-xs text-muted">{Math.round(activeLayer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(activeLayer.opacity * 100)}
              onChange={(e) => {
                onLayersChange(
                  layers.map(l =>
                    l.id === activeLayerId ? { ...l, opacity: parseInt(e.target.value) / 100 } : l
                  )
                )
              }}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>
        )
      })()}
    </div>
  )
}
