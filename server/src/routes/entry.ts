import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, captainOrAdmin } from '../middleware/auth.js'
import { emitTimeEntered, emitLeaderboardUpdate } from '../socket/handlers.js'
import { getRunnerLegNumbers } from '../utils/legAssignments.js'
import { Server } from 'socket.io'

const router = Router()
const prisma = new PrismaClient()

// Exchange zone constants: leg 12/13 combined distance is fixed
const EXCHANGE_LEG_A = 12
const EXCHANGE_LEG_B = 13
const EXCHANGE_MAX_ADJUSTMENT = 2 // ±2 miles

// Update leg 13's adjustedDistance when leg 12 submits an adjustment
async function syncExchangeZoneDistance(
  teamId: string,
  legNumber: number,
  adjustedDistance: number | null
) {
  if (legNumber !== EXCHANGE_LEG_A || adjustedDistance == null) return

  // Get the base distances for both legs
  const [legA, legB] = await Promise.all([
    prisma.leg.findUnique({ where: { legNumber: EXCHANGE_LEG_A } }),
    prisma.leg.findUnique({ where: { legNumber: EXCHANGE_LEG_B } }),
  ])
  if (!legA || !legB) return

  const combinedDistance = legA.distance + legB.distance
  const leg13AdjustedDistance = Math.round((combinedDistance - adjustedDistance) * 100) / 100

  // Find the team's runner assigned to leg 13
  const teamRunners = await prisma.runner.findMany({ where: { teamId } })
  const leg13Runner = teamRunners.find(r =>
    getRunnerLegNumbers(r).includes(EXCHANGE_LEG_B)
  )
  if (!leg13Runner) return

  // Upsert leg 13's result with the complementary distance
  const existingResult = await prisma.legResult.findUnique({
    where: { legId_runnerId: { legId: legB.id, runnerId: leg13Runner.id } },
  })

  if (existingResult) {
    await prisma.legResult.update({
      where: { id: existingResult.id },
      data: { adjustedDistance: leg13AdjustedDistance },
    })
  }
  // If leg 13 has no result yet, the distance will be set when they view their leg info
  // We store it as a pending adjustment on the team — but since LegResult requires clockTime,
  // we just let the runner see it when they open the form (fetched via API)
}

// Runner submits their own time
router.post('/time', authMiddleware, async (req, res) => {
  try {
    const { legNumber, clockTime, kills, adjustedDistance } = req.body
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
    const validLegs = getRunnerLegNumbers(runner)

    if (!validLegs.includes(legNumber)) {
      return res.status(403).json({ success: false, error: 'This is not your leg' })
    }

    // Validate adjustedDistance for exchange zone leg
    if (adjustedDistance != null && legNumber === EXCHANGE_LEG_A) {
      const leg12 = await prisma.leg.findUnique({ where: { legNumber: EXCHANGE_LEG_A } })
      if (leg12) {
        const offset = adjustedDistance - leg12.distance
        if (Math.abs(offset) > EXCHANGE_MAX_ADJUSTMENT) {
          return res.status(400).json({
            success: false,
            error: `Distance adjustment cannot exceed ±${EXCHANGE_MAX_ADJUSTMENT} miles`,
          })
        }
      }
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
        adjustedDistance: legNumber === EXCHANGE_LEG_A ? (adjustedDistance ?? null) : undefined,
        enteredBy: 'runner',
      },
      create: {
        legId: leg.id,
        runnerId,
        clockTime,
        kills: kills || 0,
        adjustedDistance: legNumber === EXCHANGE_LEG_A ? (adjustedDistance ?? null) : undefined,
        enteredBy: 'runner',
      },
      include: {
        leg: true,
        runner: { include: { team: true } },
      },
    })

    // Sync leg 13 distance if leg 12 was adjusted
    await syncExchangeZoneDistance(runner.teamId, legNumber, adjustedDistance ?? null)

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
    const { runnerId, legNumber, clockTime, kills, adjustedDistance } = req.body

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
        adjustedDistance: (legNumber === EXCHANGE_LEG_A || legNumber === EXCHANGE_LEG_B) ? (adjustedDistance ?? null) : undefined,
        enteredBy: 'captain',
      },
      create: {
        legId: leg.id,
        runnerId,
        clockTime,
        kills: kills || 0,
        adjustedDistance: (legNumber === EXCHANGE_LEG_A || legNumber === EXCHANGE_LEG_B) ? (adjustedDistance ?? null) : undefined,
        enteredBy: 'captain',
      },
      include: {
        leg: true,
        runner: { include: { team: true } },
      },
    })

    // Sync exchange zone if leg 12 was adjusted
    await syncExchangeZoneDistance(runner.teamId, legNumber, adjustedDistance ?? null)

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
