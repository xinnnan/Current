'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Play, Pause, FastForward, BarChart3, Settings,
  RotateCcw, Truck, Clock, Activity, AlertTriangle, Zap,
  TrendingUp, TrendingDown, Minus, CircleDot, Link2, PackageCheck,
} from 'lucide-react'
import { SimulationEngine, type SimConfig, type SimMetrics, type AGVAnimationFrame } from '@/lib/simulation/engine'
import { RCSScheduler, DEFAULT_TASK_TEMPLATES, type TaskTemplate, type ConflictResolution } from '@/lib/simulation/rcs-scheduler'
import { calculateThroughput, type TaskChain, type ThroughputResult, type ThroughputInput } from '@/lib/simulation/throughput-calculator'
import { LogisticsEngine, type LogisticsEngineConfig, type LogisticsMetrics } from '@/lib/simulation/logistics-engine'
import { HeatmapOverlay, HeatmapLegend, type HeatmapEdge } from '@/components/simulation/heatmap-overlay'
import { TaskTemplatePanel } from '@/components/simulation/task-template-panel'
import { TaskChainPanel, type LogisticsNodeOption } from '@/components/simulation/task-chain-panel'
import { ThroughputDashboard } from '@/components/simulation/throughput-dashboard'
import { BottleneckAnalysis } from '@/components/simulation/bottleneck-analysis'
import { SceneViewer } from '@/components/scene-3d/scene-viewer'
import { GroundPlane } from '@/components/scene-3d/ground-plane'
import { TubeNetwork } from '@/components/scene-3d/tube-network'
import { ExtrudedWalls } from '@/components/scene-3d/extruded-walls'
import { AGVAnimator } from '@/components/scene-3d/agv-animator'
import { ViewModeSwitcher } from '@/components/shared/view-mode-switcher'
import { useViewStore } from '@/lib/stores/view-store'
import { useTranslation } from '@/lib/i18n'
import { useProjectStore } from '@/lib/project-store'

type SimStatus = 'idle' | 'running' | 'paused' | 'completed'

// Demo route graph — coordinates in METERS (physical space)
// Represents a 30m × 30m warehouse section
const DEMO_NODES = [
  { id: 'A', x: 0, y: 0 },
  { id: 'B', x: 30, y: 0 },
  { id: 'C', x: 30, y: 30 },
  { id: 'D', x: 0, y: 30 },
  { id: 'E', x: 15, y: 15 },
  { id: 'F', x: 45, y: 15 },
  { id: 'G', x: 15, y: -10 },
  { id: 'H', x: 45, y: 35 },
]

const DEMO_EDGES = [
  { id: 'AB', from: 'A', to: 'B', length: 30, speedLimit: 1.5, isMutexZone: false },
  { id: 'BC', from: 'B', to: 'C', length: 30, speedLimit: 1.5, isMutexZone: false },
  { id: 'CD', from: 'C', to: 'D', length: 30, speedLimit: 1.5, isMutexZone: false },
  { id: 'DA', from: 'D', to: 'A', length: 30, speedLimit: 1.5, isMutexZone: false },
  { id: 'AE', from: 'A', to: 'E', length: 21.2, speedLimit: 1.0, isMutexZone: false },
  { id: 'BE', from: 'B', to: 'E', length: 21.2, speedLimit: 1.0, isMutexZone: false },
  { id: 'CE', from: 'C', to: 'E', length: 21.2, speedLimit: 1.0, isMutexZone: false },
  { id: 'DE', from: 'D', to: 'E', length: 21.2, speedLimit: 1.0, isMutexZone: false },
  { id: 'BF', from: 'B', to: 'F', length: 18.0, speedLimit: 1.5, isMutexZone: true },
  { id: 'CF', from: 'C', to: 'F', length: 21.2, speedLimit: 1.5, isMutexZone: false },
  { id: 'GB', from: 'G', to: 'B', length: 18.0, speedLimit: 2.0, isMutexZone: false },
  { id: 'GA', from: 'G', to: 'A', length: 18.0, speedLimit: 2.0, isMutexZone: false },
  { id: 'CH', from: 'C', to: 'H', length: 18.0, speedLimit: 1.5, isMutexZone: false },
  { id: 'FH', from: 'F', to: 'H', length: 20.6, speedLimit: 1.5, isMutexZone: true },
]

