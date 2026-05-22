/**
 * Coordinate System Utilities for Current
 * 
 * Unified coordinate conversion between three spaces:
 * - Canvas (pixels): Fabric.js 2D canvas coordinates
 * - World (meters): Physical space coordinates (the source of truth)
 * - Three.js (3D): React Three Fiber scene coordinates
 * 
 * Mapping rules:
 *   Canvas X (px) ÷ ppm → World X (m) → Three.js X
 *   Canvas Y (px) ÷ ppm → World Y (m) → Three.js Z  (Y→Z mapping)
 *   Constant 0           → Height (m)  → Three.js Y  (Y axis = up)
 */

import type { MapCalibration } from '@/lib/types'

// ============================================
// Types
// ============================================

export interface Point2D {
  x: number
  y: number
}

export interface Point3D {
  x: number  // Three.js X = World X
  y: number  // Three.js Y = Height (up)
  z: number  // Three.js Z = World Y
}

export interface CalibrationData {
  pixelsPerMeter: number
  offsetX: number  // Canvas origin X in pixels
  offsetY: number  // Canvas origin Y in pixels
}

// ============================================
// Calibration helpers
// ============================================

/**
 * Build calibration data from MapCalibration
 */
export function buildCalibration(cal: MapCalibration): CalibrationData {
  const dx = cal.point_b[0] - cal.point_a[0]
  const dy = cal.point_b[1] - cal.point_a[1]
  const pixelDist = Math.sqrt(dx * dx + dy * dy)
  const ppm = cal.real_distance_m > 0 ? pixelDist / cal.real_distance_m : 1

  return {
    pixelsPerMeter: ppm,
    offsetX: 0,
    offsetY: 0,
  }
}

/**
 * Create a default calibration (1:1 pixel-to-meter)
 */
export function defaultCalibration(ppm: number = 50): CalibrationData {
  return { pixelsPerMeter: ppm, offsetX: 0, offsetY: 0 }
}

// ============================================
// Canvas ↔ World conversions
// ============================================

/**
 * Convert canvas pixel coordinates to world meters
 */
export function canvasToWorld(
  canvasX: number,
  canvasY: number,
  cal: CalibrationData
): Point2D {
  return {
    x: (canvasX - cal.offsetX) / cal.pixelsPerMeter,
    y: (canvasY - cal.offsetY) / cal.pixelsPerMeter,
  }
}

/**
 * Convert world meters to canvas pixel coordinates
 */
export function worldToCanvas(
  worldX: number,
  worldY: number,
  cal: CalibrationData
): Point2D {
  return {
    x: worldX * cal.pixelsPerMeter + cal.offsetX,
    y: worldY * cal.pixelsPerMeter + cal.offsetY,
  }
}

/**
 * Convert canvas pixel distance to world meters
 */
export function canvasDistanceToWorld(pixelDist: number, cal: CalibrationData): number {
  return pixelDist / cal.pixelsPerMeter
}

/**
 * Convert world meter distance to canvas pixels
 */
export function worldDistanceToCanvas(worldDist: number, cal: CalibrationData): number {
  return worldDist * cal.pixelsPerMeter
}

// ============================================
// World ↔ Three.js conversions
// ============================================

/**
 * Convert world coordinates (meters) to Three.js 3D coordinates
 * 
 * Mapping: World X → Three X, World Y → Three Z, Height → Three Y
 */
export function worldTo3D(worldX: number, worldY: number, height: number = 0): Point3D {
  return {
    x: worldX,
    y: height,
    z: worldY,
  }
}

/**
 * Convert Three.js 3D coordinates to world coordinates (meters)
 */
export function threeToWorld(threeX: number, threeY: number, threeZ: number): Point2D & { height: number } {
  return {
    x: threeX,
    y: threeZ,
    height: threeY,
  }
}

// ============================================
// Canvas ↔ Three.js (convenience)
// ============================================

/**
 * Convert canvas pixel coordinates directly to Three.js 3D coordinates
 */
export function canvasTo3D(
  canvasX: number,
  canvasY: number,
  cal: CalibrationData,
  height: number = 0
): Point3D {
  const world = canvasToWorld(canvasX, canvasY, cal)
  return worldTo3D(world.x, world.y, height)
}

/**
 * Convert Three.js 3D coordinates directly to canvas pixel coordinates
 */
export function threeToCanvas(
  threeX: number,
  _threeY: number,
  threeZ: number,
  cal: CalibrationData
): Point2D {
  return worldToCanvas(threeX, threeZ, cal)
}

// ============================================
// Polygon utilities (for ExtrudeGeometry)
// ============================================

/**
 * Convert an array of 2D world points to a Three.js Shape-compatible format
 * Returns points in Three.js XZ plane (Y=0)
 */
export function worldPolygonTo3DPoints(points: Point2D[]): Point3D[] {
  return points.map(p => worldTo3D(p.x, p.y, 0))
}

/**
 * Convert an array of 2D canvas points to world coordinates
 */
export function canvasPolygonToWorld(
  points: Point2D[],
  cal: CalibrationData
): Point2D[] {
  return points.map(p => canvasToWorld(p.x, p.y, cal))
}

/**
 * Calculate the heading angle (radians) from point A to point B in world space
 * Returns angle in standard math convention (counter-clockwise from +X axis)
 */
export function headingBetween(a: Point2D, b: Point2D): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

/**
 * Convert heading angle (radians, math convention) to Three.js rotation around Y axis
 * In Three.js: rotation around Y axis, with Z+ being "forward" at rotation=0
 */
export function headingToThreeRotation(heading: number): number {
  // Math heading: 0 = +X, π/2 = +Y
  // Three.js: 0 = +Z (forward), rotation around Y
  // We need to convert: Three Y-rotation = -(heading - π/2) = π/2 - heading
  return Math.PI / 2 - heading
}

/**
 * Calculate distance between two world points
 */
export function distanceBetween(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Interpolate between two points
 */
export function interpolatePoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}
