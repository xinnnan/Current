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
}

interface AssetModelsProps {
  instances: AssetInstanceData[]
}

/**
 * Single 3D asset instance with auto-scaling and ground alignment.
 */
function AssetModel({ instance }: { instance: AssetInstanceData }) {
  // Load GLB or use placeholder
  const hasModel = instance.modelUrl != null

  if (!hasModel) {
    // Placeholder: colored box
    return (
      <group
        position={[instance.positionX, instance.positionZ || 0.5, instance.positionY]}
        rotation={[0, instance.rotation, 0]}
        scale={instance.scale}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
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
      const scaleFactor = maxDim > 0 ? 1.5 / maxDim : 1

      clone.scale.multiplyScalar(scaleFactor * instance.scale)

      // Recalculate after scaling
      const scaledBox = new THREE.Box3().setFromObject(clone)
      const yOff = -scaledBox.min.y // Align bottom to ground

      return { clonedScene: clone, yOffset: yOff }
    }, [scene, instance.scale])

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
    return (
      <group
        position={[instance.positionX, instance.positionZ || 0.5, instance.positionY]}
        rotation={[0, instance.rotation, 0]}
        scale={instance.scale}
      >
        <mesh castShadow>
          <boxGeometry args={[1, 1, 1]} />
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
