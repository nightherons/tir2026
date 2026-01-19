/**
 * Format seconds to HH:MM:SS or MM:SS display
 */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

/**
 * Format pace in seconds per mile to MM:SS/mi display
 */
export function formatPace(secondsPerMile: number): string {
  if (secondsPerMile <= 0) return '--:--'

  const minutes = Math.floor(secondsPerMile / 60)
  const seconds = Math.floor(secondsPerMile % 60)

  return `${minutes}:${seconds.toString().padStart(2, '0')}/mi`
}

/**
 * Format pace difference (positive = behind, negative = ahead)
 */
export function formatPaceDiff(diffSeconds: number): string {
  if (diffSeconds === 0) return 'On pace'

  const absSeconds = Math.abs(diffSeconds)
  const formatted = formatTime(absSeconds)

  if (diffSeconds < 0) {
    return `${formatted} ahead`
  }
  return `${formatted} behind`
}

/**
 * Parse time string (HH:MM:SS or MM:SS) to total seconds
 */
export function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':').map(Number)

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  }

  return 0
}

/**
 * Calculate pace from distance and time
 */
export function calculatePace(distanceMiles: number, totalSeconds: number): number {
  if (distanceMiles <= 0 || totalSeconds <= 0) return 0
  return totalSeconds / distanceMiles
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get time difference in human readable format
 */
export function getTimeSince(isoString: string): string {
  const now = new Date()
  const then = new Date(isoString)
  const diffSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffSeconds < 60) return 'Just now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  return `${Math.floor(diffSeconds / 86400)}d ago`
}
