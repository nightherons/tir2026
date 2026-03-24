import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getRunnerLegNumbers } from '../utils/legAssignments.js'

const router = Router()
const prisma = new PrismaClient()

// Get all dashboard data
router.get('/', async (req, res) => {
  try {
    // Fetch all 36 legs (for distances) and raceDate config once
    const [allLegs, raceConfig] = await Promise.all([
      prisma.leg.findMany({ orderBy: { legNumber: 'asc' } }),
      prisma.raceConfig.findUnique({ where: { key: 'raceDate' } }),
    ])

    const raceStartTime = raceConfig?.value || null

    // Build a map of leg number -> leg for quick lookups
    const legsByNumber = new Map(allLegs.map(l => [l.legNumber, l]))

    const teams = await prisma.team.findMany({
      include: {
        runners: {
          include: {
            legResults: {
              include: {
                leg: true,
              },
            },
          },
        },
      },
    })

    const standings = teams.map((team) => {
      // Calculate total time for team
      const allResults = team.runners.flatMap((r) => r.legResults)
      const totalTime = allResults.reduce((sum, r) => sum + (r.clockTime || 0), 0)

      // Build a map of legNumber -> adjustedDistance for this team (exchange zone overrides)
      const adjustedDistanceByLeg = new Map<number, number>()
      for (const result of allResults) {
        if (result.adjustedDistance != null && result.leg) {
          adjustedDistanceByLeg.set(result.leg.legNumber, result.adjustedDistance)
        }
      }

      // Helper: get effective distance for a leg (team-specific override or base)
      const getDistance = (legNum: number) => {
        return adjustedDistanceByLeg.get(legNum) ?? legsByNumber.get(legNum)?.distance ?? 5
      }

      // Calculate projected time
      const projectedTime = team.runners.reduce((sum, runner) => {
        const legNumbers = getRunnerLegNumbers(runner)

        // Estimate time based on projected pace and actual leg distances
        return sum + legNumbers.reduce((legSum, legNum) => {
          return legSum + runner.projectedPace * getDistance(legNum)
        }, 0)
      }, 0)

      // Count completed legs (actual entries)
      const completedLegs = allResults.length

      // Build a map of legNumber -> runner for this team
      const runnerByLeg = new Map<number, typeof team.runners[0]>()
      for (const runner of team.runners) {
        for (const legNum of getRunnerLegNumbers(runner)) {
          runnerByLeg.set(legNum, runner)
        }
      }

      // Calculate total kills
      const totalKills = allResults.reduce((sum, r) => sum + r.kills, 0)

      // Build legTimings: array of 36 numbers (seconds per leg)
      // Index into results by leg number for this team
      const resultsByLeg = new Map<number, number>()
      for (const result of allResults) {
        if (result.leg && result.clockTime) {
          resultsByLeg.set(result.leg.legNumber, result.clockTime)
        }
      }

      const DEFAULT_PACE = 600 // 10 min/mile fallback
      const legTimings: number[] = []
      const legProjectedTimes: number[] = []
      for (let legNum = 1; legNum <= 36; legNum++) {
        const actualTime = resultsByLeg.get(legNum)
        const runner = runnerByLeg.get(legNum)
        const pace = runner?.projectedPace || DEFAULT_PACE
        const distance = getDistance(legNum)
        const projectedTime = pace * distance
        legProjectedTimes.push(projectedTime)
        if (actualTime) {
          legTimings.push(actualTime)
        } else {
          legTimings.push(projectedTime)
        }
      }

      // Determine current leg and race position using elapsed time
      let currentLeg = completedLegs + 1
      let racePosition = completedLegs // fractional position along course (e.g. 6.4 = 40% through leg 7)
      let effectiveTotalTime = totalTime

      if (raceStartTime) {
        const raceStart = new Date(raceStartTime).getTime()
        const elapsed = (Date.now() - raceStart) / 1000
        if (elapsed > 0) {
          let cumulative = 0
          let found = false
          for (let i = 0; i < 36; i++) {
            if (cumulative + legTimings[i] > elapsed) {
              const progress = (elapsed - cumulative) / legTimings[i]
              currentLeg = Math.max(currentLeg, i + 1)
              racePosition = Math.max(racePosition, i + progress)
              found = true
              break
            }
            cumulative += legTimings[i]
          }
          if (!found) {
            currentLeg = 36
            racePosition = 36
          }

          // Effective time = sum of legTimings up to current position
          // Uses actual times where available, projections otherwise
          effectiveTotalTime = 0
          for (let i = 0; i < Math.floor(racePosition); i++) {
            effectiveTotalTime += legTimings[i]
          }
          // Add partial time for leg in progress
          const partialLeg = racePosition - Math.floor(racePosition)
          if (Math.floor(racePosition) < 36) {
            effectiveTotalTime += legTimings[Math.floor(racePosition)] * partialLeg
          }
        }
      }

      // Get current runner based on calculated current leg
      const currentRunner = runnerByLeg.get(currentLeg) || null

      // Calculate pace vs projected: compare actual results against projected times
      let paceVsProjected = 0
      if (allResults.length > 0) {
        let projectedForCompletedLegs = 0
        for (const result of allResults) {
          if (result.leg) {
            const runner = runnerByLeg.get(result.leg.legNumber)
            const pace = runner?.projectedPace || DEFAULT_PACE
            const distance = getDistance(result.leg.legNumber)
            projectedForCompletedLegs += pace * distance
          }
        }
        paceVsProjected = totalTime - projectedForCompletedLegs
      }

      // Calculate miles completed based on race position
      let milesCompleted = 0
      const positionForMiles = Math.max(racePosition, completedLegs)
      const completedFullLegs = Math.floor(positionForMiles)
      for (let i = 0; i < completedFullLegs && i < 36; i++) {
        milesCompleted += getDistance(i + 1)
      }
      // Add partial distance for leg in progress
      const partialProgress = positionForMiles - completedFullLegs
      if (completedFullLegs < 36 && partialProgress > 0) {
        milesCompleted += getDistance(completedFullLegs + 1) * partialProgress
      }

      // Compute projected finish time = raceStartTime + sum of all legTimings
      let projectedFinishTime: string | null = null
      if (raceStartTime) {
        const totalLegTime = legTimings.reduce((sum, t) => sum + t, 0)
        const finishDate = new Date(new Date(raceStartTime).getTime() + totalLegTime * 1000)
        projectedFinishTime = finishDate.toISOString()
      }

      return {
        team: {
          id: team.id,
          name: team.name,
          city: team.city,
          color: team.color,
        },
        totalTime: effectiveTotalTime,
        projectedTime,
        completedLegs: Math.max(completedLegs, currentLeg - 1),
        currentLeg,
        racePosition,
        milesCompleted: Math.round(milesCompleted * 10) / 10,
        currentRunner: currentRunner
          ? { id: currentRunner.id, name: currentRunner.name }
          : null,
        paceVsProjected,
        projectedFinishTime,
        totalKills,
        rank: 0,
        legTimings,
        legProjectedTimes,
      }
    })

    // Sort by race position (further ahead = better rank)
    standings.sort((a, b) => b.racePosition - a.racePosition)

    standings.forEach((s, index) => {
      s.rank = index + 1
    })

    // Calculate total race miles
    const totalMiles = allLegs.reduce((sum, l) => sum + l.distance, 0)

    res.json({
      success: true,
      data: {
        standings,
        totalMiles: Math.round(totalMiles * 10) / 10,
        raceStartTime,
        lastUpdate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ success: false, error: 'Failed to load dashboard' })
  }
})

// Get team details
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        runners: {
          include: {
            legResults: {
              include: {
                leg: true,
              },
              orderBy: {
                leg: { legNumber: 'asc' },
              },
            },
          },
          orderBy: [{ vanNumber: 'asc' }, { runOrder: 'asc' }],
        },
      },
    })

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' })
    }

    res.json({ success: true, data: team })
  } catch (error) {
    console.error('Team details error:', error)
    res.status(500).json({ success: false, error: 'Failed to load team details' })
  }
})

