'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload, Pen, Navigation, MousePointer2, Hand,
  Route, Hexagon, Trash2, Package,
} from 'lucide-react'
import { MapEditor, type EditorTool, type MapEditorRef, type PlacedAsset } from '@/components/editor-2d/map-editor'
import { LayerManager, type LayerItem } from '@/components/editor-2d/layer-manager'
import { CalibrationWizard, type CalibrationData } from '@/components/editor-2d/calibration-wizard'
import { AssetPicker, type AssetLibraryItem } from '@/components/editor-2d/asset-picker'

export default function MapPage() {
  // Layer state
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: 'base', name: '底图层', type: 'base_map', visible: true, locked: false, opacity: 1, zIndex: 0, objectCount: 0 },
    { id: 'constraint', name: '限域层', type: 'constraint_zone', visible: true, locked: false, opacity: 0.8, zIndex: 1, objectCount: 0 },
    { id: 'routing', name: '路径层', type: 'routing', visible: true, locked: false, opacity: 1, zIndex: 2, objectCount: 0 },
  ])
  const [activeLayerId, setActiveLayerId] = useState<string | null>('routing')
  const [activeTool, setActiveTool] = useState<EditorTool>('select')

  // Calibration state
  const [calibration, setCalibration] = useState<CalibrationData | null>(null)
  const [isCalibrating, setIsCalibrating] = useState(false)

  // Selected element state
  const [selectedElement, setSelectedElement] = useState<{
    type: 'node' | 'edge' | 'zone' | 'asset'
    id: string
    properties: Record<string, unknown>
  } | null>(null)

  // Asset placement state
  const [pendingAsset, setPendingAsset] = useState<AssetLibraryItem | null>(null)
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([])
  const [showAssetPicker, setShowAssetPicker] = useState(false)

  const editorRef = useRef<MapEditorRef>(null)

  // Layer management handlers
  const handleAddLayer = useCallback((name: string, type: LayerItem['type']) => {
    const maxZ = Math.max(...layers.map(l => l.zIndex), 0)
    const newLayer: LayerItem = {
      id: `layer_${Date.now()}`,
      name,
      type,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: maxZ + 1,
      objectCount: 0,
    }
    setLayers(prev => [...prev, newLayer])
    setActiveLayerId(newLayer.id)
  }, [layers])

  const handleDeleteLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.filter(l => l.id !== layerId))
  }, [])

  // Handle tool actions from MapEditor
  const handleToolAction = useCallback((action: string, data: Record<string, unknown>) => {
    if (action === 'calibration_points') {
      const pointA = data.pointA as { x: number; y: number }
      const pointB = data.pointB as { x: number; y: number }
      const dx = pointB.x - pointA.x
      const dy = pointB.y - pointA.y
      const pixelDist = Math.sqrt(dx * dx + dy * dy)
      // Show calibration wizard with pixel distance
      setCalibration({
        pointA,
        pointB,
        pixelDistance: pixelDist,
        realDistanceM: 0,
        pixelsPerMeter: 0,
      })
    } else if (action === 'select_element') {
      setSelectedElement(data as { type: 'node' | 'edge' | 'zone' | 'asset'; id: string; properties: Record<string, unknown> })
    } else if (action === 'asset_placed') {
      const placed = data as unknown as PlacedAsset
      setPlacedAssets(prev => [...prev, placed])
      // Clear pending asset after placement
      setPendingAsset(null)
      setActiveTool('select')
    }
  }, [])

  // Handle asset selection from AssetPicker
  const handleAssetSelect = useCallback((asset: AssetLibraryItem) => {
    setPendingAsset(asset)
    setActiveTool('place_asset')
    setShowAssetPicker(false)
  }, [])

  // Tool definitions
  const tools: { id: EditorTool; icon: typeof MousePointer2; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: '选择' },
    { id: 'pan', icon: Hand, label: '平移' },
    { id: 'node', icon: Navigation, label: '路径节点' },
    { id: 'line', icon: Route, label: '路径连线' },
    { id: 'polygon', icon: Hexagon, label: '限域多边形' },
    { id: 'place_asset', icon: Package, label: '放置资产' },
    { id: 'calibrate', icon: Pen, label: '标定比例尺' },
  ]

  return (
    <div className="flex h-full">
      {/* Left Panel - Layer Manager */}
      <div className="w-64 border-r border-panel-border bg-panel-bg flex flex-col shrink-0">
        <LayerManager
          layers={layers}
          activeLayerId={activeLayerId}
          onLayersChange={setLayers}
          onActiveLayerChange={setActiveLayerId}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
        />

        {/* Calibration section */}
        <div className="border-t border-panel-border">
          <CalibrationWizard
            calibration={calibration}
            onCalibrationChange={setCalibration}
            onCalibrationModeChange={(active) => {
              setIsCalibrating(active)
              if (active) setActiveTool('calibrate')
            }}
            isCalibrating={isCalibrating}
          />
        </div>

        {/* Asset Picker toggle */}
        <div className="border-t border-panel-border">
          <button
            onClick={() => setShowAssetPicker(!showAssetPicker)}
            className={`w-full p-3 flex items-center gap-2 text-sm transition-colors ${
              showAssetPicker || pendingAsset ? 'bg-accent/10 text-accent' : 'hover:bg-gray-50 text-muted'
            }`}
          >
            <Package size={14} />
            资产库
            {pendingAsset && (
              <span className="ml-auto text-[10px] bg-accent text-white px-1.5 py-0.5 rounded-full">
                {pendingAsset.name}
              </span>
            )}
          </button>
          {showAssetPicker && (
            <div className="h-64 border-t border-panel-border">
              <AssetPicker
                onSelect={handleAssetSelect}
                selectedAssetId={pendingAsset?.id}
              />
            </div>
          )}
        </div>

        {/* Import button */}
        <div className="p-3 border-t border-panel-border">
          <button
            onClick={() => editorRef.current?.importFile()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            <Upload size={16} />
            导入底图
          </button>
        </div>
      </div>

      {/* Center - Canvas Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-10 border-b border-panel-border bg-panel-bg flex items-center px-3 gap-1 shrink-0" role="toolbar" aria-label="地图编辑工具栏">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-1.5 rounded transition-colors ${
                activeTool === tool.id
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-gray-100 text-muted hover:text-foreground'
              }`}
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={activeTool === tool.id}
            >
              <tool.icon size={16} aria-hidden="true" />
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1" role="separator" />
          <button
            onClick={() => editorRef.current?.importFile()}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-muted hover:text-foreground text-xs transition-colors"
            aria-label="导入底图文件"
          >
            <Upload size={12} aria-hidden="true" />
            导入
          </button>
          <div className="flex-1" />
          {calibration && calibration.pixelsPerMeter > 0 && (
            <span className="text-xs text-green-600 font-medium">
              比例: {calibration.pixelsPerMeter.toFixed(1)} px/m
            </span>
          )}
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative">
          <MapEditor
            ref={editorRef}
            activeTool={activeTool}
            pendingAsset={pendingAsset}
            onToolAction={handleToolAction}
          />
          {/* Placement mode indicator */}
          {pendingAsset && activeTool === 'place_asset' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-accent text-white rounded-lg shadow-md text-sm font-medium flex items-center gap-2">
              <Package size={14} />
              点击画布放置: {pendingAsset.name}
              <button
                onClick={() => { setPendingAsset(null); setActiveTool('select') }}
                className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs hover:bg-white/30"
                aria-label="取消资产放置"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-72 border-l border-panel-border bg-panel-bg overflow-auto shrink-0 flex flex-col">
        <div className="p-3 border-b border-panel-border flex items-center justify-between">
          <h3 className="text-sm font-medium">属性面板</h3>
          {selectedElement && (
            <button
              onClick={() => setSelectedElement(null)}
              className="p-1 rounded hover:bg-gray-100 text-muted"
              aria-label="取消选择"
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        {selectedElement ? (
          <div className="p-4 space-y-3">
            <div className="text-xs font-medium text-muted uppercase">
              {selectedElement.type === 'node' ? '节点属性' :
               selectedElement.type === 'edge' ? '路段属性' : '限域属性'}
            </div>
            {Object.entries(selectedElement.properties).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted">{key}</label>
                <input
                  type="text"
                  value={String(value ?? '')}
                  readOnly
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-gray-50"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-muted">
              <p className="text-sm">选择路段或节点查看属性</p>
              <p className="text-xs mt-1">在画布上点击元素进行编辑</p>
            </div>
          </div>
        )}

        {/* Placed assets list */}
        {placedAssets.length > 0 && (
          <div className="border-t border-panel-border">
            <div className="p-3 text-xs font-medium text-muted">已放置资产 ({placedAssets.length})</div>
            <div className="max-h-40 overflow-auto px-3 pb-2 space-y-1">
              {placedAssets.map((pa) => (
                <div key={pa.id} className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 rounded">
                  <span className="font-medium truncate">{pa.name}</span>
                  <span className="text-muted ml-auto">({Math.round(pa.x)}, {Math.round(pa.y)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="p-3 border-t border-panel-border space-y-2 mt-auto">
          <div className="text-xs font-medium text-muted">地图统计</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">节点</div>
              <div className="font-medium">0</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">路段</div>
              <div className="font-medium">0</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">资产</div>
              <div className="font-medium">{placedAssets.length}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">图层</div>
              <div className="font-medium">{layers.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
