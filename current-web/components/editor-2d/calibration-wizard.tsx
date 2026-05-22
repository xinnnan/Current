'use client'

import { useState, useCallback } from 'react'
import { Ruler, Check, X, RotateCcw } from 'lucide-react'

export interface CalibrationData {
  pointA: { x: number; y: number } | null
  pointB: { x: number; y: number } | null
  pixelDistance: number
  realDistanceM: number
  pixelsPerMeter: number
}

interface CalibrationWizardProps {
  calibration: CalibrationData | null
  onCalibrationChange: (data: CalibrationData | null) => void
  onCalibrationModeChange: (active: boolean) => void
  isCalibrating: boolean
}

type WizardStep = 'idle' | 'draw_line' | 'input_distance' | 'completed'

export function CalibrationWizard({
  calibration,
  onCalibrationChange,
  onCalibrationModeChange,
  isCalibrating,
}: CalibrationWizardProps) {
  const [step, setStep] = useState<WizardStep>('idle')
  const [realDistance, setRealDistance] = useState('')
  const [tempPointA, setTempPointA] = useState<{ x: number; y: number } | null>(null)
  const [tempPointB, setTempPointB] = useState<{ x: number; y: number } | null>(null)

  const startCalibration = useCallback(() => {
    setStep('draw_line')
    setTempPointA(null)
    setTempPointB(null)
    setRealDistance('')
    onCalibrationModeChange(true)
  }, [onCalibrationModeChange])

  const cancelCalibration = useCallback(() => {
    setStep('idle')
    setTempPointA(null)
    setTempPointB(null)
    onCalibrationModeChange(false)
  }, [onCalibrationModeChange])

  const resetCalibration = useCallback(() => {
    setStep('idle')
    setTempPointA(null)
    setTempPointB(null)
    setRealDistance('')
    onCalibrationChange(null)
    onCalibrationModeChange(false)
  }, [onCalibrationChange, onCalibrationModeChange])

  // Called by MapEditor when calibration points are set
  const setCalibrationPoints = useCallback((a: { x: number; y: number }, b: { x: number; y: number }) => {
    setTempPointA(a)
    setTempPointB(b)
    setStep('input_distance')
  }, [])

  const confirmCalibration = useCallback(() => {
    if (!tempPointA || !tempPointB || !realDistance) return

    const dx = tempPointB.x - tempPointA.x
    const dy = tempPointB.y - tempPointA.y
    const pixelDist = Math.sqrt(dx * dx + dy * dy)
    const realDist = parseFloat(realDistance)

    if (pixelDist <= 0 || realDist <= 0) return

    onCalibrationChange({
      pointA: tempPointA,
      pointB: tempPointB,
      pixelDistance: pixelDist,
      realDistanceM: realDist,
      pixelsPerMeter: pixelDist / realDist,
    })
    setStep('completed')
    onCalibrationModeChange(false)
  }, [tempPointA, tempPointB, realDistance, onCalibrationChange, onCalibrationModeChange])

  const pixelDistance = (() => {
    if (!tempPointA || !tempPointB) return 0
    const dx = tempPointB.x - tempPointA.x
    const dy = tempPointB.y - tempPointA.y
    return Math.sqrt(dx * dx + dy * dy)
  })()

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-panel-border flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Ruler size={14} />
          比例尺标定
        </h3>
        {calibration && step !== 'idle' && (
          <button
            onClick={resetCalibration}
            className="p-1 rounded hover:bg-gray-100 text-muted"
            title="重置"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Current calibration status */}
        {calibration && step === 'idle' && (
          <div className="p-2.5 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium mb-1.5">
              <Check size={12} />
              已标定
            </div>
            <div className="space-y-1 text-xs text-green-600">
              <div>实际距离: {calibration.realDistanceM} m</div>
              <div>像素距离: {Math.round(calibration.pixelDistance)} px</div>
              <div className="font-medium">
                比例: {calibration.pixelsPerMeter.toFixed(2)} px/m
              </div>
            </div>
            <button
              onClick={resetCalibration}
              className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
            >
              重新标定
            </button>
          </div>
        )}

        {/* Step: Draw line */}
        {step === 'draw_line' && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-xs text-blue-700 font-medium mb-1">
              步骤 1/2：在画布上绘制标定线
            </div>
            <div className="text-xs text-blue-600">
              在地图上点击两个已知距离的点（如两个柱子中心、一段墙），系统将计算比例尺。
            </div>
            <div className="mt-2 flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${tempPointA ? 'bg-green-500' : 'bg-blue-400'}`} />
              <span className="text-xs text-blue-600">
                {tempPointA ? '起点已标记' : '请点击起点'}
              </span>
            </div>
          </div>
        )}

        {/* Step: Input distance */}
        {step === 'input_distance' && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md space-y-2">
            <div className="text-xs text-blue-700 font-medium">
              步骤 2/2：输入实际距离
            </div>
            <div className="text-xs text-blue-600">
              标定线像素长度: <strong>{Math.round(pixelDistance)} px</strong>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={realDistance}
                onChange={(e) => setRealDistance(e.target.value)}
                placeholder="输入实际距离"
                className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
              <span className="text-xs text-blue-600">米</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmCalibration}
                disabled={!realDistance || parseFloat(realDistance) <= 0}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={12} />
                确认标定
              </button>
              <button
                onClick={cancelCalibration}
                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-muted rounded text-xs hover:bg-gray-200 transition-colors"
              >
                <X size={12} />
                取消
              </button>
            </div>
          </div>
        )}

        {/* Start calibration button */}
        {!calibration && step === 'idle' && (
          <button
            onClick={startCalibration}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-accent text-white rounded-md text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            <Ruler size={14} />
            开始标定比例尺
          </button>
        )}

        {/* Instructions */}
        {step === 'idle' && !calibration && (
          <div className="text-xs text-muted space-y-1">
            <p>比例尺标定用于将像素坐标转换为真实物理坐标。</p>
            <p>请在地图上找到两个已知距离的参考点。</p>
          </div>
        )}
      </div>
    </div>
  )
}
