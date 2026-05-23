'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'

export interface HeatmapEdge {
  edgeId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  congestion: number  // 0-1
}

interface HeatmapOverlayProps {
  edges: HeatmapEdge[]
  width: number
  height: number
  opacity?: number
  showLabels?: boolean
}

// Color interpolation from green (low) → yellow (mid) → red (high)
function congestionColor(value: number): string {
  const v = Math.max(0, Math.min(1, value))
  if (v < 0.5) {
    const t = v * 2
    const r = Math.round(255 * t)
    const g = 255
    return `rgba(${r}, ${g}, 0, 0.7)`
  } else {
    const t = (v - 0.5) * 2
    const r = 255
    const g = Math.round(255 * (1 - t))
    return `rgba(${r}, ${g}, 0, 0.7)`
  }
}

export function HeatmapOverlay({
  edges,
  width,
  height,
  opacity = 0.6,
  showLabels = true,
}: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)
    ctx.globalAlpha = opacity

    for (const edge of edges) {
      const color = congestionColor(edge.congestion)

      ctx.beginPath()
      ctx.moveTo(edge.fromX, edge.fromY)
      ctx.lineTo(edge.toX, edge.toY)
      ctx.strokeStyle = color
      ctx.lineWidth = 4 + edge.congestion * 6
      ctx.lineCap = 'round'
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(edge.fromX, edge.fromY)
      ctx.lineTo(edge.toX, edge.toY)
      ctx.strokeStyle = color
      ctx.lineWidth = 12 + edge.congestion * 12
      ctx.globalAlpha = opacity * 0.2
      ctx.stroke()
      ctx.globalAlpha = opacity

      if (showLabels && edge.congestion > 0.1) {
        const midX = (edge.fromX + edge.toX) / 2
        const midY = (edge.fromY + edge.toY) / 2
        const label = `${Math.round(edge.congestion * 100)}%`

        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const metrics = ctx.measureText(label)
        const padding = 3
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
        ctx.fillRect(
          midX - metrics.width / 2 - padding,
          midY - 6 - padding,
          metrics.width + padding * 2,
          12 + padding * 2
        )

        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, midX, midY)
      }
    }
  }, [edges, width, height, opacity, showLabels])

  useEffect(() => {
    drawHeatmap()
  }, [drawHeatmap])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
    />
  )
}

// Legend component for the heatmap
export function HeatmapLegend() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>{t('heatmap.smooth')}</span>
      <div className="flex h-2.5 w-32 rounded overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => {
          const v = i / 19
          return (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: congestionColor(v) }}
            />
          )
        })}
      </div>
      <span>{t('heatmap.congested')}</span>
    </div>
  )
}
