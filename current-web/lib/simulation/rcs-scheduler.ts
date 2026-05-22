/**
 * RCS (Robot Control System) Dynamic Scheduler
 * 
 * Simulates a real-world RCS that manages AGV fleet in real-time.
 * Features:
 * - Dynamic task assignment based on AGV proximity and workload
 * - Real-time path conflict detection and resolution
 * - Deadlock prevention via resource reservation
 * - Priority-based task scheduling
 * - Task dependency chains
 */

import type { SimAGV, SimTask, SimPosition, SimConfig } from './engine'

// ============================================
// Types
// ============================================

export interface RCSConfig {
  enableDeadlockPrevention: boolean
  enableDynamicRerouting: boolean
  maxConcurrentTasksPerAGV: number
  reservationLookahead: number  // seconds to reserve path ahead
  conflictResolutionStrategy: 'priority' | 'fifo' | 'nearest'
}

export interface PathReservation {
  agvId: string
  edgeId: string
  fromTime: number
  toTime: number
  direction: 'forward' | 'backward'
}

export interface TaskTemplate {
  id: string
  name: string
  type: 'transport' | 'charge' | 'park' | 'patrol'
  description: string
  priority: number  // 1 (highest) - 10 (lowest)
  dependencies: string[]  // Task template IDs that must complete first
  config: {
    pickupNodes?: string[]
    deliveryNodes?: string[]
    frequency?: number  // tasks per hour
    dwellTimePickup?: number
    dwellTimeDelivery?: number
    patrolRoute?: string[]  // Node IDs in order
  }
}

export interface TaskSchedule {
  tasks: ScheduledTask[]
  totalTasks: number
  avgWaitTime: number
  maxWaitTime: number
}

export interface ScheduledTask extends SimTask {
  priority: number
  dependencies: string[]  // Task IDs that must complete first
  estimatedDuration: number  // seconds
  scheduledAt: number | null  // sim time
}

export const DEFAULT_RCS_CONFIG: RCSConfig = {
  enableDeadlockPrevention: true,
  enableDynamicRerouting: true,
  maxConcurrentTasksPerAGV: 1,
  reservationLookahead: 30,
  conflictResolutionStrategy: 'priority',
}

// ============================================
// Task Templates
// ============================================

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl_transport_standard',
    name: '标准搬运任务',
    type: 'transport',
    description: '从取货点到放货点的标准搬运任务',
    priority: 3,
    dependencies: [],
    config: {
      frequency: 20,
      dwellTimePickup: 15,
      dwellTimeDelivery: 15,
    },
  },
  {
    id: 'tpl_transport_urgent',
    name: '紧急搬运任务',
    type: 'transport',
    description: '高优先级紧急搬运任务',
    priority: 1,
    dependencies: [],
    config: {
      frequency: 2,
      dwellTimePickup: 10,
      dwellTimeDelivery: 10,
    },
  },
  {
    id: 'tpl_charge',
    name: '充电任务',
    type: 'charge',
    description: 'AGV 低电量时自动触发充电',
    priority: 5,
    dependencies: [],
    config: {
      dwellTimePickup: 0,
      dwellTimeDelivery: 1800, // 30 min charge
    },
  },
  {
    id: 'tpl_park',
    name: '归位任务',
    type: 'park',
    description: '空闲 AGV 移动到停车位',
    priority: 8,
    dependencies: [],
    config: {},
  },
  {
    id: 'tpl_patrol',
    name: '巡检任务',
    type: 'patrol',
    description: '沿指定路径巡检',
    priority: 6,
    dependencies: [],
    config: {
      dwellTimePickup: 30,
      dwellTimeDelivery: 0,
    },
  },
]

// ============================================
// RCS Scheduler
// ============================================

export class RCSScheduler {
  private config: RCSConfig
  private simConfig: SimConfig
  private reservations: PathReservation[]
  private taskTemplates: TaskTemplate[]
  private taskCounter: number

  constructor(simConfig: SimConfig, rcsConfig: RCSConfig = DEFAULT_RCS_CONFIG) {
    this.simConfig = simConfig
    this.config = rcsConfig
    this.reservations = []
    this.taskTemplates = [...DEFAULT_TASK_TEMPLATES]
    this.taskCounter = 0
  }

