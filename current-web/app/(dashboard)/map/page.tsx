'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Upload, Pen, Navigation, MousePointer2, Hand,
  Route, Hexagon, Trash2, Package,
} from 'lucide-react'
import { MapEditor, type EditorTool, type MapEditorRef, type PlacedAsset } from '@/components/editor-2d/map-editor'
import { LayerManager, type LayerItem } from '@/components/editor-2d/layer-manager'
import { CalibrationWizard, type CalibrationData } from '@/components/editor-2d/calibration-wizard'
import { AssetPicker, type AssetLibraryItem } from '@/components/editor-2d/asset-picker'
import { useTranslation } from '@/lib/i18n'
import { useProjectStore } from '@/lib/project-store'

interface MapRecord {
  id: string
  project_id: string
  name: string
  base_image_url: string | null
  base_image_width: number | null
  base_image_height: number | null
  calibration: Record<string, unknown>
  scale_ratio: number
}

export default function MapPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  const { setCurrentProject } = useProjectStore()

  // Map record from database
  const [mapRecord, setMapRecord] = useState<MapRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Layer state
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: 'base', name: t('map.baseLayer'), type: 'base_map', visible: true, locked: false, opacity: 1, zIndex: 0, objectCount: 0 },
    { id: 'constraint', name: t('map.constraintLayer'), type: 'constraint_zone', visible: true, locked: false, opacity: 0.8, zIndex: 1, objectCount: 0 },
    { id: 'routing', name: t('map.routingLayer'), type: 'routing', visible: true, locked: false, opacity: 1, zIndex: 2, objectCount: 0 },
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

  // ── Load or create map record for the project ──
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const initMap = async () => {
      try {
        // Try to load existing map
        const res = await fetch(`/api/maps?project_id=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          const maps = data.maps || []

          if (maps.length > 0) {
            // Use existing map
            const existingMap = maps[0] as MapRecord
            setMapRecord(existingMap)

            // Restore calibration if exists
            const calib = existingMap.calibration as Record<string, unknown>
            if (calib && calib.point_a && calib.point_b && calib.real_distance_m) {
              const pointA = calib.point_a as [number, number]
              const pointB = calib.point_b as [number, number]
              const dx = pointB[0] - pointA[0]
              const dy = pointB[1] - pointA[1]
              const pixelDist = Math.sqrt(dx * dx + dy * dy)
              const realDistM = calib.real_distance_m as number

              setCalibration({
                pointA: { x: pointA[0], y: pointA[1] },
                pointB: { x: pointB[0], y: pointB[1] },
                pixelDistance: pixelDist,
                realDistanceM: realDistM,
                pixelsPerMeter: pixelDist / realDistM,
              })
            }
          } else {
            // Create new map for this project
            const createRes = await fetch('/api/maps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_id: projectId,
                name: 'Main Map',
              }),
            })
            if (createRes.ok) {
              const createData = await createRes.json()
              setMapRecord(createData.map)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load map:', err)
      } finally {
        setLoading(false)
      }
    }

    initMap()
  }, [projectId])

  // ── Save calibration to database ──
  const saveCalibration = useCallback(async (calibData: CalibrationData | null) => {
    if (!mapRecord) return

    try {
      await fetch(`/api/maps/${mapRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calibration: calibData ? {
            point_a: [calibData.pointA!.x, calibData.pointA!.y],
            point_b: [calibData.pointB!.x, calibData.pointB!.y],
            real_distance_m: calibData.realDistanceM,
            pixels_per_meter: calibData.pixelsPerMeter,
          } : {},
          scale_ratio: calibData?.pixelsPerMeter ? 1 / calibData.pixelsPerMeter : 1.0,
        }),
      })
    } catch (err) {
      console.error('Failed to save calibration:', err)
    }
  }, [mapRecord])

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
      const calibData: CalibrationData = {
        pointA,
        pointB,
        pixelDistance: pixelDist,
        realDistanceM: 0,
        pixelsPerMeter: 0,
      }
      setCalibration(calibData)
    } else if (action === 'select_element') {
      setSelectedElement(data as { type: 'node' | 'edge' | 'zone' | 'asset'; id: string; properties: Record<string, unknown> })
    } else if (action === 'asset_placed') {
      const placed = data as unknown as PlacedAsset
      setPlacedAssets(prev => [...prev, placed])
      setPendingAsset(null)
      setActiveTool('select')
    }
  }, [])

  // Handle calibration change (with save)
  const handleCalibrationChange = useCallback((data: CalibrationData | null) => {
    setCalibration(data)
    if (data && data.realDistanceM > 0) {
      saveCalibration(data)
    }
  }, [saveCalibration])

  // Handle asset selection from AssetPicker
  const handleAssetSelect = useCallback((asset: AssetLibraryItem) => {
    setPendingAsset(asset)
    setActiveTool('place_asset')
    setShowAssetPicker(false)
  }, [])

  // Tool definitions
  const tools: { id: EditorTool; icon: typeof MousePointer2; labelKey: string }[] = [
    { id: 'select', icon: MousePointer2, labelKey: 'map.toolSelect' },
    { id: 'pan', icon: Hand, labelKey: 'map.toolPan' },
    { id: 'node', icon: Navigation, labelKey: 'map.toolNode' },
    { id: 'line', icon: Route, labelKey: 'map.toolLine' },
    { id: 'polygon', icon: Hexagon, labelKey: 'map.toolPolygon' },
    { id: 'place_asset', icon: Package, labelKey: 'map.toolPlaceAsset' },
    { id: 'calibrate', icon: Pen, labelKey: 'map.toolCalibrate' },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted">{projectId ? 'Loading map...' : 'No project selected'}</div>
      </div>
    )
  }

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
            onCalibrationChange={handleCalibrationChange}
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
            {t('map.assetLibrary')}
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
            {t('map.importBase')}
          </button>
        </div>
      </div>

      {/* Center - Canvas Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-10 border-b border-panel-border bg-panel-bg flex items-center px-3 gap-1 shrink-0" role="toolbar" aria-label={t('map.toolbarAriaLabel')}>
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-1.5 rounded transition-colors ${
                activeTool === tool.id
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-gray-100 text-muted hover:text-foreground'
              }`}
              title={t(tool.labelKey)}
              aria-label={t(tool.labelKey)}
              aria-pressed={activeTool === tool.id}
            >
              <tool.icon size={16} aria-hidden="true" />
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1" role="separator" />
          <button
            onClick={() => editorRef.current?.importFile()}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-muted hover:text-foreground text-xs transition-colors"
            aria-label={t('map.importAriaLabel')}
          >
            <Upload size={12} aria-hidden="true" />
            {t('map.import')}
          </button>
          <div className="flex-1" />
          {calibration && calibration.pixelsPerMeter > 0 && (
            <span className="text-xs text-green-600 font-medium">
              {t('map.scale')}: {calibration.pixelsPerMeter.toFixed(1)} px/m
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
              {t('map.clickToPlace')}: {pendingAsset.name}
              <button
                onClick={() => { setPendingAsset(null); setActiveTool('select') }}
                className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs hover:bg-white/30"
                aria-label={t('map.cancelPlacement')}
              >
                {t('map.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-72 border-l border-panel-border bg-panel-bg overflow-auto shrink-0 flex flex-col">
        <div className="p-3 border-b border-panel-border flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('map.properties')}</h3>
          {selectedElement && (
            <button
              onClick={() => setSelectedElement(null)}
              className="p-1 rounded hover:bg-gray-100 text-muted"
              aria-label={t('map.deselect')}
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        {selectedElement ? (
          <div className="p-4 space-y-3">
            <div className="text-xs font-medium text-muted uppercase">
              {selectedElement.type === 'node' ? t('map.nodeProperties') :
               selectedElement.type === 'edge' ? t('map.edgeProperties') : t('map.zoneProperties')}
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
              <p className="text-sm">{t('map.selectElement')}</p>
              <p className="text-xs mt-1">{t('map.clickToEdit')}</p>
            </div>
          </div>
        )}

        {/* Placed assets list */}
        {placedAssets.length > 0 && (
          <div className="border-t border-panel-border">
            <div className="p-3 text-xs font-medium text-muted">{t('map.placedAssets')} ({placedAssets.length})</div>
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
          <div className="text-xs font-medium text-muted">{t('map.mapStats')}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">{t('map.nodes')}</div>
              <div className="font-medium">0</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">{t('map.edges')}</div>
              <div className="font-medium">0</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">{t('map.assets')}</div>
              <div className="font-medium">{placedAssets.length}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">{t('map.layers')}</div>
              <div className="font-medium">{layers.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
