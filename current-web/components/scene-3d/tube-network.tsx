'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

interface RouteNodeData {
  id: string
  x: number  // world meters
  y: number  // world meters
}

interface RouteEdgeData {
  id: string
  from: string
  to: string
  isMutexZone?: boolean
}

interface TubeNetworkProps {
  nodes: RouteNodeData[]
  edges: RouteEdgeData[]
  tubeRadius?: number
  mutexColor?: string
  normalColor?: string
  glowEffect?: boolean
}

/**
 * Tube Network — Renders route edges as 3D tubes on the ground plane.
 * 
 * Maps 2D route data to 3D:
 *   Node (x, y) → Three.js (x, 0.05, y)  (slightly above ground)
 *   Edge → TubeGeometry connecting two nodes
 * 
 * Mutex zones rendered in warning color (orange/yellow).
 */
export function TubeNetwork({
  nodes,
  edges,
  tubeRadius = 0.08,
  mutexColor = '#f59e0b',
  normalColor = '#3b82f6',
  glowEffect = true,
}: TubeNetworkProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, RouteNodeData>()
    for (const node of nodes) {
      map.set(node.id, node)
    }
    return map
  }, [nodes])

  const tubeGeometries = useMemo(() => {
    return edges.map((edge) => {
      const fromNode = nodeMap.get(edge.from)
      const toNode = nodeMap.get(edge.to)
      if (!fromNode || !toNode) return null

      // Map world (x, y) → Three.js (x, height, z)
      const from = new THREE.Vector3(fromNode.x, 0.05, fromNode.y)
      const to = new THREE.Vector3(toNode.x, 0.05, toNode.y)

      const path = new THREE.LineCurve3(from, to)
      const geometry = new THREE.TubeGeometry(path, 1, tubeRadius, 8, false)

      return {
        id: edge.id,
        geometry,
        isMutex: edge.isMutexZone ?? false,
      }
    }).filter(Boolean) as { id: string; geometry: THREE.TubeGeometry; isMutex: boolean }[]
  }, [nodes, edges, nodeMap, tubeRadius])

  // Node spheres
  const nodeSpheres = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      position: [node.x, 0.15, node.y] as [number, number, number],
    }))
  }, [nodes])

  return (
    <group>
      {/* Route tubes */}
      {tubeGeometries.map((tube) => (
        <group key={tube.id}>
          {/* Main tube */}
          <mesh geometry={tube.geometry}>
            <meshStandardMaterial
              color={tube.isMutex ? mutexColor : normalColor}
              transparent
              opacity={0.7}
              emissive={tube.isMutex ? mutexColor : normalColor}
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Glow effect (wider, more transparent tube) */}
          {glowEffect && (
            <mesh geometry={tube.geometry}>
              <meshBasicMaterial
                color={tube.isMutex ? mutexColor : normalColor}
                transparent
                opacity={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Node markers */}
      {nodeSpheres.map((sphere) => (
        <mesh key={sphere.id} position={sphere.position}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#3b82f6"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Node labels would be added with Html from drei */}
    </group>
  )
}