// Search runners by name
router.get('/runners/search', async (req, res) => {
  try {
    const query = req.query.q as string
    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] })
    }

    const runners = await prisma.runner.findMany({
      where: {
        name: {
          contains: query,
        },
      },
      include: {
        team: true,
      },
      take: 10,
    })

    res.json({
      success: true,
      data: runners.map(r => ({
        id: r.id,
        name: r.name,
        teamName: r.team.name,
      })),
    })
  } catch (error) {
    console.error('Runner search error:', error)
    res.status(500).json({ success: false, error: 'Failed to search runners' })
  }
})

// Get runner details with leg results
router.get('/runners/:runnerId', async (req, res) => {
  try {
    const { runnerId } = req.params

    const runner = await prisma.runner.findUnique({
      where: { id: runnerId },
      include: {
        team: true,
        legResults: {
          include: {
            leg: true,
          },
        },
      },
    })

    if (!runner) {
      return res.status(404).json({ success: false, error: 'Runner not found' })
    }

    const assignedLegs = getRunnerLegNumbers(runner)

    // Get leg data for assigned legs
    const legs = await prisma.leg.findMany({
      where: {
        legNumber: { in: assignedLegs },
      },
      orderBy: { legNumber: 'asc' },
    })

    // Build response with leg results
    const legData = legs.map(leg => {
      const result = runner.legResults.find(r => r.legId === leg.id)
      const effectiveDistance = result?.adjustedDistance ?? leg.distance
      return {
        id: result?.id || null,
        legNumber: leg.legNumber,
        distance: leg.distance,
        adjustedDistance: result?.adjustedDistance ?? null,
        effectiveDistance,
        clockTime: result?.clockTime || null,
        kills: result?.kills || 0,
        pace: result?.clockTime ? result.clockTime / effectiveDistance : null,
      }
    })

    res.json({
      success: true,
      data: {
        id: runner.id,
        name: runner.name,
        teamName: runner.team.name,
        vanNumber: runner.vanNumber,
        runOrder: runner.runOrder,
        projectedPace: runner.projectedPace,
        legs: legData,
      },
    })
  } catch (error) {
    console.error('Runner details error:', error)
    res.status(500).json({ success: false, error: 'Failed to load runner details' })
  }
})

