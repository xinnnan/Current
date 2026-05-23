'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Ruler, Check, X, RotateCcw } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useUnitStore } from '@/lib/units/store'
import { metersToDisplay, displayToMeters, distanceLabel } from '@/lib/units'

export interface CalibrationData {
  pointA: { x: number; y: number } | null
  pointB: { x: number; y: number } | null
  pixelDistance: number
  realDistanceM: number
  pixelsPerMeter: number
}

type CalibUnit = 'm' | 'cm' | 'ft' | 'in'

const CALIB_UNITS: { value: CalibUnit; label: string }[] = [
  { value: 'm', label: 'm' },
  { value: 'cm', label: 'cm' },
  { value: 'ft', label: 'ft' },
  { value: 'in', label: 'in' },
]

// Convert from a calibration unit to meters
function calibUnitToMeters(value: number, unit: CalibUnit): number {
  switch (unit) {
    case 'cm': return value / 100
    case 'ft': return value / 3.28084
    case 'in': return value / 39.37008
    default: return value // m
  }
}

// Convert from meters to display value in calibration unit
function metersToCalibUnit(valueM: number, unit: CalibUnit): number {
  switch (unit) {
    case 'cm': return valueM * 100
    case 'ft': return valueM * 3.28084
    case 'in': return valueM * 39.37008
    default: return valueM // m
  }
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
  const [calibUnit, setCalibUnit] = useState<CalibUnit>('m')
  const [tempPointA, setTempPointA] = useState<{ x: number; y: number } | null>(null)
  const [tempPointB, setTempPointB] = useState<{ x: number; y: number } | null>(null)
  const { t } = useTranslation()
  const { unitSystem } = useUnitStore()

  // Watch for calibration prop changes from map-editor clicks
  // When two points are set but no distance yet → transition to step 2
  const prevCalibRef = useRef<CalibrationData | null>(null)
  useEffect(() => {
    if (
      calibration &&
      calibration.pointA &&
      calibration.pointB &&
      calibration.realDistanceM === 0 &&
      prevCalibRef.current !== calibration
    ) {
      setTempPointA(calibration.pointA)
      setTempPointB(calibration.pointB)
      setStep('input_distance')
    }
    prevCalibRef.current = calibration
  }, [calibration])

  // Default calibration unit based on user's unit system preference
  const getDefaultUnit = (): CalibUnit => {
    switch (unitSystem) {
      case 'imperial': return 'ft'
      case 'us_customary': return 'in'
      default: return 'm'
    }
  }

  const startCalibration = useCallback(() => {
    setStep('draw_line')
    setTempPointA(null)
    setTempPointB(null)
    setRealDistance('')
    setCalibUnit(getDefaultUnit())
    onCalibrationModeChange(true)
  }, [onCalibrationModeChange]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const displayDist = parseFloat(realDistance)

    if (pixelDist <= 0 || displayDist <= 0) return

    // Convert user input from selected unit → meters
    const realDistM = calibUnitToMeters(displayDist, calibUnit)

    onCalibrationChange({
      pointA: tempPointA,
      pointB: tempPointB,
      pixelDistance: pixelDist,
      realDistanceM: realDistM,
      pixelsPerMeter: pixelDist / realDistM,
    })
    setStep('completed')
    onCalibrationModeChange(false)
  }, [tempPointA, tempPointB, realDistance, calibUnit, onCalibrationChange, onCalibrationModeChange])

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
          {t('calibration.title')}
        </h3>
        {calibration && step !== 'idle' && (
          <button
            onClick={resetCalibration}
            className="p-1 rounded hover:bg-gray-100 text-muted"
            title={t('calibration.reset')}
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
              {t('calibration.calibrated')}
            </div>
            <div className="space-y-1 text-xs text-green-600">
              <div>{t('calibration.realDistance')}: {metersToDisplay(calibration.realDistanceM, unitSystem).toFixed(2)} {distanceLabel(unitSystem)}</div>
              <div>{t('calibration.pixelDistance')}: {Math.round(calibration.pixelDistance)} px</div>
              <div className="font-medium">
                {t('calibration.scale')}: {calibration.pixelsPerMeter.toFixed(2)} px/m
              </div>
            </div>
            <button
              onClick={resetCalibration}
              className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
            >
              {t('calibration.recalibrate')}
            </button>
          </div>
        )}

        {/* Step: Draw line */}
        {step === 'draw_line' && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-xs text-blue-700 font-medium mb-1">
              {t('calibration.step1Title')}
            </div>
            <div className="text-xs text-blue-600">
              {t('calibration.step1Desc')}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${tempPointA ? 'bg-green-500' : 'bg-blue-400'}`} />
              <span className="text-xs text-blue-600">
                {tempPointA ? t('calibration.startPointMarked') : t('calibration.clickStartPoint')}
              </span>
            </div>
          </div>
        )}

        {/* Step: Input distance */}
        {step === 'input_distance' && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md space-y-2">
            <div className="text-xs text-blue-700 font-medium">
              {t('calibration.step2Title')}
            </div>
            <div className="text-xs text-blue-600">
              {t('calibration.pixelLength')}: <strong>{Math.round(pixelDistance)} px</strong>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={realDistance}
                onChange={(e) => setRealDistance(e.target.value)}
                placeholder={t('calibration.inputRealDistance')}
                className="flex-1 px-2 py-1.5 text-xs border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
              <select
                value={calibUnit}
                onChange={(e) => setCalibUnit(e.target.value as CalibUnit)}
                className="px-2 py-1.5 text-xs border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label={t('calibration.unit')}
              >
                {CALIB_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmCalibration}
                disabled={!realDistance || parseFloat(realDistance) <= 0}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={12} />
                {t('calibration.confirm')}
              </button>
              <button
                onClick={cancelCalibration}
                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-muted rounded text-xs hover:bg-gray-200 transition-colors"
              >
                <X size={12} />
                {t('calibration.cancel')}
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
            {t('calibration.startCalibration')}
          </button>
        )}

        {/* Instructions */}
        {step === 'idle' && !calibration && (
          <div className="text-xs text-muted space-y-1">
            <p>{t('calibration.instruction1')}</p>
            <p>{t('calibration.instruction2')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
