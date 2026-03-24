export type ZoneName = 'Sandbagged' | 'Humble' | 'Dialed In' | 'On the Nose' | 'Optimistic' | 'Overconfident'

export interface ZoneInfo {
  deviation: number // positive = faster than projected
  zone: ZoneName
  color: string // tailwind text color class
  bg: string // tailwind bg color class
}

/**
 * Calculate projection accuracy zone from actual vs projected time.
 * deviation = (projected - actual) / projected * 100
 * Positive means runner was faster than projected.
 */
export function calculateZone(actualSeconds: number, projectedSeconds: number): ZoneInfo {
  if (projectedSeconds <= 0 || actualSeconds <= 0) {
    return { deviation: 0, zone: 'On the Nose', color: 'text-gray-600', bg: 'bg-gray-100' }
  }

  const deviation = ((projectedSeconds - actualSeconds) / projectedSeconds) * 100

  const zone = getZoneName(deviation)
  const { color, bg } = zoneStyles[zone]

  return { deviation, zone, color, bg }
}

export function getZoneName(deviation: number): ZoneName {
  if (deviation > 10) return 'Sandbagged'
  if (deviation > 5) return 'Humble'
  if (deviation > 1) return 'Dialed In'
  if (deviation >= -1) return 'On the Nose'
  if (deviation >= -10) return 'Optimistic'
  return 'Overconfident'
}

export const zoneStyles: Record<ZoneName, { color: string; bg: string }> = {
  'Sandbagged': { color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  'Humble': { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'Dialed In': { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  'On the Nose': { color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800/30' },
  'Optimistic': { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  'Overconfident': { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
}

/** Zone boundaries for chart reference areas (deviation %) */
export const zoneBands = [
  { zone: 'Sandbagged' as ZoneName, min: 10, max: 30, fill: '#e9d5ff' },
  { zone: 'Humble' as ZoneName, min: 5, max: 10, fill: '#dbeafe' },
  { zone: 'Dialed In' as ZoneName, min: 1, max: 5, fill: '#dcfce7' },
  { zone: 'On the Nose' as ZoneName, min: -1, max: 1, fill: '#f3f4f6' },
  { zone: 'Optimistic' as ZoneName, min: -10, max: -1, fill: '#fef3c7' },
  { zone: 'Overconfident' as ZoneName, min: -30, max: -10, fill: '#fee2e2' },
]

export function formatDeviation(deviation: number): string {
  const sign = deviation >= 0 ? '+' : ''
  return `${sign}${deviation.toFixed(1)}%`
}
