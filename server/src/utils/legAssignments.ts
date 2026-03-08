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

  // Van 1: runOrder 1-6 maps to legs 1-6
  // Van 2: runOrder 1-6 maps to legs 7-12, runOrder 7-12 already maps to 7-12
  const baseLeg = runner.vanNumber === 1
    ? runner.runOrder
    : runner.runOrder <= 6 ? runner.runOrder + 6 : runner.runOrder
  return [baseLeg, baseLeg + 12, baseLeg + 24]
}
