/**
 * Discrete Event Simulation Engine for AGV Fleet Simulation
 * 
 * Supports two modes:
 * - Lightweight: Ignores complex physics, 10x speed, for throughput estimation
 * - Dynamic: Realistic RCS logic, real-time path conflict resolution
 */

// ============================================
// Core Types
// ============================================

export interface SimAGV {
  id: string
  type: string
  maxSpeed: number       // m/s
  currentSpeed: number   // m/s
  acceleration: number   // m/s²
  deceleration: number   // m/s²
  position: SimPosition
  state: AGVState
  currentTask: SimTask | null
  completedTasks: number
  totalDistance: number   // meters
  totalEmptyDistance: number
  totalTime: number       // seconds
  path: string[]          // Remaining path node IDs
  pathProgress: number    // 0-1 along current edge
}

export type AGVState = 
  | 'idle'
  | 'moving_to_pickup'
  | 'picking_up'
  | 'moving_to_delivery'
  | 'delivering'
  | 'charging'
  | 'waiting'      // Waiting for path clearance
  | 'deadlocked'

export interface SimPosition {
  nodeId: string
  x: number
  y: number
  heading: number      // radians, 0 = +X direction
  edgeId?: string
  progress?: number    // 0-1 along edge
}

export interface SimTask {
  id: string
  type: 'transport' | 'charge' | 'park' | 'patrol'
  pickupNodeId: string
  deliveryNodeId: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed'
  assignedAGVId: string | null
  priority?: number        // 1 (highest) - 10 (lowest)
  createdAt: number    // sim time in seconds
  startedAt: number | null
  completedAt: number | null
  dwellTimePickup: number   // seconds
  dwellTimeDelivery: number // seconds
}

export interface SimEvent {
  time: number
  type: 'task_complete' | 'agv_arrive' | 'agv_pickup' | 'agv_deliver' | 'conflict' | 'deadlock'
  agvId: string
  data: Record<string, unknown>
}

export interface SimConfig {
  mode: 'lightweight' | 'dynamic'
  durationSeconds: number
  speedMultiplier: number
  agvs: SimAGVConfig[]
  taskGenerators: TaskGenerator[]
  routeGraph: {
    nodes: { id: string; x: number; y: number }[]
    edges: { id: string; from: string; to: string; length: number; speedLimit: number; isMutexZone: boolean }[]
  }
}

export interface SimAGVConfig {
  id: string
  type: string
  maxSpeed: number
  acceleration?: number   // m/s², default 0.5
  deceleration?: number   // m/s², default 0.8
  startNodeId: string
}

export interface TaskGenerator {
  id: string
  type: 'periodic' | 'on_demand'
  pickupNodes: string[]
  deliveryNodes: string[]
  tasksPerHour: number
  dwellTimePickup: number
  dwellTimeDelivery: number
}

// Animation frame output for 3D rendering
export interface AGVAnimationFrame {
  agvId: string
  x: number           // world meters
  y: number           // world meters
  heading: number     // radians
  speed: number       // m/s
  state: AGVState
  edgeId: string | null
  progress: number    // 0-1 along current edge
}

// Full simulation snapshot for a point in time
export interface SimulationFrame {
  time: number
  agvs: AGVAnimationFrame[]
  events: SimEvent[]
}

export interface SimMetrics {
  throughputUPH: number
  avgUtilization: number
  avgEmptyRunRatio: number
  totalDistance: number
  totalTasks: number
  completedTasks: number
  deadlocks: number
  heatmapData: Record<string, number>  // edgeId -> congestion (0-1)
  agvMetrics: {
    agvId: string
    utilization: number
    emptyRunRatio: number
    totalDistance: number
    tasksCompleted: number
  }[]
}

// ============================================
// Simulation Engine
// ============================================

export class SimulationEngine {
  private config: SimConfig
  private agvs: Map<string, SimAGV>
  private tasks: SimTask[]
  private completedTasks: SimTask[]
  private currentTime: number
  private events: SimEvent[]
  private edgeOccupancy: Map<string, string[]>  // edgeId -> AGV IDs currently on it
  private edgeUtilization: Map<string, number>   // edgeId -> total time AGVs spent on it
  private running: boolean

