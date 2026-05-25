/**
 * Logistics Simulation Engine
 *
 * Lightweight discrete-event simulation specialized for logistics task chains.
 * Models AGVs executing ordered steps: move → queue → process → move to next.
 * Tracks throughput (completed task chains = items), station queues, and utilization.
 */

import type { TaskChain, TaskChainStep } from './throughput-calculator'

// ============================================
// Types
// ============================================

export interface LogisticsNode {
  id: string
  x: number
  y: number
  type: 'loading_port' | 'unloading_port' | 'workstation' | 'waypoint'
  processingTimeSeconds: number
  bufferCapacity: number // max items in queue (0 = infinite)
  throughputItemsPerHour: number
}

export interface LogisticsEdge {
  fromNodeId: string
  toNodeId: string
  distanceMeters: number
}

export interface LogisticsAGVConfig {
  id: string
  maxSpeedMs: number // m/s
  startNodeId: string
}

export interface LogisticsEngineConfig {
  nodes: LogisticsNode[]
  edges: LogisticsEdge[]
  taskChains: TaskChain[]
  agvs: LogisticsAGVConfig[]
  durationSeconds: number
}

// --- Runtime state ---

type AGVPhase =
  | 'idle'
  | 'moving'
  | 'queuing'
  | 'processing'
  | 'returning' // empty run back to first station

interface LogisticsAGV {
  id: string
  maxSpeedMs: number
  x: number
  y: number
  phase: AGVPhase
  currentChainId: string | null
  currentStepIndex: number // index in chain.steps
  targetNodeId: string | null
  // Movement tracking
  moveProgress: number // 0-1 along current edge
  moveDistance: number // total distance of current move
  // Processing tracking
  processRemaining: number // seconds left at current station
  // Stats
  totalDistance: number
  totalEmptyDistance: number
  completedChains: number
  totalTimeActive: number
  idleTime: number
}

interface StationQueue {
  nodeId: string
  queue: string[] // AGV IDs in FIFO order
  bufferCapacity: number
  currentProcessing: string | null // AGV ID currently being processed
  processRemaining: number
  totalProcessed: number
  totalQueueWaitTime: number
  busyTime: number // seconds spent processing
}

export interface LogisticsMetrics {
  systemThroughput: number // items/hour
  completedChains: number
  avgCycleTimeSeconds: number
  agvUtilization: number // 0-1
  stationUtilization: Map<string, number> // nodeId → 0-1
  stationQueueLengths: Map<string, number> // nodeId → current queue length
  totalSimTime: number
  agvDetails: {
    agvId: string
    utilization: number
    completedChains: number
    totalDistance: number
    phase: AGVPhase
  }[]
  stationDetails: {
    nodeId: string
    utilization: number
    totalProcessed: number
    avgQueueWait: number
    currentQueueLength: number
  }[]
}

// ============================================
// Engine
// ============================================

export class LogisticsEngine {
  private config: LogisticsEngineConfig
  private agvs: Map<string, LogisticsAGV>
  private stations: Map<string, StationQueue>
  private nodeMap: Map<string, LogisticsNode>
  private currentTime: number
  private completedChains: number
  private chainCompletionTimes: number[] // for avg cycle time

  constructor(config: LogisticsEngineConfig) {
    this.config = config
    this.currentTime = 0
    this.completedChains = 0
    this.chainCompletionTimes = []

    // Build node lookup
    this.nodeMap = new Map()
    for (const node of config.nodes) {
      this.nodeMap.set(node.id, node)
    }

    // Initialize AGVs
    this.agvs = new Map()
    for (const agvConfig of config.agvs) {
      const startNode = this.nodeMap.get(agvConfig.startNodeId)
      this.agvs.set(agvConfig.id, {
        id: agvConfig.id,
        maxSpeedMs: agvConfig.maxSpeedMs,
        x: startNode?.x ?? 0,
        y: startNode?.y ?? 0,
        phase: 'idle',
        currentChainId: null,
        currentStepIndex: 0,
        targetNodeId: null,
        moveProgress: 0,
        moveDistance: 0,
        processRemaining: 0,
        totalDistance: 0,
        totalEmptyDistance: 0,
        completedChains: 0,
        totalTimeActive: 0,
        idleTime: 0,
      })
    }

    // Initialize station queues (only for loading/unloading/workstation)
    this.stations = new Map()
    for (const node of config.nodes) {
      if (node.type === 'loading_port' || node.type === 'unloading_port' || node.type === 'workstation') {
        this.stations.set(node.id, {
          nodeId: node.id,
          queue: [],
          bufferCapacity: node.bufferCapacity,
          currentProcessing: null,
          processRemaining: 0,
          totalProcessed: 0,
          totalQueueWaitTime: 0,
          busyTime: 0,
        })
      }
    }
  }

