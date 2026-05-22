'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

interface WallZone {
  id: string
  points: [number, number][]  // 2D world coordinates (meters)
  height?: number             // Wall height in meters
  color?: string
  opacity?: number
}

interface ExtrudedWallsProps {
  zones: WallZone[]
  defaultHeight?: number
}

/**
 * Extruded Walls — Converts 2D constraint zone polygons into 3D extruded geometry.
 * 
 * Each zone's 2D polygon points (world X, world Y) are mapped to:
 *   Three.js X = world X
 *   Three.js Z = world Y
 *   Three.js Y = extrusion height
 */
export function ExtrudedWalls({
  zones,
  defaultHeight = 3,
}: ExtrudedWallsProps) {
  const wallMeshes = useMemo(() => {
    return zones.map((zone) => {
      const height = zone.height ?? defaultHeight

      // Convert 2D points to Three.js Shape (XZ plane)
      const shape = new THREE.Shape()
      const points = zone.points

      if (points.length < 3) return null

      // Map: world (x, y) → Three.js (x, -y) for shape (2D)
      // Then rotate the extruded geometry to lie on XZ plane
      shape.moveTo(points[0][0], -points[0][1])
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i][0], -points[i][1])
      }
      shape.closePath()

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: height,
        bevelEnabled: false,
      }

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

      // Rotate to lie on XZ plane (extrude along Y axis)
      geometry.rotateX(-Math.PI / 2)

      return {
        id: zone.id,
        geometry,
        color: zone.color ?? '#ef4444',
        opacity: zone.opacity ?? 0.5,
      }
    }).filter(Boolean) as { id: string; geometry: THREE.ExtrudeGeometry; color: string; opacity: number }[]
  }, [zones, defaultHeight])

  return (
    <group>
      {wallMeshes.map((wall) => (
        <mesh
          key={wall.id}
          geometry={wall.geometry}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={wall.color}
            transparent
            opacity={wall.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