  constructor(config: SimConfig) {
    this.config = config
    this.agvs = new Map()
    this.tasks = []
    this.completedTasks = []
    this.currentTime = 0
    this.events = []
    this.edgeOccupancy = new Map()
    this.edgeUtilization = new Map()
    this.running = false

    // Initialize AGVs
    for (const agvConfig of config.agvs) {
      const startNode = config.routeGraph.nodes.find(n => n.id === agvConfig.startNodeId)
      this.agvs.set(agvConfig.id, {
        id: agvConfig.id,
        type: agvConfig.type,
        maxSpeed: agvConfig.maxSpeed,
        currentSpeed: 0,
        acceleration: agvConfig.acceleration ?? 0.5,
        deceleration: agvConfig.deceleration ?? 0.8,
        position: {
          nodeId: agvConfig.startNodeId,
          x: startNode?.x || 0,
          y: startNode?.y || 0,
          heading: 0,
        },
        state: 'idle',
        currentTask: null,
        completedTasks: 0,
        totalDistance: 0,
        totalEmptyDistance: 0,
        totalTime: 0,
        path: [],
        pathProgress: 0,
      })
    }

    // Initialize edge tracking
    for (const edge of config.routeGraph.edges) {
      this.edgeOccupancy.set(edge.id, [])
      this.edgeUtilization.set(edge.id, 0)
    }
  }

  // Run simulation for a time step
  tick(deltaSimTime: number): void {
    if (!this.running) return
    this.currentTime += deltaSimTime

    // Generate new tasks
    this.generateTasks()

    // Assign tasks to idle AGVs
    this.assignTasks()

    // Move AGVs
    for (const [agvId, agv] of this.agvs) {
      this.moveAGV(agv, deltaSimTime)
    }

    // Check for conflicts (dynamic mode only)
    if (this.config.mode === 'dynamic') {
      this.resolveConflicts()
    }
  }

  // Run full simulation
  run(): SimMetrics {
    this.running = true
    const timeStep = 0.1 // 100ms simulation steps
    const totalSteps = Math.ceil(this.config.durationSeconds / timeStep)

    for (let step = 0; step < totalSteps; step++) {
      this.tick(timeStep)
    }

    this.running = false
    return this.getMetrics()
  }

  private generateTasks(): void {
    for (const gen of this.config.taskGenerators) {
      const interval = 3600 / gen.tasksPerHour // seconds between tasks
      const lastTaskTime = this.tasks
        .filter(t => t.type === 'transport')
        .reduce((max, t) => Math.max(max, t.createdAt), 0)
      
      if (this.currentTime - lastTaskTime >= interval) {
        const pickupNode = gen.pickupNodes[Math.floor(Math.random() * gen.pickupNodes.length)]
        const deliveryNode = gen.deliveryNodes[Math.floor(Math.random() * gen.deliveryNodes.length)]
        
        this.tasks.push({
          id: `task_${this.tasks.length}`,
          type: 'transport',
          pickupNodeId: pickupNode,
          deliveryNodeId: deliveryNode,
          status: 'pending',
          assignedAGVId: null,
          createdAt: this.currentTime,
          startedAt: null,
          completedAt: null,
          dwellTimePickup: gen.dwellTimePickup,
          dwellTimeDelivery: gen.dwellTimeDelivery,
        })
      }
    }
  }

