'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

interface GroundPlaneProps {
  width?: number      // meters
  depth?: number      // meters
  baseImageUrl?: string | null
  opacity?: number
  showGrid?: boolean
  gridDivisions?: number
}

/**
 * Ground Plane with optional base map texture.
 * 
 * Renders a flat plane at Y=0 with:
 * - Grid lines for spatial reference
 * - Optional base map image as texture
 * - Shadow receiving
 */
export function GroundPlane({
  width = 60,
  depth = 60,
  baseImageUrl = null,
  opacity = 1,
  showGrid = true,
  gridDivisions = 60,
}: GroundPlaneProps) {
  // Grid helper
  const gridHelper = useMemo(() => {
    if (!showGrid) return null
    const grid = new THREE.GridHelper(
      Math.max(width, depth),
      gridDivisions,
      0x444466,
      0x333344
    )
    grid.position.y = 0.01 // Slightly above ground to prevent z-fighting
    return grid
  }, [width, depth, showGrid, gridDivisions])

  // Base map texture
  const baseMapTexture = useMemo(() => {
    if (!baseImageUrl) return null
    const loader = new THREE.TextureLoader()
    const texture = loader.load(baseImageUrl)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    return texture
  }, [baseImageUrl])

  return (
    <group>
      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[width / 2, 0, depth / 2]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        {baseMapTexture ? (
          <meshStandardMaterial
            map={baseMapTexture}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color="#2a2a3e"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      {/* Grid overlay */}
      {gridHelper && <primitive object={gridHelper} />}

      {/* Boundary lines */}
      <lineSegments
        position={[width / 2, 0.02, depth / 2]}
      >
        <edgesGeometry
          args={[new THREE.BoxGeometry(width, 0, depth)]}
        />
        <lineBasicMaterial color="#4a9eff" opacity={0.3} transparent />
      </lineSegments>
    </group>
  )
}