// Demo logistics nodes (derived from DEMO_NODES for logistics simulation)
const DEMO_LOGISTICS_NODES: LogisticsNodeOption[] = [
  { id: 'A', label: 'Loading Port A', type: 'loading_port' },
  { id: 'G', label: 'Loading Port G', type: 'loading_port' },
  { id: 'C', label: 'Workstation C', type: 'workstation' },
  { id: 'E', label: 'Workstation E', type: 'workstation' },
  { id: 'H', label: 'Unloading Port H', type: 'unloading_port' },
  { id: 'F', label: 'Unloading Port F', type: 'unloading_port' },
]

export default function SimulationPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  const { setCurrentProject } = useProjectStore()

  // Simulation record from database
  const [simRecordId, setSimRecordId] = useState<string | null>(null)

  // Load or create simulation record on mount
  useEffect(() => {
    if (!projectId) return
    setCurrentProject(projectId, '')

    const initSim = async () => {
      try {
        // Try to load existing simulations for this project
        const res = await fetch(`/api/simulations?project_id=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          const sims = data.simulations || []
          if (sims.length > 0) {
            setSimRecordId(sims[0].id)
            // Restore config if available
            const config = sims[0].config as Record<string, unknown> | null
            if (config) {
              if (config.mode) setMode(config.mode as 'lightweight' | 'dynamic')
              if (config.speed_multiplier) setSpeedMultiplier(config.speed_multiplier as number)
              if (config.duration_s) setDuration(config.duration_s as number)
              if (config.agv_count) setAgvCount(config.agv_count as number)
              if (config.tasks_per_hour) setTasksPerHour(config.tasks_per_hour as number)
              // Restore task chains
              if (config.task_chains) setTaskChains(config.task_chains as TaskChain[])
              // Restore task templates and enabled templates
              if (config.task_templates) setTaskTemplates(config.task_templates as TaskTemplate[])
              if (config.enabled_templates) setEnabledTemplates(new Set(config.enabled_templates as string[]))
            }
          } else {
            // Create a new simulation record
            const createRes = await fetch('/api/simulations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_id: projectId,
                name: 'Simulation 1',
                config: { mode: 'lightweight', speed_multiplier: 1, duration_s: 3600, agv_count: 3, tasks_per_hour: 20 },
              }),
            })
            if (createRes.ok) {
              const createData = await createRes.json()
              setSimRecordId(createData.simulation.id)
            }
          }
        }
      } catch { /* ignore */ }
    }
    initSim()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Simulation state
  const [status, setStatus] = useState<SimStatus>('idle')
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [mode, setMode] = useState<'lightweight' | 'dynamic'>('lightweight')
  const [duration, setDuration] = useState(3600)
  const [agvCount, setAgvCount] = useState(3)
  const [tasksPerHour, setTasksPerHour] = useState(20)
  const [metrics, setMetrics] = useState<SimMetrics | null>(null)
  const [progress, setProgress] = useState(0)
  const [showConfig, setShowConfig] = useState(true)
  const [agvStates, setAgvStates] = useState<AGVAnimationFrame[]>([])

  // RCS scheduler state (dynamic mode)
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([...DEFAULT_TASK_TEMPLATES])
  const [enabledTemplates, setEnabledTemplates] = useState<Set<string>>(
    new Set(['tpl_transport_standard', 'tpl_charge', 'tpl_park'])
  )
  const [conflictResolutions, setConflictResolutions] = useState<ConflictResolution[]>([])

  // Logistics / task chain state
  const [taskChains, setTaskChains] = useState<TaskChain[]>([])
  const [throughputResult, setThroughputResult] = useState<ThroughputResult | null>(null)
  const [throughputInput, setThroughputInput] = useState<ThroughputInput | null>(null)
  const [logisticsMetrics, setLogisticsMetrics] = useState<LogisticsMetrics | null>(null)
  const logisticsEngineRef = useRef<LogisticsEngine | null>(null)

  const engineRef = useRef<SimulationEngine | null>(null)
  const rcsRef = useRef<RCSScheduler | null>(null)
  const animFrameRef = useRef<number>(0)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 })
  const viewMode = useViewStore((s) => s.viewMode)

  // Save config changes to database (including task chains and templates)
  const saveConfig = useCallback(async () => {
    if (!simRecordId) return
    try {
      await fetch(`/api/simulations/${simRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            mode,
            speed_multiplier: speedMultiplier,
            duration_s: duration,
            agv_count: agvCount,
            tasks_per_hour: tasksPerHour,
            task_chains: taskChains,
            task_templates: taskTemplates,
            enabled_templates: [...enabledTemplates],
          },
        }),
      })
    } catch { /* ignore */ }
  }, [simRecordId, mode, speedMultiplier, duration, agvCount, tasksPerHour, taskChains, taskTemplates, enabledTemplates])

  // Auto-save config when task chains or templates change (debounced)
  useEffect(() => {
    if (!simRecordId) return
    const timer = setTimeout(() => { saveConfig() }, 1000)
    return () => clearTimeout(timer)
  }, [taskChains, taskTemplates, enabledTemplates, simRecordId, saveConfig])

  // Save simulation results to database
  const saveResults = useCallback(async (results: Record<string, unknown>) => {
    if (!simRecordId) return
    try {
      await fetch(`/api/simulations/${simRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results, status: 'completed' }),
      })
    } catch { /* ignore */ }
  }, [simRecordId])

  // Observe canvas container size
  useEffect(() => {
    const container = canvasContainerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Build heatmap edges from metrics
  const heatmapEdges: HeatmapEdge[] = (() => {
    if (!metrics?.heatmapData) return []
    return DEMO_EDGES.map(edge => {
      const congestion = metrics.heatmapData[edge.id] ?? 0
      const from = DEMO_NODES.find(n => n.id === edge.from)
      const to = DEMO_NODES.find(n => n.id === edge.to)
      return {
        edgeId: edge.id,
        fromX: from?.x ?? 0,
        fromY: from?.y ?? 0,
        toX: to?.x ?? 0,
        toY: to?.y ?? 0,
        congestion,
      }
    })
  })()

  const createConfig = useCallback((): SimConfig => {
    const agvs = Array.from({ length: agvCount }, (_, i) => ({
      id: `AGV-${i + 1}`,
      type: 'default',
      startNodeId: DEMO_NODES[i % DEMO_NODES.length].id,
      maxSpeed: 1.5,
    }))

    return {
      mode,
      durationSeconds: duration,
      speedMultiplier,
      agvs,
      taskGenerators: [
        {
          id: 'tg_1',
          type: 'periodic' as const,
          pickupNodes: ['A', 'G'],
          deliveryNodes: ['C', 'H'],
          tasksPerHour,
          dwellTimePickup: 15,
          dwellTimeDelivery: 15,
        },
      ],
      routeGraph: {
        nodes: DEMO_NODES.map(n => ({ id: n.id, x: n.x, y: n.y })),
        edges: DEMO_EDGES,
      },
    }
  }, [agvCount, tasksPerHour, duration, mode, speedMultiplier])

  const handleToggleTemplate = useCallback((templateId: string) => {
    setEnabledTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) next.delete(templateId)
      else next.add(templateId)
      return next
    })
  }, [])

  const handleUpdateTemplate = useCallback((template: TaskTemplate) => {
    setTaskTemplates(prev => prev.map(t => t.id === template.id ? template : t))
  }, [])

  const handleAddTemplate = useCallback((template: TaskTemplate) => {
    setTaskTemplates(prev => [...prev, template])
    setEnabledTemplates(prev => new Set([...prev, template.id]))
  }, [])

  const handleRemoveTemplate = useCallback((templateId: string) => {
    setTaskTemplates(prev => prev.filter(t => t.id !== templateId))
    setEnabledTemplates(prev => {
      const next = new Set(prev)
      next.delete(templateId)
      return next
    })
  }, [])

  // --- Logistics callbacks ---

  // Compute throughput estimate whenever task chains change
  const computeThroughputEstimate = useCallback(() => {
    if (taskChains.length === 0) {
      setThroughputResult(null)
      setThroughputInput(null)
      return
    }

    // Build distance map from DEMO_EDGES
    const distances = new Map<string, number>()
    for (const edge of DEMO_EDGES) {
      const key1 = `${edge.from}|${edge.to}`
      const key2 = `${edge.to}|${edge.from}`
      distances.set(key1, edge.length)
      distances.set(key2, edge.length)
    }

    // Build station throughput from node types
    const stationThroughput = new Map<string, number>()
    for (const node of DEMO_LOGISTICS_NODES) {
      if (node.type === 'loading_port') stationThroughput.set(node.id, 120)
      else if (node.type === 'unloading_port') stationThroughput.set(node.id, 100)
      else if (node.type === 'workstation') stationThroughput.set(node.id, 60)
    }

    const input: ThroughputInput = {
      taskChains,
      agvCount,
      agvSpeedMs: 1.5,
      distances,
      stationThroughput,
    }
    const result = calculateThroughput(input)
    setThroughputResult(result)
    setThroughputInput(input)
  }, [taskChains, agvCount])

  // Auto-compute throughput when chains or AGV count change
  useEffect(() => {
    computeThroughputEstimate()
  }, [computeThroughputEstimate])

  // Recalculate throughput with a different AGV count (for sensitivity analysis)
  const handleRecalculate = useCallback((newAgvCount: number) => {
    setAgvCount(newAgvCount)
  }, [])

  const runLogisticsSimulation = useCallback(() => {
    if (taskChains.length === 0) return

    // Build logistics nodes from DEMO_LOGISTICS_NODES
    const logisticsNodes = DEMO_LOGISTICS_NODES.map(opt => {
      const demoNode = DEMO_NODES.find(n => n.id === opt.id)
      return {
        id: opt.id,
        x: demoNode?.x ?? 0,
        y: demoNode?.y ?? 0,
        type: opt.type,
        processingTimeSeconds: 30,
        bufferCapacity: 5,
        throughputItemsPerHour: opt.type === 'workstation' ? 60 : 120,
      }
    })

    const config: LogisticsEngineConfig = {
      nodes: logisticsNodes,
      edges: DEMO_EDGES.map(e => ({ fromNodeId: e.from, toNodeId: e.to, distanceMeters: e.length })),
      taskChains,
      agvs: Array.from({ length: agvCount }, (_, i) => ({
        id: `AGV-${i + 1}`,
        maxSpeedMs: 1.5,
        startNodeId: DEMO_LOGISTICS_NODES[0]?.id ?? 'A',
      })),
      durationSeconds: duration,
    }

    const engine = new LogisticsEngine(config)
    logisticsEngineRef.current = engine

    const metrics = engine.run(1.0)
    setLogisticsMetrics(metrics)
  }, [taskChains, agvCount, duration])

  const runSimulation = useCallback(() => {
    const config = createConfig()
    const engine = new SimulationEngine(config)
    engineRef.current = engine

    if (mode === 'dynamic') {
      const rcs = new RCSScheduler(config)
      rcsRef.current = rcs
    }

    setStatus('running')
    setProgress(0)
    setMetrics(null)
    setConflictResolutions([])

    const totalSteps = 100
    const stepTime = duration / totalSteps
    let step = 0

    const tick = () => {
      if (step >= totalSteps) {
        const finalMetrics = engine.getMetrics()
        setMetrics(finalMetrics)
        setStatus('completed')
        setProgress(1)
        saveResults(finalMetrics as unknown as Record<string, unknown>)
        return
      }

      engine.tick(stepTime)

      if (mode === 'dynamic' && rcsRef.current) {
        const agvMap = new Map<string, typeof config.agvs[number]>()
        const resolutions = rcsRef.current.resolveConflicts(agvMap as any)
        if (resolutions.length > 0) {
          setConflictResolutions(prev => [...prev, ...resolutions])
        }
      }

      step++
      setProgress(step / totalSteps)
      setMetrics(engine.getMetrics())
      setAgvStates(engine.getAGVStates())

      setTimeout(tick, Math.max(10, 1000 / (speedMultiplier * 10)))
    }

    tick()
  }, [createConfig, mode, duration, speedMultiplier])

  const togglePause = useCallback(() => {
    if (status === 'running') {
      setStatus('paused')
    } else if (status === 'paused') {
      setStatus('running')
      // Resume simulation ticks
      const engine = engineRef.current
      if (!engine) return

      const totalSteps = 100
      const stepTime = duration / totalSteps
      const currentStep = Math.round(progress * totalSteps)

      const tick = () => {
        if (currentStep >= totalSteps) {
          setMetrics(engine.getMetrics())
          setStatus('completed')
          setProgress(1)
          saveResults(engine.getMetrics() as unknown as Record<string, unknown>)
          return
        }

        engine.tick(stepTime)

        if (mode === 'dynamic' && rcsRef.current) {
          const resolutions = rcsRef.current.resolveConflicts(new Map())
          if (resolutions.length > 0) {
            setConflictResolutions(prev => [...prev, ...resolutions])
          }
        }

        setProgress((currentStep + 1) / totalSteps)
        setMetrics(engine.getMetrics())
        setAgvStates(engine.getAGVStates())

        setTimeout(tick, Math.max(10, 1000 / (speedMultiplier * 10)))
      }

      tick()
    }
  }, [status, progress, duration, speedMultiplier, mode])

  const resetSimulation = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setMetrics(null)
    setAgvStates([])
    setConflictResolutions([])
    setLogisticsMetrics(null)
    engineRef.current = null
    rcsRef.current = null
    logisticsEngineRef.current = null
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (status === 'idle') runSimulation()
        else togglePause()
      }
      if (e.code === 'KeyR') {
        e.preventDefault()
        resetSimulation()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [status, runSimulation, togglePause, resetSimulation])

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const currentSimTime = progress * duration

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <div className="h-10 border-b border-panel-border bg-panel-bg flex items-center px-4 gap-3 shrink-0" role="toolbar" aria-label={t('sim.toolbarAriaLabel')}>
        <span className="text-sm font-medium">{t('sim.control')}</span>
        <ViewModeSwitcher />
        <div className="w-px h-5 bg-gray-200" role="separator" />

        {status === 'idle' ? (
          <button
            onClick={runSimulation}
            className="flex items-center gap-1.5 px-3 py-1 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover transition-colors"
            aria-label={t('sim.startAriaLabel')}
          >
            <Play size={12} aria-hidden="true" />
            {t('sim.start')}
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              disabled={status === 'completed'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                status === 'running'
                  ? 'bg-gray-100 text-muted hover:bg-gray-200'
                  : 'bg-accent text-white hover:bg-accent-hover'
              }`}
              aria-label={status === 'running' ? t('sim.pauseAriaLabel') : t('sim.continueAriaLabel')}
            >
              {status === 'running' ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
              {status === 'running' ? t('sim.pause') : t('sim.continue')}
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-muted rounded text-xs hover:bg-gray-200 transition-colors"
              aria-label={t('sim.resetAriaLabel')}
            >
              <RotateCcw size={12} aria-hidden="true" />
              {t('sim.reset')}
            </button>
          </>
        )}

        <div className="flex items-center gap-1" role="radiogroup" aria-label={t('sim.speedAriaLabel')}>
          <span className="text-xs text-muted">{t('sim.speed')}</span>
          {[1, 5, 10, 50].map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeedMultiplier(speed)}
              disabled={status !== 'idle'}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                speedMultiplier === speed
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'bg-gray-100 text-muted hover:bg-accent/10 hover:text-accent'
              } disabled:opacity-50`}
              role="radio"
              aria-checked={speedMultiplier === speed}
              aria-label={`${speed}${t('sim.speedLabel')}`}
            >
              {speed}x
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded ${
            mode === 'lightweight' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
          }`} aria-live="polite">
            {mode === 'lightweight' ? t('sim.lightweight') : t('sim.dynamic')}
          </span>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-1 rounded hover:bg-gray-100 text-muted"
            title={t('sim.config')}
            aria-label={showConfig ? t('sim.hideConfig') : t('sim.showConfig')}
            aria-expanded={showConfig}
          >
            <Settings size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Config panel (collapsible) */}
        {showConfig && (
          <div className="w-72 border-r border-panel-border bg-panel-bg overflow-auto shrink-0 p-4 space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted mb-2">{t('sim.mode')}</h4>
              <div className="flex gap-2">
                {(['lightweight', 'dynamic'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={status !== 'idle'}
                    className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                      mode === m ? 'bg-accent text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {m === 'lightweight' ? t('sim.lightweight') : t('sim.dynamic')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted mb-2">{t('sim.duration')}</h4>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                disabled={status !== 'idle'}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white disabled:opacity-50"
              />
              <div className="flex gap-1 mt-1">
                {[1800, 3600, 7200].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    disabled={status !== 'idle'}
                    className="flex-1 px-2 py-1 text-xs bg-gray-50 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    {d / 3600}h
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted mb-2">{t('sim.agvCount')}</h4>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={agvCount}
                  onChange={e => setAgvCount(Number(e.target.value))}
                  disabled={status !== 'idle'}
                  className="flex-1 accent-accent"
                />
                <span className="text-xs font-medium w-6 text-center">{agvCount}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted mb-2">{t('sim.taskFrequency')}</h4>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={tasksPerHour}
                  onChange={e => setTasksPerHour(Number(e.target.value))}
                  disabled={status !== 'idle'}
                  className="flex-1 accent-accent"
                />
                <span className="text-xs font-medium w-8 text-center">{tasksPerHour}</span>
              </div>
            </div>

            {/* Task template panel (dynamic mode only) */}
            {mode === 'dynamic' && (
              <TaskTemplatePanel
                templates={taskTemplates}
                enabledTemplates={enabledTemplates}
                onToggleTemplate={handleToggleTemplate}
                onUpdateTemplate={handleUpdateTemplate}
                onAddTemplate={handleAddTemplate}
                onRemoveTemplate={handleRemoveTemplate}
              />
            )}

            {/* Task chain panel (logistics mode) */}
            <div className="pt-2 border-t border-panel-border">
              <TaskChainPanel
                chains={taskChains}
                nodeOptions={DEMO_LOGISTICS_NODES}
                onUpdateChains={setTaskChains}
              />
            </div>

            {/* Logistics simulation run button */}
            {taskChains.length > 0 && (
              <button
                onClick={runLogisticsSimulation}
                disabled={status !== 'idle'}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Link2 size={12} />
                {t('sim.runLogistics')}
              </button>
            )}

            <div className="p-3 bg-blue-50 rounded-md text-xs text-blue-700 space-y-1">
              <p className="font-medium">{t('sim.demoNetwork')}</p>
              <p>{t('sim.demoNetworkDesc')}</p>
            </div>
          </div>
        )}

        {/* Visualization area — 2D or 3D based on view mode */}
        <div className="flex-1 relative" ref={canvasContainerRef}>
          {viewMode === '2d' ? (
            <div className="w-full h-full bg-canvas-bg">
              <svg
                width={canvasSize.width}
                height={canvasSize.height}
                className="absolute inset-0"
              >
                <defs>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {DEMO_EDGES.map(edge => {
                  const from = DEMO_NODES.find(n => n.id === edge.from)
                  const to = DEMO_NODES.find(n => n.id === edge.to)
                  if (!from || !to) return null
                  return (
                    <line
                      key={edge.id}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={edge.isMutexZone ? '#f59e0b' : '#94a3b8'}
                      strokeWidth={edge.isMutexZone ? 2 : 1.5}
                      strokeDasharray={edge.isMutexZone ? '6,3' : undefined}
                    />
                  )
                })}

                {DEMO_NODES.map(node => (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r={10} fill="#3b82f6" stroke="#1e40af" strokeWidth={2} />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                      {node.id}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <SceneViewer
              cameraPosition={[25, 30, 40]}
              cameraTarget={[15, 0, 15]}
            >
              <GroundPlane width={60} depth={60} />
              <TubeNetwork nodes={DEMO_NODES} edges={DEMO_EDGES} />
              <ExtrudedWalls
                zones={[
                  {
                    id: 'demo_zone_1',
                    points: [[-1, -1], [31, -1], [31, 0.5], [-1, 0.5]],
                    height: 3,
                    color: '#64748b',
                    opacity: 0.3,
                  },
                ]}
              />
              {agvStates.length > 0 && (
                <AGVAnimator agvStates={agvStates} />
              )}
            </SceneViewer>
          )}

          {/* Heatmap overlay */}
          {metrics && heatmapEdges.length > 0 && (
            <HeatmapOverlay
              edges={heatmapEdges}
              width={canvasSize.width}
              height={canvasSize.height}
              opacity={0.5}
              showLabels
            />
          )}

          {/* Empty state */}
          {!metrics && status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted">
                <BarChart3 size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t('sim.configurePrompt')}</p>
                <p className="text-xs mt-1">{t('sim.dashboardHint')}</p>
              </div>
            </div>
          )}

          {/* Running indicator */}
          {status === 'running' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot" />
              <span className="text-xs font-medium text-green-700">{t('sim.running')}</span>
              <span className="text-[10px] text-muted">{t('sim.spacePause')}</span>
            </div>
          )}
          {status === 'paused' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-xs font-medium text-amber-700">{t('sim.paused')}</span>
              <span className="text-[10px] text-muted">{t('sim.spaceContinue')}</span>
            </div>
          )}

          {/* Heatmap legend */}
          {metrics && (
            <div className="absolute bottom-3 left-3 px-3 py-2 bg-white/90 rounded-md shadow-sm">
              <HeatmapLegend />
            </div>
          )}
        </div>

        {/* Right Panel - Metrics Dashboard */}
        <div className="w-80 border-l border-panel-border bg-panel-bg overflow-auto shrink-0">
          <div className="p-4 border-b border-panel-border">
            <h3 className="text-sm font-medium">{t('sim.dashboard')}</h3>
          </div>

          {/* Metric cards */}
          <div className="p-3 space-y-2.5">
            {/* UPH Card */}
            <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-[var(--radius-md)]">
                    <Activity size={12} className="text-blue-500" />
                  </div>
                  <span className="text-[11px] text-muted font-medium">{t('sim.uph')}</span>
                </div>
                {metrics && (
                  <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                    <TrendingUp size={10} />
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {metrics ? metrics.throughputUPH.toFixed(1) : <span className="text-muted-foreground">--</span>}
              </div>
              {!metrics && <div className="text-[10px] text-muted-foreground mt-1">{t('sim.startToDisplay')}</div>}
            </div>

            {/* Utilization Card */}
            <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-[var(--radius-md)]">
                    <Truck size={12} className="text-emerald-500" />
                  </div>
                  <span className="text-[11px] text-muted font-medium">{t('sim.utilization')}</span>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-bold tracking-tight">
                  {metrics ? `${(metrics.avgUtilization * 100).toFixed(1)}` : <span className="text-muted-foreground">--</span>}
                </div>
                {metrics && <span className="text-xs text-muted mb-0.5">%</span>}
              </div>
              {metrics && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      metrics.avgUtilization > 0.7 ? 'bg-emerald-500' :
                      metrics.avgUtilization > 0.4 ? 'bg-amber-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(metrics.avgUtilization * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Empty Run Ratio Card */}
            <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-[var(--radius-md)]">
                    <Clock size={12} className="text-amber-500" />
                  </div>
                  <span className="text-[11px] text-muted font-medium">{t('sim.emptyRun')}</span>
                </div>
                {metrics && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    {metrics.avgEmptyRunRatio > 0.3
                      ? <><TrendingUp size={10} className="text-red-500" /><span className="text-red-500">{t('sim.high')}</span></>
                      : metrics.avgEmptyRunRatio > 0.15
                        ? <><Minus size={10} className="text-amber-500" /><span className="text-amber-500">{t('sim.average')}</span></>
                        : <><TrendingDown size={10} className="text-green-500" /><span className="text-green-500">{t('sim.good')}</span></>
                    }
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-bold tracking-tight">
                  {metrics ? `${(metrics.avgEmptyRunRatio * 100).toFixed(1)}` : <span className="text-muted-foreground">--</span>}
                </div>
                {metrics && <span className="text-xs text-muted mb-0.5">%</span>}
              </div>
            </div>

            {/* Deadlocks Card */}
            <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-[var(--radius-md)] ${metrics && metrics.deadlocks > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <AlertTriangle size={12} className={metrics && metrics.deadlocks > 0 ? 'text-red-500' : 'text-gray-400'} />
                  </div>
                  <span className="text-[11px] text-muted font-medium">{t('sim.deadlocks')}</span>
                </div>
              </div>
              <div className={`text-2xl font-bold tracking-tight ${metrics && metrics.deadlocks > 0 ? 'text-red-500' : ''}`}>
                {metrics ? metrics.deadlocks : <span className="text-muted-foreground">--</span>}
              </div>
            </div>

            {/* Task summary */}
            {metrics && (
              <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
                <div className="text-[11px] text-muted font-medium mb-2.5">{t('sim.taskStats')}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground">{t('sim.totalTasks')}</div>
                    <div className="text-sm font-semibold">{metrics.totalTasks}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">{t('sim.completedTasks')}</div>
                    <div className="text-sm font-semibold text-emerald-600">{metrics.completedTasks}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">{t('sim.totalDistance')}</div>
                    <div className="text-sm font-semibold">{metrics.totalDistance.toFixed(0)}<span className="text-xs text-muted font-normal ml-0.5">m</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">{t('sim.simTime')}</div>
                    <div className="text-sm font-semibold font-mono">{formatTime(currentSimTime)}</div>
                  </div>
                </div>
                {metrics.totalTasks > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-panel-border">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">{t('sim.completionRate')}</span>
                      <span className="font-medium">{((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(metrics.completedTasks / metrics.totalTasks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Per-AGV metrics */}
            {metrics && metrics.agvMetrics.length > 0 && (
              <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
                <div className="text-[11px] text-muted font-medium mb-2.5">{t('sim.agvDetails')}</div>
                <div className="space-y-2">
                  {metrics.agvMetrics.map(agv => (
                    <div key={agv.agvId} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-16">
                        <CircleDot size={8} className={
                          agv.utilization > 0.7 ? 'text-emerald-500' :
                          agv.utilization > 0.4 ? 'text-amber-500' : 'text-gray-300'
                        } />
                        <span className="text-xs font-medium">{agv.agvId}</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            agv.utilization > 0.7 ? 'bg-emerald-500' :
                            agv.utilization > 0.4 ? 'bg-amber-400' : 'bg-gray-300'
                          }`}
                          style={{ width: `${agv.utilization * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted w-10 text-right font-mono">
                        {(agv.utilization * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RCS Conflict Resolutions (dynamic mode) */}
            {mode === 'dynamic' && conflictResolutions.length > 0 && (
              <div className="p-3 bg-panel-bg border border-panel-border rounded-[var(--radius-lg)]">
                <div className="text-[11px] text-muted font-medium mb-2 flex items-center gap-1.5">
                  <Zap size={10} className="text-orange-500" />
                  {t('sim.rcsConflicts')}
                  <span className="ml-auto text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-[var(--radius-full)] font-medium">
                    {conflictResolutions.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-36 overflow-auto">
                  {conflictResolutions.slice(-10).map((cr, i) => (
                    <div key={i} className="text-[10px] p-2 bg-gray-50 rounded-[var(--radius-md)] border border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[9px] font-semibold ${
                          cr.action === 'yield' ? 'bg-amber-100 text-amber-700' :
                          cr.action === 'reroute' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {cr.action === 'yield' ? t('sim.yield') : cr.action === 'reroute' ? t('sim.reroute') : t('sim.wait')}
                        </span>
                        <span className="font-medium">{cr.agvId}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span>{cr.conflictingAGVId}</span>
                      </div>
                      <div className="text-muted-foreground mt-1 flex items-center gap-1">
                        <span className={`inline-block w-1 h-1 rounded-full ${
                          cr.reason === 'head_on_collision' ? 'bg-red-400' :
                          cr.reason === 'mutex_zone' ? 'bg-amber-400' :
                          cr.reason === 'deadlock_prevention' ? 'bg-purple-400' : 'bg-blue-400'
                        }`} />
                        {cr.reason === 'head_on_collision' ? t('sim.headOn') :
                         cr.reason === 'mutex_zone' ? t('sim.mutexZone') :
                         cr.reason === 'deadlock_prevention' ? t('sim.deadlockPrevention') : t('sim.resourceCompetition')}
                        <span className="text-gray-300">·</span>
                        {t('sim.edge')} {cr.edgeId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Throughput Estimate Dashboard ── */}
            {throughputResult && (
              <div className="space-y-2.5">
                <div className="text-[11px] text-muted font-medium flex items-center gap-1.5">
                  <PackageCheck size={11} className="text-emerald-500" />
                  {t('sim.throughputEstimate')}
                </div>
                <ThroughputDashboard
                  result={throughputResult}
                  logisticsMetrics={logisticsMetrics}
                />
                <BottleneckAnalysis
                  result={throughputResult}
                  input={throughputInput}
                  onRecalculate={handleRecalculate}
                />
              </div>
            )}

            {/* ── Logistics Simulation Results Dashboard ── */}
            {logisticsMetrics && !throughputResult && (
              <div className="space-y-2.5">
                <div className="text-[11px] text-muted font-medium flex items-center gap-1.5">
                  <Link2 size={11} className="text-blue-500" />
                  {t('sim.logisticsResult')}
                </div>
                <ThroughputDashboard
                  result={null}
                  logisticsMetrics={logisticsMetrics}
                />
              </div>
            )}

            {/* RCS mode indicator */}
            {mode === 'dynamic' && (
              <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-[var(--radius-lg)]">
                <div className="text-xs text-orange-700 font-medium flex items-center gap-1.5">
                  <Zap size={12} />
                  {t('sim.rcsMode')}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-orange-600">
                  <span>{t('sim.templates')} {enabledTemplates.size}/{taskTemplates.length}</span>
                  <span className="w-px h-2.5 bg-orange-200" />
                  <span>{t('sim.conflicts')} {conflictResolutions.length} {t('sim.times')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-14 border-t border-panel-border bg-panel-bg flex items-center px-4 gap-3 shrink-0">
        <span className="text-xs text-muted font-mono w-16 tabular-nums">{formatTime(currentSimTime)}</span>
        <div className="flex-1 relative group">
          {/* Tick marks */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <div key={tick} className="w-px h-2 bg-gray-300" />
            ))}
          </div>
          {/* Progress track */}
          <div
            className="h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (status === 'idle' || !engineRef.current) return
              const rect = e.currentTarget.getBoundingClientRect()
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            }}
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('sim.progress')}
          >
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {/* Current time indicator dot */}
          {status !== 'idle' && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full border-2 border-white shadow-[var(--shadow-sm)] transition-all duration-300 -ml-1.5"
              style={{ left: `${progress * 100}%` }}
            />
          )}
        </div>
        <span className="text-xs text-muted font-mono w-16 text-right tabular-nums">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