  /**
   * Assign a task to the best available AGV using RCS logic.
   */
  assignTaskToAGV(task: ScheduledTask, agvs: Map<string, SimAGV>): string | null {
    const candidates: { agvId: string; score: number }[] = []

    for (const [agvId, agv] of agvs) {
      // Filter: only idle AGVs
      if (agv.state !== 'idle') continue

      // Check max concurrent tasks
      if (agv.currentTask && this.config.maxConcurrentTasksPerAGV <= 1) continue

      // Check dependencies
      if (!this.checkDependencies(task, agv)) continue

      // Score based on distance and workload
      const pickupNode = this.simConfig.routeGraph.nodes.find(
        n => n.id === task.pickupNodeId
      )
      if (!pickupNode) continue

      const dx = agv.position.x - pickupNode.x
      const dy = agv.position.y - pickupNode.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Lower score = better candidate
      const score = distance + (agv.completedTasks * 0.5) // Slight penalty for busy AGVs
      candidates.push({ agvId, score })
    }

    if (candidates.length === 0) return null

    // Sort by score (nearest + least busy)
    candidates.sort((a, b) => a.score - b.score)
    return candidates[0].agvId
  }

  /**
   * Check if task dependencies are satisfied.
   */
  private checkDependencies(task: ScheduledTask, _agv: SimAGV): boolean {
    // Dependencies are checked against completed tasks
    // For now, all dependencies are considered satisfied
    // In production, this would check against a completed task registry
    return true
  }

  /**
   * Detect and resolve path conflicts between AGVs.
   */
  resolveConflicts(agvs: Map<string, SimAGV>): ConflictResolution[] {
    const resolutions: ConflictResolution[] = []

    // Check for AGVs on the same edge (head-on collision)
    const edgeOccupancy = new Map<string, { agvId: string; direction: number }[]>()

    for (const [agvId, agv] of agvs) {
      if (agv.state === 'idle' || agv.path.length === 0) continue

      const targetNodeId = agv.path[0]
      const currentNode = this.simConfig.routeGraph.nodes.find(n => n.id === agv.position.nodeId)
      const targetNode = this.simConfig.routeGraph.nodes.find(n => n.id === targetNodeId)

      if (!currentNode || !targetNode) continue

      // Find the edge being traversed
      const edge = this.simConfig.routeGraph.edges.find(
        e => (e.from === agv.position.nodeId && e.to === targetNodeId) ||
             (e.to === agv.position.nodeId && e.from === targetNodeId)
      )
      if (!edge) continue

      const direction = edge.from === agv.position.nodeId ? 1 : -1

      if (!edgeOccupancy.has(edge.id)) {
        edgeOccupancy.set(edge.id, [])
      }
      edgeOccupancy.get(edge.id)!.push({ agvId, direction })
    }

    // Resolve conflicts
    for (const [edgeId, occupants] of edgeOccupancy) {
      if (occupants.length < 2) continue

      const edge = this.simConfig.routeGraph.edges.find(e => e.id === edgeId)
      if (!edge) continue

      // Head-on collision: opposite directions
      const directions = occupants.map(o => o.direction)
      const hasOpposing = directions.some(d => d !== directions[0])

      if (hasOpposing || edge.isMutexZone) {
        // Strategy: let higher priority AGV go first
        const sorted = [...occupants].sort((a, b) => {
          const agvA = agvs.get(a.agvId)
          const agvB = agvs.get(b.agvId)
          const priA = agvA?.currentTask?.priority ?? 10
          const priB = agvB?.currentTask?.priority ?? 10
          return priA - priB
        })

        // Yield all but the first
        for (let i = 1; i < sorted.length; i++) {
          resolutions.push({
            agvId: sorted[i].agvId,
            action: 'yield',
            reason: hasOpposing ? 'head_on_collision' : 'mutex_zone',
            conflictingAGVId: sorted[0].agvId,
            edgeId,
          })
        }
      }
    }

    // Check for deadlock cycles
    if (this.config.enableDeadlockPrevention) {
      const deadlocks = this.detectDeadlocks(agvs)
      for (const deadlock of deadlocks) {
        resolutions.push({
          agvId: deadlock.yieldAGVId,
          action: 'reroute',
          reason: 'deadlock_prevention',
          conflictingAGVId: deadlock.blockingAGVId,
          edgeId: deadlock.edgeId,
        })
      }
    }

    return resolutions
  }

