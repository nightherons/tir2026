/**
 * Get the leg numbers assigned to a runner.
 * If legAssignments is set (JSON array string), use those.
 * Otherwise fall back to the standard formula based on van/order.
 */
export function getRunnerLegNumbers(runner: {
  vanNumber: number
  runOrder: number
  legAssignments?: string | null
}): number[] {
  if (runner.legAssignments) {
    try {
      const parsed = JSON.parse(runner.legAssignments)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(Number)
      }
    } catch {
      // Fall through to formula
    }
  }

  const baseLeg = runner.vanNumber === 1 ? runner.runOrder : runner.runOrder + 6
  return [baseLeg, baseLeg + 12, baseLeg + 24]
}
