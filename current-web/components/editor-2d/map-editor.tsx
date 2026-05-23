'use client'

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Canvas, Circle, Line, Polygon, Group, Text, Image as FabricImage, Point, Rect } from 'fabric'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

// Configure PDF.js worker (client-side only)
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`
}

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
  loadImageFromUrl: (url: string) => void
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
  const [zoom, setZoom] = useState(1)
  const [hasContent, setHasContent] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // ── Refs for values accessed inside stale closures ──
  const activeToolRef = useRef<EditorTool>(externalTool ?? 'select')
  const pendingAssetRef = useRef(pendingAsset)
  const onToolActionRef = useRef(onToolAction)

  // Keep refs in sync with props/state
  useEffect(() => { activeToolRef.current = externalTool ?? 'select' }, [externalTool])
  useEffect(() => { pendingAssetRef.current = pendingAsset }, [pendingAsset])
  useEffect(() => { onToolActionRef.current = onToolAction }, [onToolAction])

  // Pan state
  const isDragging = useRef(false)
  const lastPosX = useRef(0)
  const lastPosY = useRef(0)

  // Space key held → force pan mode
  const spaceHeld = useRef(false)

  // Calibration drawing state
  const calibPointA = useRef<{ x: number; y: number } | null>(null)
  const calibPreviewLine = useRef<Line | null>(null)
  const calibCursorCircle = useRef<Circle | null>(null)

  // Line drawing state
  const lineStartPoint = useRef<{ x: number; y: number } | null>(null)

  // Polygon drawing state
  const polygonPoints = useRef<{ x: number; y: number }[]>([])

  // Placed assets tracking
  const placedAssetsRef = useRef<PlacedAsset[]>([])
  const assetCounterRef = useRef(0)

  // Expose ref methods
  useImperativeHandle(ref, () => ({
    importFile: handleFileImport,
    getCanvas: () => fabricRef.current,
    getPlacedAssets: () => [...placedAssetsRef.current],
    loadImageFromUrl: (url: string) => {
      const canvas = fabricRef.current
      if (!canvas) return
      FabricImage.fromURL(url).then((img) => {
        const viewportWidth = canvas.getWidth()
        const viewportHeight = canvas.getHeight()
        const scaleX = viewportWidth / (img.width || 1)
        const scaleY = viewportHeight / (img.height || 1)
        const scale = Math.min(scaleX, scaleY, 1)
        img.set({ scaleX: scale, scaleY: scale })
        img.set({ left: 0, top: 0 })
        canvas.add(img)
        canvas.sendObjectToBack(img)
        canvas.renderAll()
      }).catch(() => { /* ignore failed image load */ })
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  // ── Helper: get effective tool (Space overrides) ──
  const getEffectiveTool = useCallback((): EditorTool => {
    if (spaceHeld.current) return 'pan'
    return activeToolRef.current
  }, [])

  // ── Initialize Fabric.js canvas ──
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      width: canvasRef.current.parentElement?.clientWidth || 800,
      height: canvasRef.current.parentElement?.clientHeight || 600,
      backgroundColor: '#f8fafc',
      selection: true,
    })

    // ── Zoom with mouse wheel ──
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

    // ── Mouse down: handle all tools ──
    canvas.on('mouse:down', (opt) => {
      const tool = getEffectiveTool()

      // Pan mode (explicit or Space-held)
      if (tool === 'pan') {
        isDragging.current = true
        canvas.defaultCursor = 'grabbing'
        lastPosX.current = (opt.e as MouseEvent).clientX
        lastPosY.current = (opt.e as MouseEvent).clientY
        return
      }

      const pointer = canvas.getScenePoint(opt.e)

      // Node tool
      if (tool === 'node') {
        addNode(pointer.x, pointer.y)
        return
      }

      // Calibrate tool
      if (tool === 'calibrate') {
        if (!calibPointA.current) {
          calibPointA.current = { x: pointer.x, y: pointer.y }
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
          // Remove preview line before adding final line
          if (calibPreviewLine.current) {
            canvas.remove(calibPreviewLine.current)
            calibPreviewLine.current = null
          }

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

          onToolActionRef.current?.('calibration_points', {
            pointA: calibPointA.current,
            pointB: { x: pointer.x, y: pointer.y },
          })
          calibPointA.current = null
        }
        return
      }

      // Line tool
      if (tool === 'line') {
        if (!lineStartPoint.current) {
          lineStartPoint.current = { x: pointer.x, y: pointer.y }
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

      // Polygon tool
      if (tool === 'polygon') {
        polygonPoints.current.push({ x: pointer.x, y: pointer.y })
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
      if (tool === 'place_asset' && pendingAssetRef.current) {
        placeAssetOnCanvas(pointer.x, pointer.y, pendingAssetRef.current)
        return
      }

      // Select tool — check if object clicked
      if (tool === 'select') {
        const target = canvas.findTarget(opt.e as MouseEvent)
        if (target) {
          onToolActionRef.current?.('select_element', {
            type: target instanceof Circle ? 'node' :
                  target instanceof Line ? 'edge' :
                  target instanceof Polygon ? 'zone' : 'unknown',
            id: (target as Record<string, unknown>)._id ?? 'unknown',
            properties: {},
          })
        }
      }
    })

    // ── Mouse move: pan dragging + calibration preview ──
    canvas.on('mouse:move', (opt) => {
      const tool = getEffectiveTool()
      const pointer = canvas.getScenePoint(opt.e)

      // Pan dragging
      if (isDragging.current) {
        const e = opt.e as MouseEvent
        const vpt = canvas.viewportTransform
        if (vpt) {
          vpt[4] += e.clientX - lastPosX.current
          vpt[5] += e.clientY - lastPosY.current
        }
        lastPosX.current = e.clientX
        lastPosY.current = e.clientY
        canvas.requestRenderAll()
        return
      }

      // Calibration: precision circle cursor
      if (tool === 'calibrate') {
        if (calibCursorCircle.current) {
          calibCursorCircle.current.set({ left: pointer.x - 10, top: pointer.y - 10 })
        } else {
          calibCursorCircle.current = new Circle({
            left: pointer.x - 10,
            top: pointer.y - 10,
            radius: 10,
            fill: 'transparent',
            stroke: 'rgba(234, 179, 8, 0.6)',
            strokeWidth: 1.5,
            strokeDashArray: [4, 3],
            selectable: false,
            evented: false,
          })
          canvas.add(calibCursorCircle.current)
        }

        // Calibration: preview line from start point to cursor
        if (calibPointA.current) {
          if (calibPreviewLine.current) {
            calibPreviewLine.current.set({ x1: calibPointA.current.x, y1: calibPointA.current.y, x2: pointer.x, y2: pointer.y })
          } else {
            calibPreviewLine.current = new Line(
              [calibPointA.current.x, calibPointA.current.y, pointer.x, pointer.y],
              {
                stroke: '#ca8a04',
                strokeWidth: 2,
                strokeDashArray: [8, 4],
                selectable: false,
                evented: false,
              }
            )
            canvas.add(calibPreviewLine.current)
          }
        }
        canvas.requestRenderAll()
      } else {
        // Remove calibration cursor objects when not in calibrate mode
        if (calibCursorCircle.current) {
          canvas.remove(calibCursorCircle.current)
          calibCursorCircle.current = null
        }
        if (calibPreviewLine.current) {
          canvas.remove(calibPreviewLine.current)
          calibPreviewLine.current = null
        }
      }
    })

    // ── Mouse up: stop panning ──
    canvas.on('mouse:up', () => {
      if (isDragging.current) {
        isDragging.current = false
        // Restore cursor based on current tool
        const tool = getEffectiveTool()
        canvas.defaultCursor = tool === 'pan' ? 'grab' : 'default'
      }
    })

    fabricRef.current = canvas

    // ── Resize handler ──
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

  // ── Space key → temporary pan override ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        spaceHeld.current = true
        const canvas = fabricRef.current
        if (canvas) canvas.defaultCursor = 'grab'
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false
        isDragging.current = false
        const canvas = fabricRef.current
        if (canvas) canvas.defaultCursor = activeToolRef.current === 'pan' ? 'grab' : 'default'
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // ── Tool switching: update cursor + reset drawing states ──
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const tool = externalTool ?? 'select'
    activeToolRef.current = tool
    canvas.selection = tool === 'select'

    // Set cursor based on tool
    if (tool === 'pan') {
      canvas.defaultCursor = 'grab'
      canvas.hoverCursor = 'grab'
    } else if (tool === 'calibrate' || tool === 'node' || tool === 'line' || tool === 'polygon' || tool === 'place_asset') {
      canvas.defaultCursor = 'crosshair'
      canvas.hoverCursor = 'crosshair'
    } else {
      canvas.defaultCursor = 'default'
      canvas.hoverCursor = 'move'
    }

    // Reset drawing states
    lineStartPoint.current = null
    calibPointA.current = null
    polygonPoints.current = []

    // Clean up calibration cursor objects
    if (calibCursorCircle.current) {
      canvas.remove(calibCursorCircle.current)
      calibCursorCircle.current = null
    }
    if (calibPreviewLine.current) {
      canvas.remove(calibPreviewLine.current)
      calibPreviewLine.current = null
    }

    canvas.renderAll()
  }, [externalTool])

  // ── Render PDF first page to a data URL (PNG) ──
  const renderPdfToDataUrl = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    const page = await pdf.getPage(1)

    // Render at 2x scale for clarity
    const viewport = page.getViewport({ scale: 2 })
    const offscreen = document.createElement('canvas')
    offscreen.width = viewport.width
    offscreen.height = viewport.height
    const ctx = offscreen.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport }).promise
    return offscreen.toDataURL('image/png')
  }

  // ── Check if file is a PDF (by MIME type or extension) ──
  const isPdfFile = (file: File): boolean => {
    if (file.type === 'application/pdf') return true
    // Fallback: check file extension
    return file.name.toLowerCase().endsWith('.pdf')
  }

  // ── Import base image (supports JPEG/PNG/WebP + PDF) ──
  const importBaseImage = useCallback(async (file: File) => {
    const canvas = fabricRef.current
    if (!canvas) return

    setImportError(null)

    try {
      let imageUrl: string

      if (isPdfFile(file)) {
        // Render PDF first page to image
        imageUrl = await renderPdfToDataUrl(file)
      } else {
        // Direct image file — use object URL
        imageUrl = URL.createObjectURL(file)
      }

      const img = await FabricImage.fromURL(imageUrl)
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

      // Clean up object URL if we created one
      if (!isPdfFile(file)) {
        URL.revokeObjectURL(imageUrl)
      }
    } catch (err) {
      console.error('Failed to import file:', err)
      setImportError(err instanceof Error ? err.message : 'Import failed')
      // Auto-dismiss error after 5s
      setTimeout(() => setImportError(null), 5000)
    }
  }, [])

  // ── Add route node ──
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

  // ── Add route line between two points ──
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

  // ── Add obstacle polygon ──
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

  // ── Place asset on canvas ──
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

    const defaultPx = 40
    const w = asset.dimension_length ? asset.dimension_length * 20 : defaultPx
    const h = asset.dimension_width ? asset.dimension_width * 20 : defaultPx * 0.75

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

    const label = new Text(asset.name, {
      left: x,
      top: y + h / 2 + 4,
      fontSize: 10,
      fill: color,
      originX: 'center',
      selectable: false,
      evented: false,
    })

    const group = new Group([rect, label], {
      left: x - w / 2,
      top: y - h / 2,
    })
    const groupAny = group as unknown as Record<string, unknown>
    groupAny._assetInstanceId = assetInstanceId
    groupAny._assetId = asset.id
    groupAny._assetCategory = asset.category

    canvas.add(group)
    canvas.renderAll()
    setHasContent(true)

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

    onToolActionRef.current?.('asset_placed', { ...placed })
  }, [])

  // ── Zoom controls ──
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

  // ── Handle file import ──
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

      {/* Import error toast */}
      {importError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shadow-md max-w-sm">
          Import failed: {importError}
        </div>
      )}

      {/* Empty state overlay */}
      {!hasContent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-center text-muted pointer-events-auto">
            <button
              onClick={handleFileImport}
              className="px-4 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-hover transition-colors"
            >
              Import Base Map
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