  /**
   * Advance simulation by deltaTime seconds
   */
  tick(deltaTime: number): void {
    this.currentTime += deltaTime

    // 1. Assign idle AGVs to task chains
    this.assignChains()

    // 2. Process all AGVs
    for (const [, agv] of this.agvs) {
      this.processAGV(agv, deltaTime)
    }

    // 3. Process station queues
    this.processStations(deltaTime)
  }

  /**
   * Run the full simulation synchronously
   */
  run(timeStep = 1.0): LogisticsMetrics {
    const totalSteps = Math.ceil(this.config.durationSeconds / timeStep)
    for (let i = 0; i < totalSteps; i++) {
      this.tick(timeStep)
    }
    return this.getMetrics()
  }

  // ------------------------------------------
  // Private methods
  // ------------------------------------------

  private assignChains(): void {
    if (this.config.taskChains.length === 0) return

    for (const [, agv] of this.agvs) {
      if (agv.phase !== 'idle') continue

      // Round-robin chain assignment
      const chainIndex = this.completedChains % this.config.taskChains.length
      const chain = this.config.taskChains[chainIndex]

      if (chain.steps.length === 0) continue

      agv.currentChainId = chain.id
      agv.currentStepIndex = 0
      agv.totalTimeActive += 0 // will start tracking

      // Start moving to first station
      const firstStep = chain.steps[0]
      this.startMoveTo(agv, firstStep.nodeId)
    }
  }

  private startMoveTo(agv: LogisticsAGV, targetNodeId: string): void {
    agv.targetNodeId = targetNodeId
    agv.phase = 'moving'
    agv.moveProgress = 0

    const targetNode = this.nodeMap.get(targetNodeId)
    if (targetNode) {
      const dx = targetNode.x - agv.x
      const dy = targetNode.y - agv.y
      agv.moveDistance = Math.sqrt(dx * dx + dy * dy)
    } else {
      agv.moveDistance = 10 // fallback
    }
  }

  private processAGV(agv: LogisticsAGV, deltaTime: number): void {
    switch (agv.phase) {
      case 'idle':
        agv.idleTime += deltaTime
        break

      case 'moving':
        this.processMoving(agv, deltaTime)
        break

      case 'queuing':
        // AGV waits in station queue; station processing handles this
        agv.totalTimeActive += deltaTime
        break

      case 'processing':
        // Station controls processing time; handled by processStations
        agv.totalTimeActive += deltaTime
        break

      case 'returning':
        this.processMoving(agv, deltaTime)
        break
    }
  }

  private processMoving(agv: LogisticsAGV, deltaTime: number): void {
    if (!agv.targetNodeId) {
      agv.phase = 'idle'
      return
    }

    agv.totalTimeActive += deltaTime
    const moveDistance = agv.maxSpeedMs * deltaTime

    if (agv.moveDistance > 0) {
      agv.moveProgress += moveDistance / agv.moveDistance
    }

    agv.totalDistance += moveDistance

    // Track empty distance when returning
    if (agv.phase === 'returning') {
      agv.totalEmptyDistance += moveDistance
    }

    if (agv.moveProgress >= 1) {
      // Arrived at target
      const targetNode = this.nodeMap.get(agv.targetNodeId)
      agv.x = targetNode?.x ?? agv.x
      agv.y = targetNode?.y ?? agv.y

      if (agv.phase === 'returning') {
        // Completed return trip, now idle
        agv.phase = 'idle'
        agv.currentChainId = null
        agv.currentStepIndex = 0
        agv.targetNodeId = null
        return
      }

      // Arrived at a station — enter queue
      const station = this.stations.get(agv.targetNodeId)
      if (station) {
        // Check buffer capacity
        if (station.bufferCapacity > 0 && station.queue.length >= station.bufferCapacity) {
          // Buffer full — AGV waits (blocked)
          // For simplicity, AGV stays in 'moving' phase but doesn't progress
          agv.moveProgress = 1 // stays at 1 (arrived)
          return
        }
        agv.phase = 'queuing'
        station.queue.push(agv.id)
      } else {
        // Not a station node (waypoint) — proceed to next step
        this.advanceToNextStep(agv)
      }
    } else {
      // Interpolate position
      const targetNode = this.nodeMap.get(agv.targetNodeId)
      if (targetNode) {
        const startX = agv.x // Note: we'd need to store start position for perfect interp
        // Simplified: just lerp towards target
        // Since we update x,y on arrival, this is approximate
      }
    }
  }

