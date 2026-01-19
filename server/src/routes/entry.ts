import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, captainOrAdmin } from '../middleware/auth.js'
import { emitTimeEntered, emitLeaderboardUpdate } from '../socket/handlers.js'
import { Server } from 'socket.io'

const router = Router()
const prisma = new PrismaClient()

// Runner submits their own time
router.post('/time', authMiddleware, async (req, res) => {
  try {
    const { legNumber, clockTime, kills } = req.body
    const runnerId = req.user!.id

    if (!legNumber || clockTime === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Get the runner to verify they should run this leg
    const runner = await prisma.runner.findUnique({
      where: { id: runnerId },
    })

    if (!runner) {
      return res.status(404).json({ success: false, error: 'Runner not found' })
    }

    // Verify this is one of their legs
    const baseLeg = runner.vanNumber === 1 ? runner.runOrder : runner.runOrder + 6
    const validLegs = [baseLeg, baseLeg + 12, baseLeg + 24]

    if (!validLegs.includes(legNumber)) {
      return res.status(403).json({ success: false, error: 'This is not your leg' })
    }

    // Get the leg
    const leg = await prisma.leg.findUnique({
      where: { legNumber },
    })

    if (!leg) {
      return res.status(404).json({ success: false, error: 'Leg not found' })
    }

    // Create or update the result
    const result = await prisma.legResult.upsert({
      where: {
        legId_runnerId: {
          legId: leg.id,
          runnerId,
        },
      },
      update: {
        clockTime,
        kills: kills || 0,
        enteredBy: 'runner',
      },
      create: {
        legId: leg.id,
        runnerId,
        clockTime,
        kills: kills || 0,
        enteredBy: 'runner',
      },
      include: {
        leg: true,
        runner: { include: { team: true } },
      },
    })

    // Emit socket event
    const io: Server = req.app.get('io')
    emitTimeEntered(io, {
      legResult: result,
      teamId: runner.teamId,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Time entry error:', error)
    res.status(500).json({ success: false, error: 'Failed to submit time' })
  }
})

// Captain submits time for van runner
router.post('/van', authMiddleware, captainOrAdmin, async (req, res) => {
  try {
    const { runnerId, legNumber, clockTime, kills } = req.body

    if (!runnerId || !legNumber || clockTime === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // If captain, verify runner is in their van
    if (req.user!.type === 'captain') {
      const runner = await prisma.runner.findUnique({
        where: { id: runnerId },
      })

      if (!runner || runner.teamId !== req.user!.teamId || runner.vanNumber !== req.user!.vanNumber) {
        return res.status(403).json({ success: false, error: 'Not authorized for this runner' })
      }
    }

    // Get the leg
    const leg = await prisma.leg.findUnique({
      where: { legNumber },
    })

    if (!leg) {
      return res.status(404).json({ success: false, error: 'Leg not found' })
    }

    // Get runner for team ID
    const runner = await prisma.runner.findUnique({
      where: { id: runnerId },
    })

    if (!runner) {
      return res.status(404).json({ success: false, error: 'Runner not found' })
    }

    // Create or update the result
    const result = await prisma.legResult.upsert({
      where: {
        legId_runnerId: {
          legId: leg.id,
          runnerId,
        },
      },
      update: {
        clockTime,
        kills: kills || 0,
        enteredBy: 'captain',
      },
      create: {
        legId: leg.id,
        runnerId,
        clockTime,
        kills: kills || 0,
        enteredBy: 'captain',
      },
      include: {
        leg: true,
        runner: { include: { team: true } },
      },
    })

    // Emit socket event
    const io: Server = req.app.get('io')
    emitTimeEntered(io, {
      legResult: result,
      teamId: runner.teamId,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Van entry error:', error)
    res.status(500).json({ success: false, error: 'Failed to submit time' })
  }
})

export default router
