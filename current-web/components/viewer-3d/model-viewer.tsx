'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, GizmoHelper, GizmoViewport, useGLTF, Html, Line } from '@react-three/drei'
import { Suspense, useMemo, useState, useCallback } from 'react'
import * as THREE from 'three'

export interface Dimensions {
  length?: number // cm
  width?: number  // cm
  height?: number // cm
}

interface ModelViewerProps {
  modelUrl?: string | null
  className?: string
  /** Real-world dimensions in cm — enables bounding-box annotation lines */
  dimensions?: Dimensions
  /** Whether to show dimension annotation lines (default: false) */
  showDimensions?: boolean
}

// ── Dimension annotation lines + labels ──
function DimensionAnnotations({
  boxSize,
  dimensions,
}: {
  boxSize: THREE.Vector3
  dimensions: Dimensions
}) {
  const halfX = boxSize.x / 2
  const halfZ = boxSize.z / 2
  const h = boxSize.y
  const offset = 0.25

  const lengthCm = dimensions.length
  const widthCm = dimensions.width
  const heightCm = dimensions.height

  const fmt = (cm: number | undefined): string => {
    if (cm == null) return '—'
    if (cm >= 100) return `${(cm / 100).toFixed(2)} m`
    return `${cm.toFixed(1)} cm`
  }

  const labelStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    color: '#374151',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    userSelect: 'none',
  }

  const lineColor = '#6366f1'
  const lineWidth = 2
  const tickSize = 0.06

  return (
    <group>
      {/* Length line (along X axis, bottom-front) */}
      <Line
        points={[[-halfX, -offset, -halfZ - offset], [halfX, -offset, -halfZ - offset]]}
        color={lineColor}
        lineWidth={lineWidth}
      />
      {/* Length ticks */}
      <Line points={[[-halfX, -offset - tickSize, -halfZ - offset], [-halfX, -offset + tickSize, -halfZ - offset]]} color={lineColor} lineWidth={1} />
      <Line points={[[halfX, -offset - tickSize, -halfZ - offset], [halfX, -offset + tickSize, -halfZ - offset]]} color={lineColor} lineWidth={1} />
      <Html position={[0, -offset, -halfZ - offset]} center style={labelStyle} prepend>
        {fmt(lengthCm)}
      </Html>

      {/* Width line (along Z axis, bottom-right) */}
      <Line
        points={[[halfX + offset, -offset, -halfZ], [halfX + offset, -offset, halfZ]]}
        color={lineColor}
        lineWidth={lineWidth}
      />
      {/* Width ticks */}
      <Line points={[[halfX + offset, -offset - tickSize, -halfZ], [halfX + offset, -offset + tickSize, -halfZ]]} color={lineColor} lineWidth={1} />
      <Line points={[[halfX + offset, -offset - tickSize, halfZ], [halfX + offset, -offset + tickSize, halfZ]]} color={lineColor} lineWidth={1} />
      <Html position={[halfX + offset, -offset, 0]} center style={labelStyle} prepend>
        {fmt(widthCm)}
      </Html>

      {/* Height line (along Y axis, front-right) */}
      <Line
        points={[[halfX + offset, 0, -halfZ - offset], [halfX + offset, h, -halfZ - offset]]}
        color={lineColor}
        lineWidth={lineWidth}
      />
      {/* Height ticks */}
      <Line points={[[halfX + offset - tickSize, 0, -halfZ - offset], [halfX + offset + tickSize, 0, -halfZ - offset]]} color={lineColor} lineWidth={1} />
      <Line points={[[halfX + offset - tickSize, h, -halfZ - offset], [halfX + offset + tickSize, h, -halfZ - offset]]} color={lineColor} lineWidth={1} />
      <Html position={[halfX + offset, h / 2, -halfZ - offset]} center style={labelStyle} prepend>
        {fmt(heightCm)}
      </Html>
    </group>
  )
}

// ── GLB Model loader with bounding box callback ──
function GLBModel({
  url,
  onBoundingBox,
}: {
  url: string
  onBoundingBox?: (size: THREE.Vector3) => void
}) {
  const { scene } = useGLTF(url)

  const onBoundingBoxRef = useCallback(onBoundingBox!, [onBoundingBox])

  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(clone)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = maxDim > 0 ? 2 / maxDim : 1

    clone.position.sub(center)
    clone.scale.multiplyScalar(scale)
    clone.position.y -= box.min.y * scale

    // Report scaled bounding box size
    const scaledBox = new THREE.Box3().setFromObject(clone)
    const scaledSize = scaledBox.getSize(new THREE.Vector3())
    onBoundingBoxRef(scaledSize)

    return clone
  }, [scene, onBoundingBoxRef])

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

export function ModelViewer({ modelUrl, className, dimensions, showDimensions = false }: ModelViewerProps) {
  const [boxSize, setBoxSize] = useState<THREE.Vector3>(new THREE.Vector3(1, 1, 1))

  const handleBoundingBox = useCallback((size: THREE.Vector3) => {
    setBoxSize(size.clone())
  }, [])

  const hasDimensions = dimensions && (dimensions.length || dimensions.width || dimensions.height)

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
            <GLBModel url={modelUrl} onBoundingBox={handleBoundingBox} />
          ) : (
            <PlaceholderModel />
          )}
        </Suspense>

        {/* Dimension annotations */}
        {showDimensions && hasDimensions && (
          <DimensionAnnotations boxSize={boxSize} dimensions={dimensions} />
        )}

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

      {/* Grid unit badge */}
      {showDimensions && (
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/80 rounded text-[10px] text-gray-500 pointer-events-none select-none">
          Grid: 0.5 m
        </div>
      )}
    </div>
  )
}
