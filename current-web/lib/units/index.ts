/**
 * Unit conversion helpers for Current.
 *
 * Internal storage is always **meters** (distance) and **m/s** (speed).
 * These helpers convert to the user's preferred display unit system.
 */

import type { UnitSystem } from './store'

// ── Conversion factors (from meters) ──
const M_TO_FT = 3.28084
const M_TO_IN = 39.37008

// ── Labels ──
const DISTANCE_LABELS: Record<UnitSystem, string> = {
  metric: 'm',
  imperial: 'ft',
  us_customary: 'in',
}

const SPEED_LABELS: Record<UnitSystem, string> = {
  metric: 'm/s',
  imperial: 'ft/s',
  us_customary: 'in/s',
}

// ── Convert meters → display unit ──
export function metersToDisplay(valueM: number, system: UnitSystem): number {
  switch (system) {
    case 'imperial':
      return valueM * M_TO_FT
    case 'us_customary':
      return valueM * M_TO_IN
    default:
      return valueM
  }
}

// ── Convert display unit → meters ──
export function displayToMeters(value: number, system: UnitSystem): number {
  switch (system) {
    case 'imperial':
      return value / M_TO_FT
    case 'us_customary':
      return value / M_TO_IN
    default:
      return value
  }
}

// ── Convert m/s → display speed ──
export function speedToDisplay(valueMs: number, system: UnitSystem): number {
  return metersToDisplay(valueMs, system)
}

// ── Get unit labels ──
export function distanceLabel(system: UnitSystem): string {
  return DISTANCE_LABELS[system]
}

export function speedLabel(system: UnitSystem): string {
  return SPEED_LABELS[system]
}

// ── Format with unit ──
export function formatDistance(valueM: number, system: UnitSystem, decimals = 2): string {
  const converted = metersToDisplay(valueM, system)
  return `${converted.toFixed(decimals)} ${distanceLabel(system)}`
}

export function formatSpeed(valueMs: number, system: UnitSystem, decimals = 2): string {
  const converted = speedToDisplay(valueMs, system)
  return `${converted.toFixed(decimals)} ${speedLabel(system)}`
}
