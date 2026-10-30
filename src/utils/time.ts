import { HISTORY_WINDOW_HOURS } from '../config/stations'
import type { BuoyObservation, StationStatus } from '../types/buoy'

export function formatLocalDateTime(timestamp: string | null): string {
  if (!timestamp) {
    return '—'
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatLocalTime(timestamp: string): string {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function getObservationAgeMinutes(timestamp: string | null): number | null {
  if (!timestamp) {
    return null
  }
  const ageMs = Date.now() - new Date(timestamp).getTime()
  return Math.max(0, Math.floor(ageMs / 60_000))
}

export function deriveStatus(latestObservationTimestamp: string | null): StationStatus {
  const ageMinutes = getObservationAgeMinutes(latestObservationTimestamp)
  if (ageMinutes === null) {
    return 'offline'
  }
  if (ageMinutes <= 90) {
    return 'online'
  }
  return 'delayed'
}

export function filterToRecentWindow(
  observations: BuoyObservation[],
  windowHours = HISTORY_WINDOW_HOURS,
  now = Date.now(),
): BuoyObservation[] {
  const windowStart = now - windowHours * 60 * 60 * 1000

  return observations
    .filter((observation) => new Date(observation.timestamp).getTime() >= windowStart)
    .sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    )
}
