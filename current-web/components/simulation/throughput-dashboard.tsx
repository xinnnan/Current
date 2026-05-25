'use client'

import { useTranslation } from '@/lib/i18n'
import type { ThroughputResult } from '@/lib/simulation/throughput-calculator'
import type { LogisticsMetrics } from '@/lib/simulation/logistics-engine'
import {
  Activity, Truck, Clock, AlertTriangle, PackageCheck,
} from 'lucide-react'

// ============================================
// Props
// ============================================

export interface ThroughputDashboardProps {
  result: ThroughputResult | null
  logisticsMetrics: LogisticsMetrics | null
}

// ============================================
// Helper: color coding
// ============================================

function throughputColor(value: number, target: number): string {
  const ratio = target > 0 ? value / target : 0
  if (ratio >= 0.8) return 'text-emerald-600'
  if (ratio >= 0.5) return 'text-amber-600'
  return 'text-red-500'
}

function throughputBg(value: number, target: number): string {
  const ratio = target > 0 ? value / target : 0
  if (ratio >= 0.8) return 'bg-emerald-500'
  if (ratio >= 0.5) return 'bg-amber-500'
  return 'bg-red-500'
}

function utilizationColor(util: number): string {
  if (util > 0.7) return 'bg-emerald-500'
  if (util > 0.4) return 'bg-amber-400'
  return 'bg-gray-300'
}

function utilizationTextColor(util: number): string {
  if (util > 0.7) return 'text-emerald-600'
  if (util > 0.4) return 'text-amber-600'
  return 'text-gray-400'
}

// ============================================
// Sub-components
// ============================================

