/**
 * Throughput Calculator — Pure calculation module for logistics throughput estimation.
 *
 * Computes theoretical system throughput based on task chains, AGV fleet,
 * station capacities, and inter-node distances. No simulation run required.
 */

// ============================================
// Core Types
// ============================================

export interface TaskChainStep {
  nodeId: string
  nodeType: 'loading_port' | 'unloading_port' | 'workstation'
  processingTimeSeconds: number // station processing time
}

export interface TaskChain {
  id: string
  name: string
  steps: TaskChainStep[] // ordered step list
}

export interface ThroughputInput {
  taskChains: TaskChain[]
  agvCount: number
  agvSpeedMs: number // m/s
  distances: Map<string, number> // "nodeA|nodeB" → distance in meters
  stationThroughput: Map<string, number> // nodeId → items/hour
}

export interface ThroughputResult {
  systemThroughput: number // items/hour
  bottleneckStation: { nodeId: string; name: string; throughput: number } | null
  avgTaskCycleTime: number // seconds
  agvUtilization: number // 0-1
  stationUtilization: Map<string, number> // nodeId → 0-1
  recommendations: string[]
  perChainResult: PerChainResult[]
}

export interface PerChainResult {
  chainId: string
  chainName: string
  cycleTimeSeconds: number
  theoreticalThroughput: number // single AGV items/hour
  transportTimeSeconds: number
  processingTimeSeconds: number
  emptyRunTimeSeconds: number
}

// ============================================
// Helpers
// ============================================

/** Build a bidirectional distance key */
function distKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Get distance between two nodes, fallback to Euclidean estimate */
function getDistance(
  distances: Map<string, number>,
  nodeA: string,
  nodeB: string,
): number {
  const key = distKey(nodeA, nodeB)
  return distances.get(key) ?? 10 // default 10m if unknown
}

// ============================================
// Core Calculation
// ============================================

export function calculateThroughput(input: ThroughputInput): ThroughputResult {
  const { taskChains, agvCount, agvSpeedMs, distances, stationThroughput } = input
  const recommendations: string[] = []

  if (taskChains.length === 0 || agvCount === 0) {
    return {
      systemThroughput: 0,
      bottleneckStation: null,
      avgTaskCycleTime: 0,
      agvUtilization: 0,
      stationUtilization: new Map(),
      recommendations: ['请至少定义一条任务链并配置 AGV 数量'],
      perChainResult: [],
    }
  }

  // --- Per-chain analysis ---
  const perChainResult: PerChainResult[] = []
  let totalCycleTime = 0

  for (const chain of taskChains) {
    let transportTime = 0
    let processingTime = 0

    // Sum processing times at each station
    for (const step of chain.steps) {
      processingTime += step.processingTimeSeconds
    }

    // Sum transport times between consecutive steps
    for (let i = 0; i < chain.steps.length - 1; i++) {
      const from = chain.steps[i].nodeId
      const to = chain.steps[i + 1].nodeId
      const dist = getDistance(distances, from, to)
      transportTime += dist / agvSpeedMs
    }

    // Estimate empty run time: average return distance from last station to first
    // Approximate as 50% of total transport time (heuristic)
    const emptyRunTime = transportTime * 0.5

    const cycleTime = transportTime + processingTime + emptyRunTime
    const theoreticalThroughput = cycleTime > 0 ? 3600 / cycleTime : 0

    perChainResult.push({
      chainId: chain.id,
      chainName: chain.name,
      cycleTimeSeconds: cycleTime,
      theoreticalThroughput,
      transportTimeSeconds: transportTime,
      processingTimeSeconds: processingTime,
      emptyRunTimeSeconds: emptyRunTime,
    })

    totalCycleTime += cycleTime
  }

  const avgTaskCycleTime = totalCycleTime / taskChains.length

  // --- AGV capacity ---
  const singleAGVThroughput = avgTaskCycleTime > 0 ? 3600 / avgTaskCycleTime : 0
  const agvFleetThroughput = singleAGVThroughput * agvCount

  // --- Station bottleneck analysis ---
  // Count how many times each station is visited per hour across all chains
  const stationDemand = new Map<string, number>() // nodeId → visits/hour
  for (const chain of taskChains) {
    const chainResult = perChainResult.find(r => r.chainId === chain.id)
    const chainThroughput = chainResult?.theoreticalThroughput ?? 0

    for (const step of chain.steps) {
      const prev = stationDemand.get(step.nodeId) ?? 0
      stationDemand.set(step.nodeId, prev + chainThroughput)
    }
  }

  // Compute station utilization and find bottleneck
  const stationUtilization = new Map<string, number>()
  let bottleneckStation: ThroughputResult['bottleneckStation'] = null
  let minStationThroughput = Infinity

  for (const [nodeId, demand] of stationDemand) {
    const capacity = stationThroughput.get(nodeId) ?? 120 // default 120 items/hour
    const utilization = Math.min(demand / capacity, 1)
    stationUtilization.set(nodeId, utilization)

    if (capacity < minStationThroughput) {
      minStationThroughput = capacity
      bottleneckStation = {
        nodeId,
        name: nodeId, // will be enriched by caller if needed
        throughput: capacity,
      }
    }
  }

  // --- System throughput = min(AGV fleet capacity, min station capacity) ---
  const effectiveStationCapacity = minStationThroughput < Infinity ? minStationThroughput : agvFleetThroughput
  const systemThroughput = Math.min(agvFleetThroughput, effectiveStationCapacity)

  // --- AGV utilization ---
  const agvUtilization = agvFleetThroughput > 0
    ? Math.min(systemThroughput / agvFleetThroughput, 1)
    : 0

  // --- Recommendations ---
  if (bottleneckStation && systemThroughput < agvFleetThroughput) {
    recommendations.push(
      `瓶颈站点 ${bottleneckStation.nodeId} 限制了系统吞吐量（${bottleneckStation.throughput.toFixed(0)} items/h）。考虑增加站点处理能力或并行工位。`,
    )
  }

  if (agvUtilization > 0.9) {
    recommendations.push(
      `AGV 利用率 ${(agvUtilization * 100).toFixed(0)}% 过高，建议增加 AGV 数量以避免排队。`,
    )
  } else if (agvUtilization < 0.5 && agvCount > 1) {
    recommendations.push(
      `AGV 利用率仅 ${(agvUtilization * 100).toFixed(0)}%，可考虑减少 AGV 数量以降低成本。`,
    )
  }

  // Check for high station utilization
  for (const [nodeId, util] of stationUtilization) {
    if (util > 0.9) {
      recommendations.push(
        `站点 ${nodeId} 利用率 ${(util * 100).toFixed(0)}% 过高，存在排队风险。`,
      )
    }
  }

  // Check empty run ratio
  const avgEmptyRun = perChainResult.reduce((s, r) => s + r.emptyRunTimeSeconds, 0) / perChainResult.length
  const avgTotal = perChainResult.reduce((s, r) => s + r.cycleTimeSeconds, 0) / perChainResult.length
  if (avgTotal > 0 && avgEmptyRun / avgTotal > 0.3) {
    recommendations.push(
      '空跑时间占比超过 30%，建议优化站点布局以缩短回程距离。',
    )
  }

  if (recommendations.length === 0) {
    recommendations.push('系统配置合理，AGV 运力与站点处理能力匹配良好。')
  }

  return {
    systemThroughput,
    bottleneckStation,
    avgTaskCycleTime,
    agvUtilization,
    stationUtilization,
    recommendations,
    perChainResult,
  }
}
