'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AGVAnimationFrame } from '@/lib/simulation/engine'

interface AGVAnimatorProps {
  agvStates: AGVAnimationFrame[]
  agvModels?: Record<string, string>  // agvType → GLB URL
}

const AGV_COLORS: Record<string, string> = {
  idle: '#22c55e',
  moving_to_pickup: '#3b82f6',
  picking_up: '#f59e0b',
  moving_to_delivery: '#8b5cf6',
  delivering: '#f59e0b',
  charging: '#06b6d4',
  waiting: '#ef4444',
  deadlocked: '#dc2626',
}

/**
 * AGV Animator — Renders AGVs as animated 3D objects.
 * 
 * Each AGV is represented as a colored box (placeholder) that moves
 * along its path with smooth position and rotation interpolation.
 */
export function AGVAnimator({ agvStates, agvModels }: AGVAnimatorProps) {
  return (
    <group>
      {agvStates.map((agv) => (
        <AGVUnit key={agv.agvId} state={agv} models={agvModels} />
      ))}
    </group>
  )
}

function AGVUnit({
  state,
  models,
}: {
  state: AGVAnimationFrame
  models?: Record<string, string>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetRef = useRef(new THREE.Vector3())
  const currentPosRef = useRef(new THREE.Vector3(state.x, 0.3, state.y))
  const currentRotRef = useRef(0)

  // AGV body dimensions (placeholder)
  const agvSize = useMemo(() => ({ w: 1.2, h: 0.4, d: 0.8 }), [])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Target position in Three.js coordinates
    const target = targetRef.current
    target.set(state.x, 0.3, state.y)

    // Smooth position interpolation (lerp)
    const current = currentPosRef.current
    const lerpFactor = Math.min(delta * 5, 1) // Smooth but responsive
    current.lerp(target, lerpFactor)
    meshRef.current.position.copy(current)

    // Smooth rotation interpolation (slerp-like for Y axis)
    const targetRotY = -(state.heading - Math.PI / 2) // Convert heading to Three.js Y rotation
    const currentRot = currentRotRef.current
    const rotDiff = targetRotY - currentRot
    // Normalize to [-π, π]
    const normalizedDiff = Math.atan2(Math.sin(rotDiff), Math.cos(rotDiff))
    currentRotRef.current += normalizedDiff * Math.min(delta * 8, 1)
    meshRef.current.rotation.y = currentRotRef.current
  })

  const color = AGV_COLORS[state.state] ?? '#64748b'

  return (
    <group>
      {/* AGV body */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[agvSize.w, agvSize.h, agvSize.d]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* AGV top indicator light */}
      <mesh position={[0, agvSize.h / 2 + 0.1, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Speed indicator (elongated when moving fast) */}
      {state.speed > 0.1 && (
        <mesh position={[0, 0.05, -agvSize.d / 2 - 0.1]}>
          <boxGeometry args={[agvSize.w * 0.6, 0.02, 0.3]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}
    </group>
  )
}
