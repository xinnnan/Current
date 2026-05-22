'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, GizmoHelper, GizmoViewport, useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import * as THREE from 'three'

interface ModelViewerProps {
  modelUrl?: string | null
  className?: string
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    // Auto-center and scale the model to fit in view
    clone.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(clone)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = maxDim > 0 ? 2 / maxDim : 1

    clone.position.sub(center)
    clone.scale.multiplyScalar(scale)
    clone.position.y -= box.min.y * scale
    return clone
  }, [scene])

  return <primitive object={clonedScene} />
}

function PlaceholderModel() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#94a3b8" wireframe />
    </mesh>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
    </mesh>
  )
}

export function ModelViewer({ modelUrl, className }: ModelViewerProps) {
  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Canvas
        camera={{ position: [3, 3, 3], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: '#e5e7eb' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />

        <Suspense fallback={<LoadingFallback />}>
          {modelUrl ? (
            <GLBModel url={modelUrl} />
          ) : (
            <PlaceholderModel />
          )}
        </Suspense>

        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#d1d5db"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#9ca3af"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          position={[0, -0.01, 0]}
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={1}
          maxDistance={50}
        />

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport labelColor="white" axisHeadScale={1} />
        </GizmoHelper>

        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}