// Get leg results grouped by leg (for leg winners)
router.get('/leg-results', async (req, res) => {
  try {
    const legs = await prisma.leg.findMany({
      orderBy: { legNumber: 'asc' },
      include: {
        results: {
          include: {
            runner: {
              include: {
                team: true,
              },
            },
          },
          orderBy: {
            clockTime: 'asc',
          },
        },
      },
    })

    const legResults = legs.map(leg => ({
      legNumber: leg.legNumber,
      distance: leg.distance,
      results: leg.results.map((result, index) => {
        const effectiveDistance = result.adjustedDistance ?? leg.distance
        return {
          runnerId: result.runnerId,
          runnerName: result.runner.name,
          teamName: result.runner.team.name,
          clockTime: result.clockTime,
          adjustedDistance: result.adjustedDistance,
          pace: result.clockTime / effectiveDistance,
          projectedPace: result.runner.projectedPace,
          kills: result.kills,
          rank: index + 1,
        }
      }),
    }))

    res.json({ success: true, data: legResults })
  } catch (error) {
    console.error('Leg results error:', error)
    res.status(500).json({ success: false, error: 'Failed to load leg results' })
  }
})

// Get legs with coordinates for map
router.get('/legs', async (req, res) => {
  try {
    const legs = await prisma.leg.findMany({
      orderBy: { legNumber: 'asc' },
      select: {
        id: true,
        legNumber: true,
        distance: true,
        startPoint: true,
        endPoint: true,
        difficulty: true,
        startLat: true,
        startLng: true,
        endLat: true,
        endLng: true,
      },
    })

    res.json({ success: true, data: legs })
  } catch (error) {
    console.error('Legs error:', error)
    res.status(500).json({ success: false, error: 'Failed to load legs' })
  }
})

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    // Redirect to main dashboard endpoint
    const response = await fetch(`http://localhost:${process.env.PORT || 3001}/api/dashboard`)
    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Leaderboard error:', error)
    res.status(500).json({ success: false, error: 'Failed to load leaderboard' })
  }
})

