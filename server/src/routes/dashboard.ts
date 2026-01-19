import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get all dashboard data
router.get('/', async (req, res) => {
  try {
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
        // Get legs for this runner based on van and order
        const baseLeg = runner.vanNumber === 1 ? runner.runOrder : runner.runOrder + 6
        const legNumbers = [baseLeg, baseLeg + 12, baseLeg + 24]

        // Estimate time based on projected pace and assumed leg distances
        return sum + runner.projectedPace * 5 * 3 // ~5 miles per leg, 3 legs
      }, 0)

      // Count completed legs
      const completedLegs = allResults.length

      // Get current leg (next incomplete)
      const currentLeg = completedLegs + 1

      // Get current runner
      const currentRunnerOrder = ((currentLeg - 1) % 6) + 1
      const currentVan = currentLeg <= 6 || (currentLeg > 12 && currentLeg <= 18) || currentLeg > 24 && currentLeg <= 30 ? 1 : 2
      const currentRunner = team.runners.find(
        (r) => r.vanNumber === currentVan && r.runOrder === currentRunnerOrder
      )

      // Calculate total kills
      const totalKills = allResults.reduce((sum, r) => sum + r.kills, 0)

      return {
        team: {
          id: team.id,
          name: team.name,
          city: team.city,
          color: team.color,
        },
        totalTime,
        projectedTime,
        completedLegs,
        currentLeg,
        currentRunner: currentRunner
          ? { id: currentRunner.id, name: currentRunner.name }
          : null,
        paceVsProjected: 0, // Will calculate properly when we have more data
        totalKills,
        rank: 0, // Will set after sorting
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

    // Calculate which legs this runner is assigned to based on van/order
    // Van 1: legs 1-6, 13-18, 25-30 (runner order 1-6 maps to leg position)
    // Van 2: legs 7-12, 19-24, 31-36
    const assignedLegs: number[] = []
    const baseOffset = runner.vanNumber === 1 ? 0 : 6
    assignedLegs.push(runner.runOrder + baseOffset)        // First round
    assignedLegs.push(runner.runOrder + baseOffset + 12)   // Second round
    assignedLegs.push(runner.runOrder + baseOffset + 24)   // Third round

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