/** Big number card for system throughput */
function SystemThroughputCard({ value, target }: { value: number; target: number }) {
  const { t } = useTranslation()
  const color = throughputColor(value, target)
  const bgColor = throughputBg(value, target)

  return (
    <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 rounded-[var(--radius-md)]">
            <PackageCheck size={12} className="text-emerald-500" />
          </div>
          <span className="text-[11px] text-muted font-medium">{t('sim.throughputDashboard')}</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${bgColor}`} title={value >= target * 0.8 ? '≥80%' : value >= target * 0.5 ? '50-80%' : '<50%'} />
      </div>
      <div className="flex items-end gap-2">
        <div className={`text-2xl font-bold tracking-tight ${color}`}>
          {value.toFixed(1)}
        </div>
        <span className="text-[10px] text-muted mb-0.5">{t('sim.itemsPerHour')}</span>
      </div>
      {/* Mini progress bar toward target */}
      {target > 0 && (
        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${bgColor}`}
            style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** CSS bar chart for station throughput */
function StationBarChart({
  stations,
}: {
  stations: { nodeId: string; throughput: number; utilization: number }[]
}) {
  const { t } = useTranslation()

  if (stations.length === 0) return null

  const maxThroughput = Math.max(...stations.map(s => s.throughput), 1)

  return (
    <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
      <div className="text-[11px] text-muted font-medium mb-2.5">{t('sim.stationThroughput')}</div>
      <div className="space-y-2">
        {stations.map(station => {
          const pct = (station.throughput / maxThroughput) * 100
          return (
            <div key={station.nodeId} className="flex items-center gap-2">
              <span className="text-[10px] font-medium w-16 truncate" title={station.nodeId}>
                {station.nodeId}
              </span>
              <div className="flex-1 h-4 bg-gray-50 rounded-sm overflow-hidden relative">
                <div
                  className={`h-full rounded-sm transition-all duration-500 ${
                    station.utilization > 0.7
                      ? 'bg-emerald-400'
                      : station.utilization > 0.4
                        ? 'bg-amber-400'
                        : 'bg-blue-300'
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-medium text-muted">
                  {station.throughput.toFixed(0)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** CSS ring chart for AGV utilization */
function AGVUtilizationRing({ utilization }: { utilization: number }) {
  const { t } = useTranslation()
  const pct = Math.round(utilization * 100)
  const color = utilization > 0.7 ? '#10b981' : utilization > 0.4 ? '#f59e0b' : '#9ca3af'
  const bgRing = '#f3f4f6'

  return (
    <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
      <div className="text-[11px] text-muted font-medium mb-2.5">{t('sim.agvUtilizationChart')}</div>
      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke={bgRing}
              strokeWidth="3"
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${pct * 0.974} 97.4`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${utilizationTextColor(utilization)}`}>{pct}%</span>
          </div>
        </div>
        {/* Legend */}
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{'>'}70% {t('sim.good')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">40-70% {t('sim.average')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-muted-foreground">{'<'}40%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Cycle time distribution bar chart */
function CycleTimeDistribution({
  minTime,
  avgTime,
  maxTime,
}: {
  minTime: number
  avgTime: number
  maxTime: number
}) {
  const { t } = useTranslation()

  if (maxTime <= 0) return null

  return (
    <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
      <div className="text-[11px] text-muted font-medium mb-2.5">{t('sim.cycleTimeDistribution')}</div>
      <div className="space-y-2">
        {/* Min */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8">{t('sim.min')}</span>
          <div className="flex-1 h-3 bg-gray-50 rounded-sm overflow-hidden">
            <div
              className="h-full bg-blue-300 rounded-sm transition-all duration-500"
              style={{ width: `${(minTime / maxTime) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-medium w-12 text-right">{minTime.toFixed(1)}s</span>
        </div>
        {/* Avg */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8">{t('sim.avg')}</span>
          <div className="flex-1 h-3 bg-gray-50 rounded-sm overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-sm transition-all duration-500"
              style={{ width: `${(avgTime / maxTime) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-medium w-12 text-right">{avgTime.toFixed(1)}s</span>
        </div>
        {/* Max */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8">{t('sim.max')}</span>
          <div className="flex-1 h-3 bg-gray-50 rounded-sm overflow-hidden">
            <div
              className="h-full bg-blue-700 rounded-sm transition-all duration-500"
              style={{ width: '100%' }}
            />
          </div>
          <span className="text-[10px] font-medium w-12 text-right">{maxTime.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  )
}

/** Station utilization table */
function StationUtilizationTable({
  stations,
}: {
  stations: { nodeId: string; utilization: number; queueLength: number; throughput: number }[]
}) {
  const { t } = useTranslation()

  if (stations.length === 0) return null

  return (
    <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
      <div className="text-[11px] text-muted font-medium mb-2.5">{t('sim.stationUtilization')}</div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-muted-foreground border-b border-panel-border">
            <th className="text-left py-1 font-medium">{t('sim.stationCol')}</th>
            <th className="text-right py-1 font-medium">{t('sim.utilizationCol')}</th>
            <th className="text-right py-1 font-medium">{t('sim.queueLength')}</th>
            <th className="text-right py-1 font-medium">{t('sim.throughputCol')}</th>
          </tr>
        </thead>
        <tbody>
          {stations.map(s => (
            <tr key={s.nodeId} className="border-b border-gray-50 last:border-0">
              <td className="py-1 font-medium truncate max-w-[80px]" title={s.nodeId}>{s.nodeId}</td>
              <td className="py-1 text-right">
                <div className="flex items-center justify-end gap-1">
                  <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${utilizationColor(s.utilization)}`}
                      style={{ width: `${s.utilization * 100}%` }}
                    />
                  </div>
                  <span className={`w-8 text-right ${utilizationTextColor(s.utilization)}`}>
                    {(s.utilization * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className="py-1 text-right text-muted-foreground">{s.queueLength}</td>
              <td className="py-1 text-right">{s.throughput.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function ThroughputDashboard({ result, logisticsMetrics }: ThroughputDashboardProps) {
  const { t } = useTranslation()

  // Determine which data source to use
  const hasData = result || logisticsMetrics
  if (!hasData) return null

  // Merge data from both sources
  const systemThroughput = logisticsMetrics?.systemThroughput ?? result?.systemThroughput ?? 0
  const agvUtilization = logisticsMetrics?.agvUtilization ?? result?.agvUtilization ?? 0
  const targetThroughput = 100 // default target for color coding

  // Build station data
  const stationData: {
    nodeId: string
    utilization: number
    queueLength: number
    throughput: number
  }[] = []

  if (logisticsMetrics) {
    for (const s of logisticsMetrics.stationDetails) {
      stationData.push({
        nodeId: s.nodeId,
        utilization: s.utilization,
        queueLength: s.currentQueueLength,
        throughput: s.totalProcessed > 0
          ? (s.totalProcessed / logisticsMetrics.totalSimTime) * 3600
          : 0,
      })
    }
  } else if (result) {
    for (const [nodeId, util] of result.stationUtilization) {
      stationData.push({
        nodeId,
        utilization: util,
        queueLength: 0,
        throughput: 0,
      })
    }
  }

  // Cycle time data
  const avgCycleTime = logisticsMetrics?.avgCycleTimeSeconds ?? result?.avgTaskCycleTime ?? 0
  const minCycleTime = result?.perChainResult.reduce(
    (min, c) => Math.min(min, c.cycleTimeSeconds), Infinity
  ) ?? avgCycleTime * 0.7
  const maxCycleTime = result?.perChainResult.reduce(
    (max, c) => Math.max(max, c.cycleTimeSeconds), 0
  ) ?? avgCycleTime * 1.3

  return (
    <div className="space-y-2.5">
      {/* 1. System throughput big number */}
      <SystemThroughputCard value={systemThroughput} target={targetThroughput} />

      {/* 2. Station throughput bar chart */}
      {stationData.length > 0 && (
        <StationBarChart stations={stationData} />
      )}

      {/* 3. AGV utilization ring chart */}
      <AGVUtilizationRing utilization={agvUtilization} />

      {/* 4. Cycle time distribution */}
      <CycleTimeDistribution
        minTime={minCycleTime === Infinity ? 0 : minCycleTime}
        avgTime={avgCycleTime}
        maxTime={maxCycleTime}
      />

      {/* 5. Station utilization table */}
      {stationData.length > 0 && (
        <StationUtilizationTable stations={stationData} />
      )}
    </div>
  )
}
