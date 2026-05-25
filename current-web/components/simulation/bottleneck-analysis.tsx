'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { calculateThroughput, type ThroughputInput, type ThroughputResult } from '@/lib/simulation/throughput-calculator'
import {
  AlertTriangle, Lightbulb, ChevronDown, ChevronRight, Sliders, CheckCircle2,
} from 'lucide-react'

// ============================================
// Props
// ============================================

export interface BottleneckAnalysisProps {
  result: ThroughputResult | null
  input: ThroughputInput | null
  onRecalculate: (newAgvCount: number) => void
}

// ============================================
// Sub-components
// ============================================

/** Bottleneck station highlight card */
function BottleneckHighlight({ result }: { result: ThroughputResult }) {
  const { t } = useTranslation()
  const bottleneck = result.bottleneckStation

  if (!bottleneck) {
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[var(--radius-lg)]">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">{t('sim.noBottleneck')}</span>
        </div>
      </div>
    )
  }

  // Determine severity
  const isSevere = result.systemThroughput < 50
  const severityColor = isSevere ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
  const severityText = isSevere ? 'text-red-700' : 'text-amber-700'
  const severityIcon = isSevere ? 'text-red-500' : 'text-amber-500'

  return (
    <div className={`p-3 ${severityColor} rounded-[var(--radius-lg)]`}>
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={14} className={severityIcon} />
        <span className={`text-xs font-medium ${severityText}`}>{t('sim.bottleneckDetected')}</span>
      </div>
      <div className="ml-5.5 space-y-1">
        <div className="text-[11px] font-semibold">{bottleneck.name || bottleneck.nodeId}</div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className={severityText}>
            {bottleneck.throughput.toFixed(0)} {t('sim.itemsPerHour')}
          </span>
          <span className="text-muted-foreground">
            {t('sim.utilizationCol')}: {((result.stationUtilization.get(bottleneck.nodeId) ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}

/** Optimization recommendations list */
function RecommendationsList({ recommendations }: { recommendations: string[] }) {
  const { t } = useTranslation()

  if (recommendations.length === 0) return null

  return (
    <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
      <div className="text-[11px] text-muted font-medium mb-2 flex items-center gap-1.5">
        <Lightbulb size={11} className="text-amber-500" />
        {t('sim.recommendations')}
      </div>
      <div className="space-y-1.5">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <span className="text-amber-500 mt-0.5 shrink-0">•</span>
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Sensitivity analysis — AMR count slider and throughput table */
function SensitivityAnalysis({
  input,
  currentAgvCount,
  onRecalculate,
}: {
  input: ThroughputInput
  currentAgvCount: number
  onRecalculate: (newAgvCount: number) => void
}) {
  const { t } = useTranslation()
  const [rangeCount, setRangeCount] = useState(5) // ±5 default

  // Compute sensitivity table
  const sensitivityData = useMemo(() => {
    const results: { agvCount: number; throughput: number }[] = []
    const minAgv = Math.max(1, currentAgvCount - rangeCount)
    const maxAgv = currentAgvCount + rangeCount

    for (let n = minAgv; n <= maxAgv; n++) {
      const modifiedInput: ThroughputInput = {
        ...input,
        agvCount: n,
      }
      const result = calculateThroughput(modifiedInput)
      results.push({ agvCount: n, throughput: result.systemThroughput })
    }

    return results
  }, [input, currentAgvCount, rangeCount])

  const maxThroughput = Math.max(...sensitivityData.map(d => d.throughput), 1)

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRangeCount(Number(e.target.value))
  }, [])

  return (
    <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
      <div className="text-[11px] text-muted font-medium mb-2.5 flex items-center gap-1.5">
        <Sliders size={11} className="text-blue-500" />
        {t('sim.sensitivityAnalysis')}
      </div>

      {/* Range slider */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">{t('sim.agvCountRange')}: ±{rangeCount}</span>
        <input
          type="range"
          min={1}
          max={10}
          value={rangeCount}
          onChange={handleSliderChange}
          className="flex-1 accent-accent"
          aria-label={t('sim.agvCountRange')}
        />
      </div>

      {/* Data table with mini bars */}
      <div className="space-y-1">
        {sensitivityData.map(d => {
          const isCurrent = d.agvCount === currentAgvCount
          const barPct = (d.throughput / maxThroughput) * 100
          return (
            <button
              key={d.agvCount}
              onClick={() => onRecalculate(d.agvCount)}
              className={`w-full flex items-center gap-2 text-[10px] px-2 py-1 rounded-sm transition-colors ${
                isCurrent
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'hover:bg-gray-50 text-muted-foreground'
              }`}
              aria-label={`${d.agvCount} AGV → ${d.throughput.toFixed(1)} ${t('sim.itemsPerHour')}`}
            >
              <span className={`w-6 text-right tabular-nums ${isCurrent ? 'font-bold' : ''}`}>
                {d.agvCount}
              </span>
              <div className="flex-1 h-2 bg-gray-50 rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm transition-all duration-300 ${
                    isCurrent ? 'bg-accent' : 'bg-blue-300'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className="w-14 text-right tabular-nums">
                {d.throughput.toFixed(1)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-2 text-[9px] text-muted-foreground text-center">
        {t('sim.clickToRecalculate')}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function BottleneckAnalysis({ result, input, onRecalculate }: BottleneckAnalysisProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)

  if (!result) return null

  return (
    <div className="border border-panel-border rounded-[var(--radius-lg)] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-panel-bg hover:bg-gray-50 transition-colors text-left"
        aria-expanded={expanded}
        aria-label={t('sim.bottleneckAnalysis')}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-[11px] font-medium">{t('sim.bottleneckAnalysis')}</span>
        {result.bottleneckStation && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle size={9} />
            {result.bottleneckStation.nodeId}
          </span>
        )}
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div className="p-3 space-y-2.5 border-t border-panel-border">
          {/* 1. Bottleneck highlight */}
          <BottleneckHighlight result={result} />

          {/* 2. Optimization recommendations */}
          {result.recommendations.length > 0 && (
            <RecommendationsList recommendations={result.recommendations} />
          )}

          {/* 3. Sensitivity analysis */}
          {input && (
            <SensitivityAnalysis
              input={input}
              currentAgvCount={input.agvCount}
              onRecalculate={onRecalculate}
            />
          )}
        </div>
      )}
    </div>
  )
}
