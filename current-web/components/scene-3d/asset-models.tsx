'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

interface AssetInstanceData {
  id: string
  assetId: string
  modelUrl: string | null
  positionX: number  // world meters
  positionY: number  // world meters
  positionZ: number  // height meters
  rotation: number   // radians around Y axis
  scale: number
  /** Physical length in meters (converted from cm) */
  dimensionLength?: number
  /** Physical width in meters (converted from cm) */
  dimensionWidth?: number
  /** Physical height in meters (converted from cm) */
  dimensionHeight?: number
}

interface AssetModelsProps {
  instances: AssetInstanceData[]
}

/**
 * Single 3D asset instance with auto-scaling and ground alignment.
 * When physical dimensions are provided, the model is scaled to match real-world size.
 */
function AssetModel({ instance }: { instance: AssetInstanceData }) {
  // Load GLB or use placeholder
  const hasModel = instance.modelUrl != null

  if (!hasModel) {
    // Placeholder: colored box sized to physical dimensions or default
    const w = instance.dimensionLength ?? 1
    const h = instance.dimensionHeight ?? 1
    const d = instance.dimensionWidth ?? 1

    return (
      <group
        position={[instance.positionX, (instance.positionZ || 0) + h / 2, instance.positionY]}
        rotation={[0, instance.rotation, 0]}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </group>
    )
  }

  return <GLBAssetInstance instance={instance} />
}

function GLBAssetInstance({ instance }: { instance: AssetInstanceData }) {
  try {
    const { scene } = useGLTF(instance.modelUrl!)

    const { clonedScene, yOffset } = useMemo(() => {
      const clone = scene.clone()
      clone.updateMatrixWorld(true)

      // Compute bounding box for auto-grounding
      const box = new THREE.Box3().setFromObject(clone)
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      let scaleFactor: number

      if (instance.dimensionLength && instance.dimensionLength > 0) {
        // Scale model to match physical dimensions
        // Use the largest model dimension to determine scale, then apply to target physical size
        const targetSize = Math.max(
          instance.dimensionLength || 0,
          instance.dimensionHeight || 0,
          instance.dimensionWidth || 0
        )
        scaleFactor = maxDim > 0 ? targetSize / maxDim : 1
      } else {
        // Fallback: normalize to 1.5m default size
        scaleFactor = maxDim > 0 ? 1.5 / maxDim : 1
      }

      scaleFactor *= instance.scale
      clone.scale.multiplyScalar(scaleFactor)

      // Recalculate after scaling
      const scaledBox = new THREE.Box3().setFromObject(clone)
      const yOff = -scaledBox.min.y // Align bottom to ground

      return { clonedScene: clone, yOffset: yOff }
    }, [scene, instance.scale, instance.dimensionLength, instance.dimensionWidth, instance.dimensionHeight])

    return (
      <primitive
        object={clonedScene}
        position={[
          instance.positionX,
          (instance.positionZ || 0) + yOffset,
          instance.positionY,
        ]}
        rotation={[0, instance.rotation, 0]}
      />
    )
  } catch {
    // Fallback to placeholder if GLB fails to load
    const w = instance.dimensionLength ?? 1
    const h = instance.dimensionHeight ?? 1
    const d = instance.dimensionWidth ?? 1

    return (
      <group
        position={[instance.positionX, (instance.positionZ || 0) + h / 2, instance.positionY]}
        rotation={[0, instance.rotation, 0]}
      >
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>
    )
  }
}

/**
 * Asset Models — Renders all asset instances as 3D models in the scene.
 */
export function AssetModels({ instances }: AssetModelsProps) {
  return (
    <group>
      {instances.map((instance) => (
        <AssetModel key={instance.id} instance={instance} />
      ))}
    </group>
  )
}