// Debug endpoint - shows runner paces, leg assignments, and projected finish breakdown
router.get('/debug', async (req, res) => {
  try {
    const [teams, allLegs, raceConfig] = await Promise.all([
      prisma.team.findMany({
        include: {
          runners: {
            orderBy: [{ vanNumber: 'asc' }, { runOrder: 'asc' }],
            include: { legResults: { include: { leg: true } } },
          },
        },
      }),
      prisma.leg.findMany({ orderBy: { legNumber: 'asc' } }),
      prisma.raceConfig.findUnique({ where: { key: 'raceDate' } }),
    ])

    const legsByNumber = new Map(allLegs.map(l => [l.legNumber, l]))
    const raceStartTime = raceConfig?.value || null

    const debug = teams.map(team => {
      const runnerByLeg = new Map<number, typeof team.runners[0]>()
      for (const runner of team.runners) {
        for (const legNum of getRunnerLegNumbers(runner)) {
          runnerByLeg.set(legNum, runner)
        }
      }

      const resultsByLeg = new Map<number, number>()
      const adjustedDistByLeg = new Map<number, number>()
      for (const runner of team.runners) {
        for (const result of runner.legResults) {
          if (result.leg && result.clockTime) {
            resultsByLeg.set(result.leg.legNumber, result.clockTime)
          }
          if (result.leg && result.adjustedDistance != null) {
            adjustedDistByLeg.set(result.leg.legNumber, result.adjustedDistance)
          }
        }
      }

      const legBreakdown = []
      let totalSeconds = 0
      for (let legNum = 1; legNum <= 36; legNum++) {
        const leg = legsByNumber.get(legNum)
        const distance = adjustedDistByLeg.get(legNum) ?? leg?.distance ?? 5
        const runner = runnerByLeg.get(legNum)
        const actualTime = resultsByLeg.get(legNum)
        const pace = runner?.projectedPace || 600
        const legTime = actualTime || pace * distance
        totalSeconds += legTime

        const paceRounded = Math.round(pace)
        const paceMin = Math.floor(paceRounded / 60)
        const paceSec = paceRounded % 60

        legBreakdown.push({
          leg: legNum,
          distance,
          runner: runner?.name || 'UNASSIGNED',
          pacePerMile: `${paceMin}:${paceSec.toString().padStart(2, '0')}`,
          paceSeconds: pace,
          legTimeSeconds: Math.round(legTime),
          legTimeFormatted: `${Math.floor(Math.round(legTime) / 60)}:${(Math.round(legTime) % 60).toString().padStart(2, '0')}`,
          source: actualTime ? 'actual' : 'projected',
        })
      }

      let projectedFinish = null
      if (raceStartTime) {
        const finishDate = new Date(new Date(raceStartTime).getTime() + totalSeconds * 1000)
        projectedFinish = finishDate.toISOString()
      }

      const totalRounded = Math.round(totalSeconds)
      const totalHours = Math.floor(totalRounded / 3600)
      const totalMins = Math.floor((totalRounded % 3600) / 60)
      const totalSecs = totalRounded % 60

      return {
        team: team.name,
        runnerCount: team.runners.length,
        runners: team.runners.map(r => ({
          name: r.name,
          van: r.vanNumber,
          order: r.runOrder,
          paceSeconds: r.projectedPace,
          pace: `${Math.floor(Math.round(r.projectedPace) / 60)}:${(Math.round(r.projectedPace) % 60).toString().padStart(2, '0')}/mi`,
          assignedLegs: getRunnerLegNumbers(r),
          customAssignments: r.legAssignments || null,
        })),
        totalSeconds: Math.round(totalSeconds),
        totalFormatted: `${totalHours}h ${totalMins}m ${totalSecs}s`,
        raceStartTime,
        projectedFinish,
        projectedFinishLocal: projectedFinish
          ? new Date(projectedFinish).toISOString()
          : null,
        legBreakdown,
      }
    })

    res.json({ success: true, data: debug })
  } catch (error) {
    console.error('Debug error:', error)
    res.status(500).json({ success: false, error: 'Failed to generate debug data' })
  }
})

// Public config (PIN length for login UI)
router.get('/config/pin-length', async (req, res) => {
  try {
    const config = await prisma.raceConfig.findUnique({ where: { key: 'pinLength' } })
    res.json({ success: true, data: { pinLength: config ? parseInt(config.value) : 6 } })
  } catch (error) {
    res.json({ success: true, data: { pinLength: 6 } })
  }
})

export default router
