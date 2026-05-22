'use client'

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Canvas, Circle, Line, Polygon, Group, Text, Image as FabricImage, Point, Rect } from 'fabric'

export type EditorTool = 'select' | 'pan' | 'line' | 'polygon' | 'node' | 'calibrate' | 'place_asset'

export interface PlacedAsset {
  id: string
  assetId: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  category: string
}

export interface MapEditorProps {
  className?: string
  activeTool?: EditorTool
  pendingAsset?: {
    id: string
    name: string
    dimension_length: number | null
    dimension_width: number | null
    category: string
  } | null
  onToolAction?: (action: string, data: Record<string, unknown>) => void
}

export interface MapEditorRef {
  importFile: () => void
  getCanvas: () => Canvas | null
  getPlacedAssets: () => PlacedAsset[]
}

const ASSET_COLORS: Record<string, string> = {
  agv_lmr: '#3b82f6',
  agv_fmr: '#8b5cf6',
  agv_ctu: '#06b6d4',
  shelf: '#f59e0b',
  conveyor: '#6366f1',
  robot_arm: '#ec4899',
  workstation: '#10b981',
  pallet: '#78716c',
  charger: '#22c55e',
  other: '#64748b',
}

export const MapEditor = forwardRef<MapEditorRef, MapEditorProps>(function MapEditor(
  { className, activeTool: externalTool, pendingAsset, onToolAction },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [activeTool, setActiveTool] = useState<EditorTool>(externalTool ?? 'select')
  const [zoom, setZoom] = useState(1)
  const [hasContent, setHasContent] = useState(false)

  // Pan state
  const isDragging = useRef(false)
  const lastPosX = useRef(0)
  const lastPosY = useRef(0)

  // Calibration drawing state
  const calibPointA = useRef<{ x: number; y: number } | null>(null)

  // Line drawing state
  const lineStartPoint = useRef<{ x: number; y: number } | null>(null)

  // Polygon drawing state
  const polygonPoints = useRef<{ x: number; y: number }[]>([])

  // Placed assets tracking
  const placedAssetsRef = useRef<PlacedAsset[]>([])
  const assetCounterRef = useRef(0)

  // Sync external tool
  useEffect(() => {
    if (externalTool) setActiveTool(externalTool)
  }, [externalTool])

  // Expose ref methods
  useImperativeHandle(ref, () => ({
    importFile: handleFileImport,
    getCanvas: () => fabricRef.current,
    getPlacedAssets: () => [...placedAssetsRef.current],
  }), [])

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      width: canvasRef.current.parentElement?.clientWidth || 800,
      height: canvasRef.current.parentElement?.clientHeight || 600,
      backgroundColor: '#f8fafc',
      selection: true,
    })

    // Zoom with mouse wheel
    canvas.on('mouse:wheel', (opt) => {
      const delta = (opt.e as WheelEvent).deltaY
      let newZoom = (canvas.getZoom() || 1) * (0.999 ** delta)
      if (newZoom > 20) newZoom = 20
      if (newZoom < 0.1) newZoom = 0.1
      const pointer = canvas.getScenePoint(opt.e)
      canvas.zoomToPoint(pointer, newZoom)
      setZoom(newZoom)
      ;(opt.e as WheelEvent).preventDefault()
      ;(opt.e as WheelEvent).stopPropagation()
      canvas.renderAll()
    })

    // Handle canvas clicks for drawing tools
    canvas.on('mouse:down', (opt) => {
      if (activeTool === 'pan') {
        isDragging.current = true
        lastPosX.current = (opt.e as MouseEvent).clientX
        lastPosY.current = (opt.e as MouseEvent).clientY
        return
      }

      const pointer = canvas.getScenePoint(opt.e)

      if (activeTool === 'node') {
        addNode(pointer.x, pointer.y)
        return
      }

      if (activeTool === 'calibrate') {
        if (!calibPointA.current) {
          calibPointA.current = { x: pointer.x, y: pointer.y }
          // Draw calibration marker A
          const markerA = new Circle({
            left: pointer.x - 6,
            top: pointer.y - 6,
            radius: 6,
            fill: 'rgba(234, 179, 8, 0.8)',
            stroke: '#ca8a04',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          })
          canvas.add(markerA)
          canvas.renderAll()
        } else {
          // Draw calibration marker B and line
          const markerB = new Circle({
            left: pointer.x - 6,
            top: pointer.y - 6,
            radius: 6,
            fill: 'rgba(234, 179, 8, 0.8)',
            stroke: '#ca8a04',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          })
          const calibLine = new Line(
            [calibPointA.current.x, calibPointA.current.y, pointer.x, pointer.y],
            {
              stroke: '#ca8a04',
              strokeWidth: 2,
              strokeDashArray: [8, 4],
              selectable: false,
              evented: false,
            }
          )
          canvas.add(calibLine, markerB)
          canvas.renderAll()

          // Notify parent
          onToolAction?.('calibration_points', {
            pointA: calibPointA.current,
            pointB: { x: pointer.x, y: pointer.y },
          })
          calibPointA.current = null
        }
        return
      }

      if (activeTool === 'line') {
        if (!lineStartPoint.current) {
          lineStartPoint.current = { x: pointer.x, y: pointer.y }
          // Draw start marker
          const startMarker = new Circle({
            left: pointer.x - 4,
            top: pointer.y - 4,
            radius: 4,
            fill: '#3b82f6',
            selectable: false,
            evented: false,
          })
          canvas.add(startMarker)
          canvas.renderAll()
        } else {
          addRouteLine(
            lineStartPoint.current.x,
            lineStartPoint.current.y,
            pointer.x,
            pointer.y
          )
          lineStartPoint.current = null
        }
        return
      }

      if (activeTool === 'polygon') {
        polygonPoints.current.push({ x: pointer.x, y: pointer.y })
        // Draw vertex marker
        const vertex = new Circle({
          left: pointer.x - 3,
          top: pointer.y - 3,
          radius: 3,
          fill: '#ef4444',
          selectable: false,
          evented: false,
        })
        canvas.add(vertex)
        canvas.renderAll()

        // If 3+ points and double-click-like (close enough to first point)
        if (polygonPoints.current.length >= 3) {
          const first = polygonPoints.current[0]
          const dist = Math.sqrt(
            (pointer.x - first.x) ** 2 + (pointer.y - first.y) ** 2
          )
          if (dist < 15) {
            addObstacleZone(polygonPoints.current.slice(0, -1))
            polygonPoints.current = []
          }
        }
        return
      }

      // Place asset tool
      if (activeTool === 'place_asset' && pendingAsset) {
        placeAssetOnCanvas(pointer.x, pointer.y, pendingAsset)
        return
      }

      // Select tool - check if object clicked
      if (activeTool === 'select') {
        const target = canvas.findTarget(opt.e as MouseEvent)
        if (target) {
          onToolAction?.('select_element', {
            type: target instanceof Circle ? 'node' :
                  target instanceof Line ? 'edge' :
                  target instanceof Polygon ? 'zone' : 'unknown',
            id: (target as Record<string, unknown>)._id ?? 'unknown',
            properties: {},
          })
        }
      }
    })

    // Pan handling
    canvas.on('mouse:move', (opt) => {
      if (!isDragging.current) return
      const e = opt.e as MouseEvent
      const vpt = canvas.viewportTransform
      if (vpt) {
        vpt[4] += e.clientX - lastPosX.current
        vpt[5] += e.clientY - lastPosY.current
      }
      lastPosX.current = e.clientX
      lastPosY.current = e.clientY
      canvas.requestRenderAll()
    })

    canvas.on('mouse:up', () => {
      isDragging.current = false
    })

    fabricRef.current = canvas

    // Resize handler
    const handleResize = () => {
      const parent = canvasRef.current?.parentElement
      if (parent) {
        canvas.setDimensions({
          width: parent.clientWidth,
          height: parent.clientHeight,
        })
        canvas.renderAll()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tool switching
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.selection = activeTool === 'select'
    canvas.defaultCursor = activeTool === 'pan' ? 'grab' : 'default'
    canvas.hoverCursor = activeTool === 'pan' ? 'grab' : 'move'

    // Reset drawing states
    lineStartPoint.current = null
    calibPointA.current = null
    polygonPoints.current = []

    canvas.renderAll()
  }, [activeTool])

  // Import base image
  const importBaseImage = useCallback(async (file: File) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const url = URL.createObjectURL(file)
    try {
      const img = await FabricImage.fromURL(url)
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      const scaleX = (canvasWidth * 0.8) / (img.width || 1)
      const scaleY = (canvasHeight * 0.8) / (img.height || 1)
      const scale = Math.min(scaleX, scaleY)

      img.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      })
      canvas.add(img)
      canvas.sendObjectToBack(img)
      canvas.renderAll()
      setHasContent(true)
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [])

  // Add route node
  const addNode = useCallback((x: number, y: number, label?: string) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const circle = new Circle({
      left: x - 8,
      top: y - 8,
      radius: 8,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      selectable: true,
    })

    if (label) {
      const text = new Text(label, {
        left: x + 12,
        top: y - 8,
        fontSize: 11,
        fill: '#1e40af',
        selectable: false,
        evented: false,
      })
      const group = new Group([circle, text], {
        left: x - 8,
        top: y - 8,
      })
      canvas.add(group)
    } else {
      canvas.add(circle)
    }
    canvas.renderAll()
    setHasContent(true)
  }, [])

  // Add route line between two points
  const addRouteLine = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const line = new Line([x1, y1, x2, y2], {
      stroke: '#3b82f6',
      strokeWidth: 3,
      selectable: true,
    })
    canvas.add(line)
    canvas.renderAll()
  }, [])

  // Add obstacle polygon
  const addObstacleZone = useCallback((points: { x: number; y: number }[]) => {
    const canvas = fabricRef.current
    if (!canvas || points.length < 3) return

    const polygon = new Polygon(
      points.map(p => ({ x: p.x, y: p.y })),
      {
        fill: 'rgba(239, 68, 68, 0.15)',
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: true,
      }
    )
    canvas.add(polygon)
    canvas.renderAll()
  }, [])

  // Place asset on canvas
  const placeAssetOnCanvas = useCallback((
    x: number,
    y: number,
    asset: NonNullable<MapEditorProps['pendingAsset']>
  ) => {
    const canvas = fabricRef.current
    if (!canvas) return

    assetCounterRef.current++
    const assetInstanceId = `asset_inst_${assetCounterRef.current}`
    const color = ASSET_COLORS[asset.category] || ASSET_COLORS.other

    // Default size: 40x30 pixels if no dimensions, otherwise scale to reasonable canvas size
    const defaultPx = 40
    const w = asset.dimension_length ? asset.dimension_length * 20 : defaultPx
    const h = asset.dimension_width ? asset.dimension_width * 20 : defaultPx * 0.75

    // Create asset rectangle
    const rect = new Rect({
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      fill: color + '30',
      stroke: color,
      strokeWidth: 2,
      rx: 4,
      ry: 4,
      selectable: true,
    })

    // Create label
    const label = new Text(asset.name, {
      left: x,
      top: y + h / 2 + 4,
      fontSize: 10,
      fill: color,
      originX: 'center',
      selectable: false,
      evented: false,
    })

    // Group them
    const group = new Group([rect, label], {
      left: x - w / 2,
      top: y - h / 2,
    })
    // Store asset metadata on the group
    const groupAny = group as unknown as Record<string, unknown>
    groupAny._assetInstanceId = assetInstanceId
    groupAny._assetId = asset.id
    groupAny._assetCategory = asset.category

    canvas.add(group)
    canvas.renderAll()
    setHasContent(true)

    // Track placed asset
    const placed: PlacedAsset = {
      id: assetInstanceId,
      assetId: asset.id,
      name: asset.name,
      x,
      y,
      width: w,
      height: h,
      rotation: 0,
      category: asset.category,
    }
    placedAssetsRef.current.push(placed)

    // Notify parent
    onToolAction?.('asset_placed', { ...placed })
  }, [onToolAction])

  // Zoom controls
  const handleZoomIn = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const newZoom = Math.min((canvas.getZoom() || 1) * 1.2, 20)
    canvas.setZoom(newZoom)
    setZoom(newZoom)
    canvas.renderAll()
  }

  const handleZoomOut = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const newZoom = Math.max((canvas.getZoom() || 1) / 1.2, 0.1)
    canvas.setZoom(newZoom)
    setZoom(newZoom)
    canvas.renderAll()
  }

  const handleZoomReset = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoom(1)
    canvas.renderAll()
  }

  // Handle file import
  const handleFileImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.dxf,.pdf,.jpeg,.jpg,.png,.webp'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) importBaseImage(file)
    }
    input.click()
  }

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <canvas ref={canvasRef} />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-sm hover:bg-gray-50 shadow-sm"
        >
          +
        </button>
        <button
          onClick={handleZoomReset}
          className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-xs text-muted hover:bg-gray-50 shadow-sm"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-sm hover:bg-gray-50 shadow-sm"
        >
          −
        </button>
      </div>

      {/* Empty state overlay */}
      {!hasContent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-center text-muted pointer-events-auto">
            <button
              onClick={handleFileImport}
              className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm hover:bg-gray-50 shadow-sm"
            >
              导入底图文件
            </button>
            <p className="text-xs mt-2 text-gray-400">
              支持 DXF、PDF、JPEG、PNG 格式
            </p>
          </div>
        </div>
      )}
    </div>
  )
})
