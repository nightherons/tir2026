import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, captainOrAdmin } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Get van roster
router.get('/van', authMiddleware, captainOrAdmin, async (req, res) => {
  try {
    const { teamId, vanNumber } = req.user!

    if (!teamId || !vanNumber) {
      return res.status(400).json({ success: false, error: 'Not assigned to a team/van' })
    }

    const runners = await prisma.runner.findMany({
      where: {
        teamId,
        vanNumber,
      },
      include: {
        legResults: {
          include: { leg: true },
        },
      },
      orderBy: { runOrder: 'asc' },
    })

    // Get all legs for this van
    const vanLegs = vanNumber === 1
      ? [1, 2, 3, 4, 5, 6, 13, 14, 15, 16, 17, 18, 25, 26, 27, 28, 29, 30]
      : [7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 31, 32, 33, 34, 35, 36]

    const legs = await prisma.leg.findMany({
      where: {
        legNumber: { in: vanLegs },
      },
      orderBy: { legNumber: 'asc' },
    })

    res.json({
      success: true,
      data: {
        runners,
        legs,
      },
    })
  } catch (error) {
    console.error('Van roster error:', error)
    res.status(500).json({ success: false, error: 'Failed to load van roster' })
  }
})

// Get van legs with status
router.get('/legs', authMiddleware, captainOrAdmin, async (req, res) => {
  try {
    const { teamId, vanNumber } = req.user!

    if (!teamId || !vanNumber) {
      return res.status(400).json({ success: false, error: 'Not assigned to a team/van' })
    }

    const runners = await prisma.runner.findMany({
      where: { teamId, vanNumber },
      include: {
        legResults: {
          include: { leg: true },
        },
      },
    })

    // Build list of completed leg numbers
    const completedLegs = runners.flatMap((r) =>
      r.legResults.map((lr) => lr.leg.legNumber)
    )

    // Get all legs for this van
    const vanLegs = vanNumber === 1
      ? [1, 2, 3, 4, 5, 6, 13, 14, 15, 16, 17, 18, 25, 26, 27, 28, 29, 30]
      : [7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 31, 32, 33, 34, 35, 36]

    const legs = await prisma.leg.findMany({
      where: {
        legNumber: { in: vanLegs },
      },
      orderBy: { legNumber: 'asc' },
    })

    const legsWithStatus = legs.map((leg) => ({
      ...leg,
      completed: completedLegs.includes(leg.legNumber),
    }))

    res.json({
      success: true,
      data: {
        legs: legsWithStatus,
        completedLegs,
      },
    })
  } catch (error) {
    console.error('Van legs error:', error)
    res.status(500).json({ success: false, error: 'Failed to load van legs' })
  }
})

export default router
