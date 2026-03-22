import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, runnerAuth } from '../middleware/auth.js'
import { getRunnerLegNumbers } from '../utils/legAssignments.js'

const router = Router()
const prisma = new PrismaClient()

// Get runner's assigned legs
router.get('/legs', authMiddleware, runnerAuth, async (req, res) => {
  try {
    const runnerId = req.user!.id

    const runner = await prisma.runner.findUnique({
      where: { id: runnerId },
      include: {
        legResults: {
          include: { leg: true },
        },
      },
    })

    if (!runner) {
      return res.status(404).json({ success: false, error: 'Runner not found' })
    }

    // Calculate which legs this runner should run
    const legNumbers = getRunnerLegNumbers(runner)

    const legs = await prisma.leg.findMany({
      where: {
        legNumber: { in: legNumbers },
      },
      orderBy: { legNumber: 'asc' },
    })

    const completedLegs = runner.legResults.map((r) => r.leg.legNumber)

    // Include existing result data for editing
    const existingResults: Record<number, { clockTime: number; kills: number }> = {}
    for (const result of runner.legResults) {
      existingResults[result.leg.legNumber] = {
        clockTime: result.clockTime,
        kills: result.kills,
      }
    }

    // Include adjustedDistance info for exchange zone legs
    const adjustedDistances: Record<number, number> = {}
    for (const result of runner.legResults) {
      if (result.adjustedDistance != null) {
        adjustedDistances[result.leg.legNumber] = result.adjustedDistance
      }
    }

    // Also check if leg 12 runner on same team has set an adjustment (affects leg 13)
    if (legNumbers.includes(13)) {
      const teamRunners = await prisma.runner.findMany({
        where: { teamId: runner.teamId },
        include: { legResults: { include: { leg: true } } },
      })
      for (const r of teamRunners) {
        for (const result of r.legResults) {
          if (result.leg.legNumber === 12 && result.adjustedDistance != null) {
            // Compute leg 13's adjusted distance from leg 12's
            const leg12 = await prisma.leg.findUnique({ where: { legNumber: 12 } })
            const leg13 = await prisma.leg.findUnique({ where: { legNumber: 13 } })
            if (leg12 && leg13) {
              const combined = leg12.distance + leg13.distance
              adjustedDistances[13] = Math.round((combined - result.adjustedDistance) * 100) / 100
            }
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        legs,
        completedLegs,
        existingResults,
        adjustedDistances,
      },
    })
  } catch (error) {
    console.error('Runner legs error:', error)
    res.status(500).json({ success: false, error: 'Failed to load legs' })
  }
})

// Get runner info
router.get('/me', authMiddleware, runnerAuth, async (req, res) => {
  try {
    const runnerId = req.user!.id

    const runner = await prisma.runner.findUnique({
      where: { id: runnerId },
      include: {
        team: true,
        legResults: {
          include: { leg: true },
          orderBy: { leg: { legNumber: 'asc' } },
        },
      },
    })

    if (!runner) {
      return res.status(404).json({ success: false, error: 'Runner not found' })
    }

    res.json({
      success: true,
      data: {
        id: runner.id,
        name: runner.name,
        team: runner.team,
        vanNumber: runner.vanNumber,
        runOrder: runner.runOrder,
        projectedPace: runner.projectedPace,
        results: runner.legResults,
      },
    })
  } catch (error) {
    console.error('Runner info error:', error)
    res.status(500).json({ success: false, error: 'Failed to load runner info' })
  }
})

export default router