  private assignTasks(): void {
    const pendingTasks = this.tasks.filter(t => t.status === 'pending')
    
    for (const task of pendingTasks) {
      // Find nearest idle AGV
      let bestAGV: SimAGV | null = null
      let bestDistance = Infinity

      for (const [, agv] of this.agvs) {
        if (agv.state !== 'idle') continue
        
        // Simple distance calculation
        const pickupNode = this.config.routeGraph.nodes.find(n => n.id === task.pickupNodeId)
        if (pickupNode) {
          const dx = agv.position.x - pickupNode.x
          const dy = agv.position.y - pickupNode.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < bestDistance) {
            bestDistance = dist
            bestAGV = agv
          }
        }
      }

      if (bestAGV) {
        task.status = 'assigned'
        task.assignedAGVId = bestAGV.id
        task.startedAt = this.currentTime
        bestAGV.currentTask = task
        bestAGV.state = 'moving_to_pickup'
        // In a full implementation, we'd compute the path using A* here
        bestAGV.path = [task.pickupNodeId, task.deliveryNodeId]
      }
    }
  }

  private moveAGV(agv: SimAGV, deltaTime: number): void {
    if (agv.state === 'idle' || agv.path.length === 0) {
      agv.currentSpeed = 0
      return
    }

    // Move along path
    const speed = agv.maxSpeed
    agv.currentSpeed = speed
    const distance = speed * deltaTime
    agv.totalDistance += distance
    agv.totalTime += deltaTime

    // Simplified movement - move towards next node
    const targetNodeId = agv.path[0]
    const targetNode = this.config.routeGraph.nodes.find(n => n.id === targetNodeId)
    
    if (targetNode) {
      const dx = targetNode.x - agv.position.x
      const dy = targetNode.y - agv.position.y
      const distToTarget = Math.sqrt(dx * dx + dy * dy)

      if (distToTarget <= distance) {
        // Arrived at node
        const heading = Math.atan2(dy, dx)
        agv.position = { nodeId: targetNodeId, x: targetNode.x, y: targetNode.y, heading }
        agv.path.shift()

        // Check if this completes a task step
        if (agv.currentTask) {
          if (agv.state === 'moving_to_pickup' && agv.position.nodeId === agv.currentTask.pickupNodeId) {
            agv.state = 'picking_up'
            // Simulate dwell time
            setTimeout(() => {
              if (agv.currentTask) {
                agv.state = 'moving_to_delivery'
              }
            }, agv.currentTask.dwellTimePickup * 1000 / this.config.speedMultiplier)
          } else if (agv.state === 'moving_to_delivery' && agv.position.nodeId === agv.currentTask.deliveryNodeId) {
            agv.state = 'delivering'
            agv.currentTask.status = 'completed'
            agv.currentTask.completedAt = this.currentTime
            this.completedTasks.push(agv.currentTask)
            agv.completedTasks++
            agv.currentTask = null
            agv.state = 'idle'
          }
        }
      } else {
        // Move towards target with heading update
        const ratio = distance / distToTarget
        agv.position.x += dx * ratio
        agv.position.y += dy * ratio
        agv.position.heading = Math.atan2(dy, dx)
      }
    }
  }

  private resolveConflicts(): void {
    // Check mutex zones for conflicts
    for (const [edgeId, agvIds] of this.edgeOccupancy) {
      const edge = this.config.routeGraph.edges.find(e => e.id === edgeId)
      if (edge?.isMutexZone && agvIds.length > 1) {
        // Only allow one AGV in mutex zone
        for (let i = 1; i < agvIds.length; i++) {
          const agv = this.agvs.get(agvIds[i])
          if (agv) {
            agv.state = 'waiting'
            agv.currentSpeed = 0
          }
        }
      }
    }
  }

  getMetrics(): SimMetrics {
    const totalSimTime = this.currentTime || 1
    const agvMetrics = Array.from(this.agvs.values()).map(agv => ({
      agvId: agv.id,
      utilization: agv.totalTime > 0 ? 1 - (agv.totalEmptyDistance / (agv.totalDistance || 1)) : 0,
      emptyRunRatio: agv.totalDistance > 0 ? agv.totalEmptyDistance / agv.totalDistance : 0,
      totalDistance: agv.totalDistance,
      tasksCompleted: agv.completedTasks,
    }))

    const avgUtilization = agvMetrics.reduce((sum, m) => sum + m.utilization, 0) / (agvMetrics.length || 1)
    const avgEmptyRunRatio = agvMetrics.reduce((sum, m) => sum + m.emptyRunRatio, 0) / (agvMetrics.length || 1)

    // Build heatmap data
    const heatmapData: Record<string, number> = {}
    const maxUtilization = Math.max(...Array.from(this.edgeUtilization.values()), 1)
    for (const [edgeId, util] of this.edgeUtilization) {
      heatmapData[edgeId] = util / maxUtilization
    }

    return {
      throughputUPH: (this.completedTasks.length / totalSimTime) * 3600,
      avgUtilization,
      avgEmptyRunRatio,
      totalDistance: Array.from(this.agvs.values()).reduce((sum, a) => sum + a.totalDistance, 0),
      totalTasks: this.tasks.length,
      completedTasks: this.completedTasks.length,
      deadlocks: this.events.filter(e => e.type === 'deadlock').length,
      heatmapData,
      agvMetrics,
    }
  }

  getAGVPositions(): Map<string, SimPosition> {
    const positions = new Map<string, SimPosition>()
    for (const [id, agv] of this.agvs) {
      positions.set(id, { ...agv.position })
    }
    return positions
  }

  /**
   * Get current AGV states as animation frames (for 3D rendering)
   */
  getAGVStates(): AGVAnimationFrame[] {
    return Array.from(this.agvs.values()).map(agv => ({
      agvId: agv.id,
      x: agv.position.x,
      y: agv.position.y,
      heading: agv.position.heading,
      speed: agv.currentSpeed,
      state: agv.state,
      edgeId: agv.position.edgeId ?? null,
      progress: agv.pathProgress,
    }))
  }

  /**
   * Get a full simulation snapshot for a point in time
   */
  getAnimationFrame(): SimulationFrame {
    return {
      time: this.currentTime,
      agvs: this.getAGVStates(),
      events: [...this.events],
    }
  }

  start(): void { this.running = true }
  pause(): void { this.running = false }
  isRunning(): boolean { return this.running }
  getCurrentTime(): number { return this.currentTime }
}
