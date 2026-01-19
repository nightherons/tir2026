import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, runnerAuth } from '../middleware/auth.js'

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
    const baseLeg = runner.vanNumber === 1 ? runner.runOrder : runner.runOrder + 6
    const legNumbers = [baseLeg, baseLeg + 12, baseLeg + 24]

    const legs = await prisma.leg.findMany({
      where: {
        legNumber: { in: legNumbers },
      },
      orderBy: { legNumber: 'asc' },
    })

    const completedLegs = runner.legResults.map((r) => r.leg.legNumber)

    res.json({
      success: true,
      data: {
        legs,
        completedLegs,
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