  private processStations(deltaTime: number): void {
    for (const [, station] of this.stations) {
      // If currently processing an AGV
      if (station.currentProcessing) {
        station.processRemaining -= deltaTime
        station.busyTime += deltaTime

        if (station.processRemaining <= 0) {
          // Processing complete — release AGV
          const agv = this.agvs.get(station.currentProcessing)
          if (agv) {
            this.advanceToNextStep(agv)
          }
          station.totalProcessed++
          station.currentProcessing = null
        }
      }

      // If no one processing and queue has AGVs, start processing next
      if (!station.currentProcessing && station.queue.length > 0) {
        const nextAGVId = station.queue.shift()!
        const agv = this.agvs.get(nextAGVId)
        const node = this.nodeMap.get(station.nodeId)

        if (agv && node) {
          station.currentProcessing = nextAGVId
          station.processRemaining = node.processingTimeSeconds
          agv.phase = 'processing'

          // Track queue wait time
          // (simplified: we don't track individual wait start times here)
        }
      }
    }
  }

  private advanceToNextStep(agv: LogisticsAGV): void {
    if (!agv.currentChainId) {
      agv.phase = 'idle'
      return
    }

    const chain = this.config.taskChains.find(c => c.id === agv.currentChainId)
    if (!chain) {
      agv.phase = 'idle'
      return
    }

    agv.currentStepIndex++

    if (agv.currentStepIndex >= chain.steps.length) {
      // Completed all steps in the chain — 1 item completed!
      this.completedChains++
      agv.completedChains++
      this.chainCompletionTimes.push(this.currentTime)

      // Return to first station of the chain (empty run)
      const firstStep = chain.steps[0]
      agv.phase = 'returning'
      this.startMoveTo(agv, firstStep.nodeId)
    } else {
      // Move to next step
      const nextStep = chain.steps[agv.currentStepIndex]
      this.startMoveTo(agv, nextStep.nodeId)
    }
  }

  // ------------------------------------------
  // Public query methods
  // ------------------------------------------

  getMetrics(): LogisticsMetrics {
    const totalSimTime = this.currentTime || 1

    // System throughput
    const systemThroughput = (this.completedChains / totalSimTime) * 3600

    // Average cycle time
    const avgCycleTimeSeconds = this.chainCompletionTimes.length > 0
      ? this.chainCompletionTimes[this.chainCompletionTimes.length - 1] / this.completedChains
      : 0

    // AGV utilization
    const agvDetails = Array.from(this.agvs.values()).map(agv => ({
      agvId: agv.id,
      utilization: totalSimTime > 0 ? 1 - (agv.idleTime / totalSimTime) : 0,
      completedChains: agv.completedChains,
      totalDistance: agv.totalDistance,
      phase: agv.phase,
    }))
    const agvUtilization = agvDetails.length > 0
      ? agvDetails.reduce((s, a) => s + a.utilization, 0) / agvDetails.length
      : 0

    // Station utilization
    const stationUtilization = new Map<string, number>()
    const stationDetails: LogisticsMetrics['stationDetails'] = []

    for (const [nodeId, station] of this.stations) {
      const util = totalSimTime > 0 ? station.busyTime / totalSimTime : 0
      stationUtilization.set(nodeId, util)
      stationDetails.push({
        nodeId,
        utilization: util,
        totalProcessed: station.totalProcessed,
        avgQueueWait: station.totalProcessed > 0 ? station.totalQueueWaitTime / station.totalProcessed : 0,
        currentQueueLength: station.queue.length,
      })
    }

    const stationQueueLengths = new Map<string, number>()
    for (const [nodeId, station] of this.stations) {
      stationQueueLengths.set(nodeId, station.queue.length)
    }

    return {
      systemThroughput,
      completedChains: this.completedChains,
      avgCycleTimeSeconds,
      agvUtilization,
      stationUtilization,
      stationQueueLengths,
      totalSimTime: this.currentTime,
      agvDetails,
      stationDetails,
    }
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  getAGVStates(): { agvId: string; x: number; y: number; phase: AGVPhase; targetNodeId: string | null }[] {
    return Array.from(this.agvs.values()).map(agv => ({
      agvId: agv.id,
      x: agv.x,
      y: agv.y,
      phase: agv.phase,
      targetNodeId: agv.targetNodeId,
    }))
  }
}
