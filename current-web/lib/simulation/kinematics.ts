/**
 * Kinematics Calculator for AGV Animation
 * 
 * Computes speed profiles and position interpolation for realistic AGV movement.
 * Supports acceleration, deceleration, and turn speed reduction.
 */

// ============================================
// Types
// ============================================

export interface KinematicsConfig {
  maxSpeed: number        // m/s
  acceleration: number    // m/s² (positive)
  deceleration: number    // m/s² (positive)
  turnSpeedFactor: number // 0-1, speed multiplier at tight turns
  minTurnRadius: number   // meters, below this radius the turn speed factor applies
}

export interface SpeedSegment {
  edgeId: string
  fromNodeId: string
  toNodeId: string
  distance: number        // meters
  startSpeed: number      // m/s
  endSpeed: number        // m/s
  cruiseSpeed: number     // m/s (max speed on this segment)
  time: number            // seconds to traverse
  turnAngle: number       // radians, angle change at the END of this segment
}

export interface SpeedProfile {
  segments: SpeedSegment[]
  totalDistance: number
  totalTime: number
}

export interface AnimationFrame {
  x: number
  y: number
  heading: number       // radians
  speed: number         // m/s
  edgeId: string | null
  progress: number      // 0-1 along current edge
  state: string
}

export const DEFAULT_KINEMATICS: KinematicsConfig = {
  maxSpeed: 1.5,
  acceleration: 0.5,
  deceleration: 0.8,
  turnSpeedFactor: 0.4,
  minTurnRadius: 2.0,
}

// ============================================
// Speed Profile Computation
// ============================================

/**
 * Compute a speed profile for a path given route segments and kinematics config.
 */
export function computeSpeedProfile(
  pathNodes: { id: string; x: number; y: number }[],
  pathEdges: { id: string; from: string; to: string; length: number; speedLimit: number }[],
  kinematics: KinematicsConfig = DEFAULT_KINEMATICS
): SpeedProfile {
  const segments: SpeedSegment[] = []
  let totalDistance = 0
  let totalTime = 0

  for (let i = 0; i < pathEdges.length; i++) {
    const edge = pathEdges[i]
    const distance = edge.length
    const speedLimit = Math.min(edge.speedLimit, kinematics.maxSpeed)

    // Calculate turn angle at the end of this segment
    let turnAngle = 0
    if (i < pathEdges.length - 1) {
      const currentFrom = pathNodes[i]
      const currentTo = pathNodes[i + 1]
      const nextTo = pathNodes[i + 2]
      if (currentFrom && currentTo && nextTo) {
        const angle1 = Math.atan2(
          currentTo.y - currentFrom.y,
          currentTo.x - currentFrom.x
        )
        const angle2 = Math.atan2(
          nextTo.y - currentTo.y,
          nextTo.x - currentTo.x
        )
        turnAngle = Math.abs(normalizeAngle(angle2 - angle1))
      }
    }

    // Determine cruise speed (reduce for turns)
    const turnFactor = turnAngle > 0.1
      ? Math.max(kinematics.turnSpeedFactor, 1 - turnAngle / Math.PI)
      : 1.0
    const cruiseSpeed = speedLimit * turnFactor

    // Determine start/end speeds
    const startSpeed = i === 0 ? 0 : Math.min(segments[i - 1].endSpeed, cruiseSpeed)
    const endSpeed = i === pathEdges.length - 1 ? 0 : cruiseSpeed

    // Compute time to traverse this segment with acceleration/deceleration
    const time = computeSegmentTime(
      distance,
      startSpeed,
      endSpeed,
      cruiseSpeed,
      kinematics.acceleration,
      kinematics.deceleration
    )

    const segment: SpeedSegment = {
      edgeId: edge.id,
      fromNodeId: edge.from,
      toNodeId: edge.to,
      distance,
      startSpeed,
      endSpeed,
      cruiseSpeed,
      time,
      turnAngle,
    }

    segments.push(segment)
    totalDistance += distance
    totalTime += time
  }

  return { segments, totalDistance, totalTime }
}

/**
 * Compute time to traverse a segment with trapezoidal speed profile.
 */
function computeSegmentTime(
  distance: number,
  startSpeed: number,
  endSpeed: number,
  cruiseSpeed: number,
  accel: number,
  decel: number
): number {
  // Phase 1: Accelerate from startSpeed to cruiseSpeed
  const accelDist = startSpeed < cruiseSpeed
    ? (cruiseSpeed * cruiseSpeed - startSpeed * startSpeed) / (2 * accel)
    : 0
  const accelTime = startSpeed < cruiseSpeed
    ? (cruiseSpeed - startSpeed) / accel
    : 0

  // Phase 3: Decelerate from cruiseSpeed to endSpeed
  const decelDist = cruiseSpeed > endSpeed
    ? (cruiseSpeed * cruiseSpeed - endSpeed * endSpeed) / (2 * decel)
    : 0
  const decelTime = cruiseSpeed > endSpeed
    ? (cruiseSpeed - endSpeed) / decel
    : 0

  // Phase 2: Cruise at cruiseSpeed
  const cruiseDist = Math.max(0, distance - accelDist - decelDist)
  const cruiseTime = cruiseSpeed > 0 ? cruiseDist / cruiseSpeed : 0

  // If distance is too short for full profile, use triangular profile
  if (accelDist + decelDist > distance) {
    // Simplified: average speed approximation
    const avgSpeed = (startSpeed + endSpeed) / 2
    return avgSpeed > 0 ? distance / avgSpeed : distance / 0.1
  }

  return accelTime + cruiseTime + decelTime
}

// ============================================
// Position Interpolation
// ============================================

/**
 * Interpolate position along a speed profile at a given time.
 */
export function interpolatePosition(
  profile: SpeedProfile,
  time: number,
  pathNodes: { id: string; x: number; y: number }[]
): AnimationFrame {
  if (pathNodes.length < 2 || profile.segments.length === 0) {
    return { x: 0, y: 0, heading: 0, speed: 0, edgeId: null, progress: 0, state: 'idle' }
  }

  // Clamp time
  const t = Math.max(0, Math.min(time, profile.totalTime))

  // Find which segment we're in
  let accumulatedTime = 0
  let segIdx = 0

  for (let i = 0; i < profile.segments.length; i++) {
    if (accumulatedTime + profile.segments[i].time >= t) {
      segIdx = i
      break
    }
    accumulatedTime += profile.segments[i].time
    if (i === profile.segments.length - 1) {
      segIdx = i
    }
  }

  const seg = profile.segments[segIdx]
  const localTime = Math.max(0, t - accumulatedTime)
  const progress = seg.time > 0 ? Math.min(localTime / seg.time, 1) : 1

  // Interpolate position between segment's from/to nodes
  const fromNode = pathNodes[segIdx]
  const toNode = pathNodes[segIdx + 1]

  if (!fromNode || !toNode) {
    return { x: 0, y: 0, heading: 0, speed: 0, edgeId: seg.edgeId, progress, state: 'moving' }
  }

  const x = fromNode.x + (toNode.x - fromNode.x) * progress
  const y = fromNode.y + (toNode.y - fromNode.y) * progress
  const heading = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)

  // Interpolate speed (trapezoidal approximation)
  const speed = seg.startSpeed + (seg.endSpeed - seg.startSpeed) * progress

  return {
    x,
    y,
    heading,
    speed: Math.max(0, speed),
    edgeId: seg.edgeId,
    progress,
    state: 'moving',
  }
}

// ============================================
// Helpers
// ============================================

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}
