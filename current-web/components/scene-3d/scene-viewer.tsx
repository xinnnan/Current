'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { Suspense, ReactNode } from 'react'

interface SceneViewerProps {
  children: ReactNode
  className?: string
  cameraPosition?: [number, number, number]
  cameraTarget?: [number, number, number]
  onCreated?: () => void
}

function SceneFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#94a3b8" wireframe />
    </mesh>
  )
}

/**
 * 3D Scene Viewer — Main entry point for the 3D rendering pipeline.
 * 
 * Coordinate system:
 *   X = World X (meters)
 *   Y = Height (meters, up)
 *   Z = World Y (meters, from 2D map)
 * 
 * Camera defaults to perspective view looking down at origin.
 */
export function SceneViewer({
  children,
  className,
  cameraPosition = [25, 30, 40],
  cameraTarget = [15, 0, 15],
}: SceneViewerProps) {
  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Canvas
        camera={{
          position: cameraPosition,
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: false }}
        shadows
        style={{ background: '#1a1a2e' }}
        onCreated={({ camera }) => {
          camera.lookAt(...cameraTarget)
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[50, 80, 50]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />
        <directionalLight position={[-20, 30, -20]} intensity={0.2} />
        <hemisphereLight
          color="#b1e1ff"
          groundColor="#b97a20"
          intensity={0.3}
        />

        {/* Scene content */}
        <Suspense fallback={<SceneFallback />}>
          {children}
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={5}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below ground
          minPolarAngle={0.1}
          target={cameraTarget}
        />

        {/* Axis helper */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport labelColor="white" axisHeadScale={1} />
        </GizmoHelper>

        {/* Environment for reflections */}
        <Environment preset="city" background={false} />
      </Canvas>
    </div>
  )
}
