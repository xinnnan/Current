/**
 * A* Pathfinding Algorithm for AGV Route Planning
 * 
 * Supports weighted edges (speed limits), one-way restrictions,
 * and mutex zone avoidance.
 */

export interface GraphNode {
  id: string
  x: number
  y: number
  type: 'waypoint' | 'station' | 'charger' | 'parking' | 'intersection'
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  length: number       // meters
  speedLimit: number   // m/s
  direction: 'forward' | 'backward' | 'bidirectional'
  isMutexZone: boolean
  maxAGVs: number
  priority: number
}

export interface RouteGraph {
  nodes: Map<string, GraphNode>
  edges: Map<string, GraphEdge[]>
  adjacency: Map<string, { neighborId: string; edgeId: string }[]>
}

export interface PathResult {
  path: string[]          // Node IDs in order
  edges: string[]         // Edge IDs in order
  totalDistance: number    // meters
  totalTime: number       // seconds
  segments: PathSegment[]
}

export interface PathSegment {
  fromNode: string
  toNode: string
  edgeId: string
  distance: number
  time: number
  speedLimit: number
}

// Build adjacency list from nodes and edges
export function buildRouteGraph(nodes: GraphNode[], edges: GraphEdge[]): RouteGraph {
  const nodeMap = new Map<string, GraphNode>()
  const edgeMap = new Map<string, GraphEdge[]>()
  const adjacency = new Map<string, { neighborId: string; edgeId: string }[]>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    adjacency.set(node.id, [])
    edgeMap.set(node.id, [])
  }

  for (const edge of edges) {
    // Forward direction
    if (edge.direction !== 'backward') {
      adjacency.get(edge.from)?.push({ neighborId: edge.to, edgeId: edge.id })
      edgeMap.get(edge.from)?.push(edge)
    }
    // Backward direction
    if (edge.direction !== 'forward') {
      adjacency.get(edge.to)?.push({ neighborId: edge.from, edgeId: edge.id })
      edgeMap.get(edge.to)?.push(edge)
    }
  }

  return { nodes: nodeMap, edges: edgeMap, adjacency }
}

// Heuristic: Euclidean distance between two nodes
function heuristic(a: GraphNode, b: GraphNode): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// A* pathfinding with time-based cost (considers speed limits)
export function findPath(
  graph: RouteGraph,
  startNodeId: string,
  endNodeId: string,
  options: {
    costMode?: 'distance' | 'time'  // Optimize for shortest distance or fastest time
    avoidMutexZones?: boolean
  } = {}
): PathResult | null {
  const { costMode = 'time', avoidMutexZones = false } = options

  const startNode = graph.nodes.get(startNodeId)
  const endNode = graph.nodes.get(endNodeId)
  if (!startNode || !endNode) return null

  // Priority queue (min-heap by cost)
  const openSet = new Map<string, { cost: number; heuristic: number }>()
  const cameFrom = new Map<string, { nodeId: string; edgeId: string }>()
  const gScore = new Map<string, number>()
  const fScore = new Map<string, number>()

  gScore.set(startNodeId, 0)
  const h = heuristic(startNode, endNode)
  fScore.set(startNodeId, h)
  openSet.set(startNodeId, { cost: 0, heuristic: h })

  const closedSet = new Set<string>()

  while (openSet.size > 0) {
    // Find node with lowest fScore in openSet
    let currentId = ''
    let lowestF = Infinity
    for (const [nodeId, { heuristic: nodeH }] of openSet) {
      const f = gScore.get(nodeId)! + nodeH
      if (f < lowestF) {
        lowestF = f
        currentId = nodeId
      }
    }

    if (currentId === endNodeId) {
      // Reconstruct path
      return reconstructPath(graph, cameFrom, currentId, startNodeId)
    }

    openSet.delete(currentId)
    closedSet.add(currentId)

    const neighbors = graph.adjacency.get(currentId) || []
    for (const { neighborId, edgeId } of neighbors) {
      if (closedSet.has(neighborId)) continue

      const edge = graph.edges.get(currentId)?.find(e => e.id === edgeId)
      if (!edge) continue

      // Skip mutex zones if configured
      if (avoidMutexZones && edge.isMutexZone) continue

      // Calculate cost
      const edgeCost = costMode === 'time'
        ? edge.length / edge.speedLimit  // Time in seconds
        : edge.length                     // Distance in meters

      // Priority penalty for low-priority edges
      const priorityPenalty = edge.priority > 0 ? edge.priority * 0.1 : 0

      const tentativeG = (gScore.get(currentId) || 0) + edgeCost + priorityPenalty

      if (tentativeG < (gScore.get(neighborId) || Infinity)) {
        cameFrom.set(neighborId, { nodeId: currentId, edgeId })
        gScore.set(neighborId, tentativeG)

        const neighborNode = graph.nodes.get(neighborId)!
        const newH = heuristic(neighborNode, endNode)
        fScore.set(neighborId, tentativeG + newH)

        if (!openSet.has(neighborId)) {
          openSet.set(neighborId, { cost: tentativeG, heuristic: newH })
        }
      }
    }
  }

  return null // No path found
}

// Reconstruct path from cameFrom map
function reconstructPath(
  graph: RouteGraph,
  cameFrom: Map<string, { nodeId: string; edgeId: string }>,
  endId: string,
  startId: string
): PathResult {
  const path: string[] = [endId]
  const edgePath: string[] = []
  let current = endId

  while (cameFrom.has(current)) {
    const { nodeId, edgeId } = cameFrom.get(current)!
    path.unshift(nodeId)
    edgePath.unshift(edgeId)
    current = nodeId
  }

  // Build segments
  const segments: PathSegment[] = []
  let totalDistance = 0
  let totalTime = 0

  for (let i = 0; i < edgePath.length; i++) {
    const edge = graph.edges.get(path[i])?.find(e => e.id === edgePath[i])
    if (edge) {
      const distance = edge.length
      const time = distance / edge.speedLimit
      totalDistance += distance
      totalTime += time
      segments.push({
        fromNode: path[i],
        toNode: path[i + 1],
        edgeId: edgePath[i],
        distance,
        time,
        speedLimit: edge.speedLimit,
      })
    }
  }

  return { path, edges: edgePath, totalDistance, totalTime, segments }
}

// Find K shortest paths using Yen's algorithm (simplified)
export function findKShortestPaths(
  graph: RouteGraph,
  startNodeId: string,
  endNodeId: string,
  k: number = 3
): PathResult[] {
  const paths: PathResult[] = []
  
  // Find the shortest path first
  const shortest = findPath(graph, startNodeId, endNodeId)
  if (!shortest) return paths
  
  paths.push(shortest)

  // For MVP, just find alternative paths by avoiding edges from the shortest path
  for (let i = 1; i < k && i < shortest.edges.length; i++) {
    // Create a modified graph that avoids the i-th edge
    const edgeToAvoid = shortest.edges[i]
    const modifiedEdges: GraphEdge[] = []
    
    for (const [, edgeList] of graph.edges) {
      for (const edge of edgeList) {
        if (edge.id !== edgeToAvoid) {
          modifiedEdges.push(edge)
        }
      }
    }

    const allNodes = Array.from(graph.nodes.values())
    const altGraph = buildRouteGraph(allNodes, modifiedEdges)
    const altPath = findPath(altGraph, startNodeId, endNodeId)
    
    if (altPath && !paths.some(p => 
      p.path.length === altPath.path.length && 
      p.path.every((n, idx) => n === altPath.path[idx])
    )) {
      paths.push(altPath)
    }
  }

  return paths.sort((a, b) => a.totalTime - b.totalTime)
}
