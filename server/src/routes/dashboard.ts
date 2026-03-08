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

      // Calculate projected time
      const projectedTime = team.runners.reduce((sum, runner) => {
        const legNumbers = getRunnerLegNumbers(runner)

        // Estimate time based on projected pace and actual leg distances
        return sum + legNumbers.reduce((legSum, legNum) => {
          const leg = legsByNumber.get(legNum)
          return legSum + runner.projectedPace * (leg?.distance || 5)
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
      for (let legNum = 1; legNum <= 36; legNum++) {
        const actualTime = resultsByLeg.get(legNum)
        if (actualTime) {
          legTimings.push(actualTime)
        } else {
          const runner = runnerByLeg.get(legNum)
          const pace = runner?.projectedPace || DEFAULT_PACE
          const leg = legsByNumber.get(legNum)
          const distance = leg?.distance || 5
          legTimings.push(pace * distance)
        }
      }

      // Determine current leg: use elapsed time if race has started, otherwise first incomplete
      let currentLeg = completedLegs + 1
      if (raceStartTime) {
        const raceStart = new Date(raceStartTime).getTime()
        const elapsed = (Date.now() - raceStart) / 1000
        if (elapsed > 0) {
          let cumulative = 0
          for (let i = 0; i < 36; i++) {
            cumulative += legTimings[i]
            if (cumulative > elapsed) {
              currentLeg = Math.max(currentLeg, i + 1)
              break
            }
          }
          if (elapsed >= cumulative) {
            currentLeg = 36
          }
        }
      }

      // Get current runner based on calculated current leg
      const currentRunner = runnerByLeg.get(currentLeg) || null

      // Calculate total time: actual entries + projected elapsed for current leg
      let effectiveTotalTime = totalTime
      if (raceStartTime) {
        const raceStart = new Date(raceStartTime).getTime()
        const elapsed = (Date.now() - raceStart) / 1000
        if (elapsed > 0 && currentLeg > completedLegs) {
          // Add projected times for legs between last actual and current projected leg
          let projectedSum = 0
          for (let i = completedLegs; i < currentLeg - 1; i++) {
            projectedSum += legTimings[i]
          }
          // Add partial time for the leg in progress
          let cumulativeToCurrentLeg = 0
          for (let i = 0; i < currentLeg - 1; i++) {
            cumulativeToCurrentLeg += legTimings[i]
          }
          const timeIntoCurrentLeg = Math.max(0, elapsed - cumulativeToCurrentLeg)
          effectiveTotalTime = totalTime + projectedSum + timeIntoCurrentLeg
        }
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
        currentRunner: currentRunner
          ? { id: currentRunner.id, name: currentRunner.name }
          : null,
        paceVsProjected: 0,
        totalKills,
        rank: 0,
        legTimings,
      }
    })

    // Sort by total time and assign ranks
    standings.sort((a, b) => {
      if (a.completedLegs !== b.completedLegs) {
        return b.completedLegs - a.completedLegs // More legs = better
      }
      return a.totalTime - b.totalTime // Same legs, less time = better
    })

    standings.forEach((s, index) => {
      s.rank = index + 1
    })

    // Calculate pace vs projected for each team
    if (standings.length > 0 && standings[0].completedLegs > 0) {
      const leader = standings[0]
      standings.forEach((s) => {
        if (s.completedLegs > 0) {
          // Simple: behind leader by time difference
          s.paceVsProjected = s.totalTime - leader.totalTime
        }
      })
    }

    res.json({
      success: true,
      data: {
        standings,
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
      return {
        legNumber: leg.legNumber,
        distance: leg.distance,
        clockTime: result?.clockTime || null,
        kills: result?.kills || 0,
        pace: result?.clockTime ? result.clockTime / leg.distance : null,
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
      results: leg.results.map((result, index) => ({
        runnerId: result.runnerId,
        runnerName: result.runner.name,
        teamName: result.runner.team.name,
        clockTime: result.clockTime,
        pace: result.clockTime / leg.distance,
        kills: result.kills,
        rank: index + 1,
      })),
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

export default router