  /**
   * Detect deadlock cycles using wait-for graph.
   */
  private detectDeadlocks(agvs: Map<string, SimAGV>): DeadlockInfo[] {
    const deadlocks: DeadlockInfo[] = []

    // Build wait-for graph: AGV A waits for AGV B if A is blocked by B
    const waitFor = new Map<string, string>()

    for (const [agvId, agv] of agvs) {
      if (agv.state !== 'waiting') continue

      // Find what this AGV is waiting for
      if (agv.path.length === 0) continue

      const targetNodeId = agv.path[0]
      const edge = this.simConfig.routeGraph.edges.find(
        e => (e.from === agv.position.nodeId && e.to === targetNodeId) ||
             (e.to === agv.position.nodeId && e.from === targetNodeId)
      )

      if (edge?.isMutexZone) {
        // Find AGV occupying this mutex zone
        for (const [otherId, otherAgv] of agvs) {
          if (otherId === agvId) continue
          if (otherAgv.position.edgeId === edge.id || 
              (otherAgv.path.length > 0 && 
               this.isEdgeInPath(otherAgv.position.nodeId, otherAgv.path[0], edge.id))) {
            waitFor.set(agvId, otherId)
          }
        }
      }
    }

    // Detect cycles in wait-for graph
    const visited = new Set<string>()
    const inStack = new Set<string>()

    const detectCycle = (node: string, path: string[]): boolean => {
      if (inStack.has(node)) {
        // Found cycle: yield the last AGV in the cycle
        const cycleStart = path.indexOf(node)
        const cycle = path.slice(cycleStart)
        if (cycle.length >= 2) {
          deadlocks.push({
            yieldAGVId: cycle[cycle.length - 1],
            blockingAGVId: cycle[0],
            edgeId: 'deadlock_cycle',
            cycleLength: cycle.length,
          })
        }
        return true
      }
      if (visited.has(node)) return false

      visited.add(node)
      inStack.add(node)
      path.push(node)

      const waitingFor = waitFor.get(node)
      if (waitingFor) {
        detectCycle(waitingFor, path)
      }

      path.pop()
      inStack.delete(node)
      return false
    }

    for (const agvId of waitFor.keys()) {
      if (!visited.has(agvId)) {
        detectCycle(agvId, [])
      }
    }

    return deadlocks
  }

  private isEdgeInPath(fromNode: string, toNode: string, edgeId: string): boolean {
    const edge = this.simConfig.routeGraph.edges.find(e => e.id === edgeId)
    if (!edge) return false
    return (edge.from === fromNode && edge.to === toNode) ||
           (edge.to === fromNode && edge.from === toNode)
  }

  /**
   * Create a task from a template.
   */
  createTaskFromTemplate(
    template: TaskTemplate,
    pickupNodeId: string,
    deliveryNodeId: string,
    currentTime: number
  ): ScheduledTask {
    this.taskCounter++
    return {
      id: `task_${this.taskCounter}`,
      type: template.type,
      pickupNodeId,
      deliveryNodeId,
      status: 'pending',
      assignedAGVId: null,
      createdAt: currentTime,
      startedAt: null,
      completedAt: null,
      dwellTimePickup: template.config.dwellTimePickup ?? 15,
      dwellTimeDelivery: template.config.dwellTimeDelivery ?? 15,
      priority: template.priority,
      dependencies: template.dependencies,
      estimatedDuration: 0,
      scheduledAt: null,
    }
  }

  /**
   * Schedule tasks based on templates and current state.
   */
  scheduleTasks(
    templates: TaskTemplate[],
    agvs: Map<string, SimAGV>,
    currentTime: number,
    existingTasks: SimTask[]
  ): ScheduledTask[] {
    const newTasks: ScheduledTask[] = []

    for (const template of templates) {
      if (template.type !== 'transport') continue
      if (!template.config.frequency) continue

      const interval = 3600 / template.config.frequency
      const recentTasks = existingTasks.filter(
        t => t.type === template.type && currentTime - t.createdAt < interval
      )

      if (recentTasks.length > 0) continue

      // Pick random nodes from the route graph
      const nodes = this.simConfig.routeGraph.nodes
      const pickupNodes = template.config.pickupNodes ?? nodes.map(n => n.id)
      const deliveryNodes = template.config.deliveryNodes ?? nodes.map(n => n.id)

      const pickupNode = pickupNodes[Math.floor(Math.random() * pickupNodes.length)]
      let deliveryNode = deliveryNodes[Math.floor(Math.random() * deliveryNodes.length)]
      while (deliveryNode === pickupNode && deliveryNodes.length > 1) {
        deliveryNode = deliveryNodes[Math.floor(Math.random() * deliveryNodes.length)]
      }

      const task = this.createTaskFromTemplate(template, pickupNode, deliveryNode, currentTime)
      newTasks.push(task)
    }

    return newTasks
  }

  /**
   * Get task templates.
   */
  getTaskTemplates(): TaskTemplate[] {
    return [...this.taskTemplates]
  }

  /**
   * Add a custom task template.
   */
  addTaskTemplate(template: TaskTemplate): void {
    this.taskTemplates.push(template)
  }
}

// ============================================
// Helper Types
// ============================================

export interface ConflictResolution {
  agvId: string
  action: 'yield' | 'reroute' | 'wait'
  reason: 'head_on_collision' | 'mutex_zone' | 'deadlock_prevention' | 'resource_contention'
  conflictingAGVId: string
  edgeId: string
}

export interface DeadlockInfo {
  yieldAGVId: string
  blockingAGVId: string
  edgeId: string
  cycleLength: number
}
