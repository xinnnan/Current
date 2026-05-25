'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Upload, Pen, Navigation, MousePointer2, Hand,
  Route, Hexagon, Trash2, Package, Save, Check,
  ArrowUpFromLine, ArrowDownToLine, Building2, FolderOpen, Plus,
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

interface NodeRecord {
  id: string
  map_id: string
  x: number
  y: number
  node_type: string
  label: string | null
  properties: Record<string, unknown>
}

interface EdgeRecord {
  id: string
  map_id: string
  from_node_id: string
  to_node_id: string
  length: number | null
  speed_limit: number
  direction: string
  constraints: Record<string, unknown>
}

interface ZoneRecord {
  id: string
  map_id: string
  name: string | null
  zone_type: string
  polygon: Record<string, unknown>
  rules: Record<string, unknown>
}

interface InstanceRecord {
  id: string
  asset_id: string
  map_id: string
  position_x: number
  position_y: number
  position_z: number
  rotation: number
  scale: number
}

export default function MapPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlProjectId = searchParams.get('project')
  const { currentProjectId, setCurrentProject } = useProjectStore()
  const projectId = urlProjectId || currentProjectId

  // Map record from database
  const [mapRecord, setMapRecord] = useState<MapRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Layer state
  const [layers, setLayers] = useState<LayerItem[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
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

  // Logistics config editing state
  const [editingLogisticsConfig, setEditingLogisticsConfig] = useState<{
    throughput_items_per_hour: number
    processing_time_seconds: number
    buffer_capacity: number
    operation_type: 'pickup' | 'dropoff' | 'both'
  } | null>(null)

  // Asset placement state
  const [pendingAsset, setPendingAsset] = useState<AssetLibraryItem | null>(null)
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([])
  const [showAssetPicker, setShowAssetPicker] = useState(false)

  // ── Check sessionStorage for pending asset from "Use in Map" button ──
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pendingAsset')
      if (stored) {
        sessionStorage.removeItem('pendingAsset')
        const asset = JSON.parse(stored) as AssetLibraryItem
        setPendingAsset(asset)
        setActiveTool('place_asset')
        setShowAssetPicker(false)
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Route data (nodes/edges) for stats
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)

  // Save state
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Project list state (for when no project is selected)
  const [projects, setProjects] = useState<{ id: string; name: string; created_at: string }[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const editorRef = useRef<MapEditorRef>(null)

  // ── Fetch project list when no project selected ──
  useEffect(() => {
    if (projectId) return
    setLoadingProjects(true)
    fetch('/api/projects')
      .then(res => res.ok ? res.json() : { projects: [] })
      .then(data => {
        setProjects(data.projects || [])
        setLoadingProjects(false)
      })
      .catch(() => setLoadingProjects(false))
  }, [projectId])

  // ── Load or create map record + all related data ──
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    // Set current project in store
    setCurrentProject(projectId, '')

    const initMap = async () => {
      try {
        // Try to load existing map
        const res = await fetch(`/api/maps?project_id=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          const maps = data.maps || []

          let currentMap: MapRecord

          if (maps.length > 0) {
            currentMap = maps[0] as MapRecord
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
              currentMap = createData.map
            } else {
              setLoading(false)
              return
            }
          }

          setMapRecord(currentMap)

          // Set project name from map
          setCurrentProject(projectId, currentMap.name || 'Project')

          // Restore calibration if exists
          const calib = currentMap.calibration as Record<string, unknown>
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

          // Load layers from database
          try {
            const layersRes = await fetch(`/api/map-layers?map_id=${currentMap.id}`)
            if (layersRes.ok) {
              const layersData = await layersRes.json()
              const dbLayers = layersData.layers as { id: string; name: string; type: string; z_index: number; visible: boolean; locked: boolean; opacity: number }[]
              if (dbLayers.length > 0) {
                const loadedLayers: LayerItem[] = dbLayers.map(l => ({
                  id: l.id,
                  name: l.name,
                  type: l.type as LayerItem['type'],
                  visible: l.visible,
                  locked: l.locked,
                  opacity: l.opacity,
                  zIndex: l.z_index,
                  objectCount: 0,
                }))
                setLayers(loadedLayers)
                setActiveLayerId(loadedLayers[0]?.id || null)
              } else {
                // Create default layers
                await initDefaultLayers(currentMap.id)
              }
            }
          } catch {
            await initDefaultLayers(currentMap.id)
          }

          // Load route nodes
          let loadedNodes: { id: string; x: number; y: number; node_type: string; label?: string | null; properties?: Record<string, unknown> | null }[] = []
          try {
            const nodesRes = await fetch(`/api/route-nodes?map_id=${currentMap.id}`)
            if (nodesRes.ok) {
              const nodesData = await nodesRes.json()
              loadedNodes = nodesData.nodes || []
              setNodeCount(loadedNodes.length)
            }
          } catch { /* ignore */ }

          // Load route edges — need node coordinates for rendering
          let loadedEdges: { id: string; from_node_id: string; to_node_id: string; fromX: number; fromY: number; toX: number; toY: number }[] = []
          try {
            const edgesRes = await fetch(`/api/route-edges?map_id=${currentMap.id}`)
            if (edgesRes.ok) {
              const edgesData = await edgesRes.json()
              const rawEdges = edgesData.edges || []
              setEdgeCount(rawEdges.length)
              // Resolve node coordinates for each edge
              const nodeMap = new Map(loadedNodes.map(n => [n.id, n]))
              loadedEdges = rawEdges.map((edge: { id: string; from_node_id: string; to_node_id: string }) => {
                const fromNode = nodeMap.get(edge.from_node_id)
                const toNode = nodeMap.get(edge.to_node_id)
                return {
                  id: edge.id,
                  from_node_id: edge.from_node_id,
                  to_node_id: edge.to_node_id,
                  fromX: fromNode?.x ?? 0,
                  fromY: fromNode?.y ?? 0,
                  toX: toNode?.x ?? 0,
                  toY: toNode?.y ?? 0,
                }
              })
            }
          } catch { /* ignore */ }

          // Load placed assets (asset instances)
          let loadedAssetInstances: { id: string; asset_id: string; position_x: number; position_y: number; rotation: number; name?: string; category?: string }[] = []
          try {
            const instancesRes = await fetch(`/api/asset-instances?map_id=${currentMap.id}`)
            if (instancesRes.ok) {
              const instancesData = await instancesRes.json()
              const instances = (instancesData.instances || []) as InstanceRecord[]
              loadedAssetInstances = instances
              const placed: PlacedAsset[] = instances.map(inst => ({
                id: inst.id,
                assetId: inst.asset_id,
                name: `Asset ${inst.asset_id.slice(0, 6)}`,
                x: inst.position_x,
                y: inst.position_y,
                rotation: inst.rotation,
                width: 50,
                height: 50,
                category: 'other',
              }))
              setPlacedAssets(placed)
            }
          } catch { /* ignore */ }

          // Restore base image if exists
          if (currentMap.base_image_url) {
            setTimeout(() => {
              editorRef.current?.loadImageFromUrl?.(currentMap.base_image_url!)
            }, 500)
          }

          // Render loaded nodes/edges/assets onto canvas (after a short delay to ensure canvas is ready)
          if (loadedNodes.length > 0 || loadedEdges.length > 0 || loadedAssetInstances.length > 0) {
            setTimeout(() => {
              editorRef.current?.renderLoadedData?.({
                nodes: loadedNodes,
                edges: loadedEdges,
                assets: loadedAssetInstances,
              })
            }, 600)
          }
        }
      } catch (err) {
        console.error('Failed to load map:', err)
      } finally {
        setLoading(false)
      }
    }

    initMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ── Initialize default layers ──
  const initDefaultLayers = async (mapId: string) => {
    const defaults = [
      { name: t('map.baseLayer'), type: 'base_map' as const, zIndex: 0 },
      { name: t('map.constraintLayer'), type: 'constraint_zone' as const, zIndex: 1 },
      { name: t('map.routingLayer'), type: 'routing' as const, zIndex: 2 },
    ]

    const newLayers: LayerItem[] = []
    for (const def of defaults) {
      try {
        const res = await fetch('/api/map-layers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ map_id: mapId, name: def.name, type: def.type, z_index: def.zIndex }),
        })
        if (res.ok) {
          const data = await res.json()
          newLayers.push({
            id: data.layer.id,
            name: data.layer.name,
            type: data.layer.type,
            visible: true,
            locked: false,
            opacity: 1,
            zIndex: def.zIndex,
            objectCount: 0,
          })
        }
      } catch { /* ignore */ }
    }
    setLayers(newLayers)
    setActiveLayerId(newLayers[2]?.id || newLayers[0]?.id || null)
  }

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
  const handleAddLayer = useCallback(async (name: string, type: LayerItem['type']) => {
    if (!mapRecord) return
    const maxZ = Math.max(...layers.map(l => l.zIndex), 0)

    try {
      const res = await fetch('/api/map-layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map_id: mapRecord.id, name, type, z_index: maxZ + 1 }),
      })
      if (res.ok) {
        const data = await res.json()
        const newLayer: LayerItem = {
          id: data.layer.id,
          name: data.layer.name,
          type: data.layer.type,
          visible: true,
          locked: false,
          opacity: 1,
          zIndex: maxZ + 1,
          objectCount: 0,
        }
        setLayers(prev => [...prev, newLayer])
        setActiveLayerId(newLayer.id)
      }
    } catch { /* ignore */ }
  }, [mapRecord, layers])

  const handleDeleteLayer = useCallback(async (layerId: string) => {
    try {
      await fetch(`/api/map-layers/${layerId}`, { method: 'DELETE' })
      setLayers(prev => prev.filter(l => l.id !== layerId))
    } catch { /* ignore */ }
  }, [])

  // Handle tool actions from MapEditor
  const handleToolAction = useCallback(async (action: string, data: Record<string, unknown>) => {
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
      const elem = data as { type: 'node' | 'edge' | 'zone' | 'asset'; id: string; properties: Record<string, unknown> }
      setSelectedElement(elem)
      // Load logistics config if present
      if (elem.properties?.logistics_config) {
        setEditingLogisticsConfig(elem.properties.logistics_config as typeof editingLogisticsConfig)
      } else {
        setEditingLogisticsConfig(null)
      }
    } else if (action === 'asset_placed') {
      const placed = data as unknown as PlacedAsset
      setPlacedAssets(prev => [...prev, placed])
      setPendingAsset(null)
      setActiveTool('select')

      // Persist to database
      if (mapRecord && placed.assetId) {
        try {
          await fetch('/api/asset-instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              asset_id: placed.assetId,
              map_id: mapRecord.id,
              position_x: placed.x,
              position_y: placed.y,
              position_z: 0,
              rotation: placed.rotation,
              scale: 1,
            }),
          })
        } catch { /* ignore */ }
      }
    } else if (action === 'node_added') {
      // Persist route node to database
      if (mapRecord) {
        const x = data.x as number
        const y = data.y as number
        const label = data.label as string | undefined
        const nodeType = data.node_type as string | undefined
        const logisticsConfig = data.logistics_config as Record<string, unknown> | undefined
        try {
          const res = await fetch('/api/route-nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              map_id: mapRecord.id,
              x,
              y,
              label,
              node_type: nodeType || 'waypoint',
              logistics_config: logisticsConfig,
            }),
          })
          if (res.ok) {
            setNodeCount(prev => prev + 1)
          }
        } catch { /* ignore */ }
      }
    } else if (action === 'edge_added') {
      // Persist route edge to database
      if (mapRecord) {
        let fromNodeId = data.fromNodeId as string | undefined
        let toNodeId = data.toNodeId as string | undefined
        const length = data.length as number | undefined

        // If node IDs are missing (line drawn between arbitrary points),
        // create implicit route nodes at the line endpoints
        if (!fromNodeId && data.fromX != null && data.fromY != null) {
          try {
            const nodeRes = await fetch('/api/route-nodes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                map_id: mapRecord.id,
                x: data.fromX,
                y: data.fromY,
                node_type: 'waypoint',
                label: null,
              }),
            })
            if (nodeRes.ok) {
              const nodeData = await nodeRes.json()
              fromNodeId = nodeData.node.id
              setNodeCount(prev => prev + 1)
            }
          } catch { /* ignore */ }
        }

        if (!toNodeId && data.toX != null && data.toY != null) {
          try {
            const nodeRes = await fetch('/api/route-nodes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                map_id: mapRecord.id,
                x: data.toX,
                y: data.toY,
                node_type: 'waypoint',
                label: null,
              }),
            })
            if (nodeRes.ok) {
              const nodeData = await nodeRes.json()
              toNodeId = nodeData.node.id
              setNodeCount(prev => prev + 1)
            }
          } catch { /* ignore */ }
        }

        if (fromNodeId && toNodeId) {
          try {
            const res = await fetch('/api/route-edges', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                map_id: mapRecord.id,
                from_node_id: fromNodeId,
                to_node_id: toNodeId,
                length,
                speed_limit: 1.5,
                direction: 'bidirectional',
              }),
            })
            if (res.ok) {
              setEdgeCount(prev => prev + 1)
            }
          } catch { /* ignore */ }
        }
      }
    } else if (action === 'zone_added') {
      // Persist constraint zone to database
      if (mapRecord) {
        const points = data.points as { x: number; y: number }[]
        try {
          await fetch('/api/constraint-zones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              map_id: mapRecord.id,
              name: `Zone ${Date.now()}`,
              zone_type: 'obstacle',
              polygon: { points: points.map(p => [p.x, p.y]), type: 'polygon' },
              rules: {},
            }),
          })
        } catch { /* ignore */ }
      }
    } else if (action === 'base_image_imported') {
      // Upload base image to Storage
      if (mapRecord && data.file) {
        const file = data.file as File
        const width = data.width as number | undefined
        const height = data.height as number | undefined
        try {
          const formData = new FormData()
          formData.append('image', file)
          if (width) formData.append('width', String(width))
          if (height) formData.append('height', String(height))

          await fetch(`/api/maps/${mapRecord.id}/upload-image`, {
            method: 'POST',
            body: formData,
          })
        } catch { /* ignore */ }
      }
    }
  }, [mapRecord, projectId])

  // Handle calibration change (with save)
  const handleCalibrationChange = useCallback((data: CalibrationData | null) => {
    setCalibration(data)
    if (data && data.realDistanceM > 0) {
      saveCalibration(data)
      setLastSaved(new Date())
    }
  }, [saveCalibration])

  // ── Manual save: persist map metadata + calibration ──
  const handleSaveMap = useCallback(async () => {
    if (!mapRecord) return
    setSaving(true)
    try {
      // Save calibration if present
      if (calibration && calibration.realDistanceM > 0) {
        await saveCalibration(calibration)
      }
      // Update map record metadata
      await fetch(`/api/maps/${mapRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mapRecord.name,
          updated_at: new Date().toISOString(),
        }),
      })
      setLastSaved(new Date())
    } catch (err) {
      console.error('Failed to save map:', err)
    } finally {
      setSaving(false)
    }
  }, [mapRecord, calibration, saveCalibration])

  // Handle asset selection from AssetPicker
  const handleAssetSelect = useCallback((asset: AssetLibraryItem) => {
    setPendingAsset(asset)
    setActiveTool('place_asset')
    setShowAssetPicker(false)
  }, [])

  // Handle logistics config change and persist
  const handleLogisticsConfigChange = useCallback(async (field: string, value: number | string) => {
    if (!selectedElement || !editingLogisticsConfig) return

    const updated = { ...editingLogisticsConfig, [field]: value }
    setEditingLogisticsConfig(updated)

    // Persist to database via PATCH
    try {
      await fetch(`/api/route-nodes/${selectedElement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logistics_config: updated }),
      })
    } catch { /* ignore */ }
  }, [selectedElement, editingLogisticsConfig])

  // Tool definitions
  const tools: { id: EditorTool; icon: typeof MousePointer2; labelKey: string }[] = [
    { id: 'select', icon: MousePointer2, labelKey: 'map.toolSelect' },
    { id: 'pan', icon: Hand, labelKey: 'map.toolPan' },
    { id: 'node', icon: Navigation, labelKey: 'map.toolNode' },
    { id: 'loading_port', icon: ArrowUpFromLine, labelKey: 'map.toolLoadingPort' },
    { id: 'unloading_port', icon: ArrowDownToLine, labelKey: 'map.toolUnloadingPort' },
    { id: 'workstation', icon: Building2, labelKey: 'map.toolWorkstation' },
    { id: 'line', icon: Route, labelKey: 'map.toolLine' },
    { id: 'polygon', icon: Hexagon, labelKey: 'map.toolPolygon' },
    { id: 'place_asset', icon: Package, labelKey: 'map.toolPlaceAsset' },
    { id: 'calibrate', icon: Pen, labelKey: 'map.toolCalibrate' },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted">Loading map...</div>
      </div>
    )
  }

  // No project selected — show project list
  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-lg px-6">
          <div className="text-center mb-6">
            <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
            <h2 className="text-lg font-medium">{t('map.selectProject')}</h2>
            <p className="text-sm text-muted mt-1">{t('map.selectProjectDesc')}</p>
          </div>
          {loadingProjects ? (
            <div className="text-center text-sm text-muted">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center text-sm text-muted">
              <p>{t('map.noProjects')}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                <Plus size={14} />
                {t('map.createProject')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setCurrentProject(project.id, project.name)
                    router.push(`/map?project=${project.id}`)
                  }}
                  className="w-full text-left p-3 rounded-lg border border-panel-border hover:border-accent/30 hover:bg-accent/5 transition-colors flex items-center gap-3"
                >
                  <FolderOpen size={18} className="text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{project.name}</div>
                    <div className="text-[10px] text-muted">{new Date(project.created_at).toLocaleDateString()}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
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
              if (active) {
                editorRef.current?.resetCalibState()
                setActiveTool('calibrate')
              }
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
        <div className="h-10 border-b border-panel-border bg-panel-bg flex items-center px-3 gap-1 shrink-0 overflow-x-auto" role="toolbar" aria-label={t('map.toolbarAriaLabel')}>
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
            <span className="text-xs text-green-600 font-medium mr-2">
              {t('map.scale')}: {calibration.pixelsPerMeter.toFixed(1)} px/m
            </span>
          )}
          {lastSaved && (
            <span className="text-[10px] text-muted mr-2">
              <Check size={10} className="inline mr-0.5" />
              {t('map.savedAt')}: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSaveMap}
            disabled={saving || !mapRecord}
            className="flex items-center gap-1.5 px-3 py-1 bg-accent text-white rounded-md text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('map.saveMap')}
          >
            <Save size={12} aria-hidden="true" />
            {saving ? t('map.saving') : t('map.saveMap')}
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative">
          <MapEditor
            ref={editorRef}
            activeTool={activeTool}
            pixelsPerMeter={calibration?.pixelsPerMeter}
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

            {/* Logistics node config panel */}
            {selectedElement.type === 'node' && editingLogisticsConfig && (
              <div className="space-y-3 pb-3 border-b border-gray-200">
                <div className="text-xs font-semibold text-accent">{t('map.logisticsConfig')}</div>

                {/* Node type (read-only) */}
                <div className="space-y-1">
                  <label className="text-xs text-muted">{t('map.nodeType')}</label>
                  <div className="px-2 py-1.5 text-xs border border-gray-200 rounded bg-gray-100 font-medium">
                    {selectedElement.properties.node_type === 'loading_port' ? t('map.loadingPort') :
                     selectedElement.properties.node_type === 'unloading_port' ? t('map.unloadingPort') :
                     selectedElement.properties.node_type === 'workstation' ? t('map.workstation') :
                     String(selectedElement.properties.node_type ?? 'waypoint')}
                  </div>
                </div>

                {/* Throughput */}
                <div className="space-y-1">
                  <label className="text-xs text-muted">{t('map.throughput')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={editingLogisticsConfig.throughput_items_per_hour}
                      onChange={(e) => handleLogisticsConfigChange('throughput_items_per_hour', Number(e.target.value))}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
                    />
                    <span className="text-[10px] text-muted whitespace-nowrap">{t('map.itemsPerHour')}</span>
                  </div>
                </div>

                {/* Processing time */}
                <div className="space-y-1">
                  <label className="text-xs text-muted">{t('map.processingTime')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.1}
                      max={3600}
                      step={0.1}
                      value={editingLogisticsConfig.processing_time_seconds}
                      onChange={(e) => handleLogisticsConfigChange('processing_time_seconds', Number(e.target.value))}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
                    />
                    <span className="text-[10px] text-muted whitespace-nowrap">{t('map.secondsPerItem')}</span>
                  </div>
                </div>

                {/* Buffer capacity */}
                <div className="space-y-1">
                  <label className="text-xs text-muted">{t('map.bufferCapacity')}</label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={editingLogisticsConfig.buffer_capacity}
                    onChange={(e) => handleLogisticsConfigChange('buffer_capacity', Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
                  />
                </div>

                {/* Operation type */}
                <div className="space-y-1">
                  <label className="text-xs text-muted">{t('map.operationType')}</label>
                  <select
                    value={editingLogisticsConfig.operation_type}
                    onChange={(e) => handleLogisticsConfigChange('operation_type', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
                  >
                    <option value="pickup">{t('map.pickup')}</option>
                    <option value="dropoff">{t('map.dropoff')}</option>
                    <option value="both">{t('map.both')}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Generic properties display */}
            {Object.entries(selectedElement.properties)
              .filter(([key]) => key !== 'logistics_config' && key !== 'node_type')
              .map(([key, value]) => (
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
              <div className="font-medium">{nodeCount}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-muted">{t('map.edges')}</div>
              <div className="font-medium">{edgeCount}</div>
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
