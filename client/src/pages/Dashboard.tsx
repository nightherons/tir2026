import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, api } from '../services/api'
import { useSocketStore } from '../store/socketStore'
import type { TeamStanding, Leg } from '../types'
import Leaderboard from '../components/dashboard/Leaderboard'
import TeamProgress from '../components/dashboard/TeamProgress'
import PaceChart from '../components/dashboard/PaceChart'
import KillsLeaderboard from '../components/dashboard/KillsLeaderboard'
import CurrentRunners from '../components/dashboard/CurrentRunners'
import RaceMap from '../components/dashboard/RaceMap'
import RunnerSearch from '../components/dashboard/RunnerSearch'
import LegWinners from '../components/dashboard/LegWinners'

export default function Dashboard() {
  const { onLeaderboardUpdate, onTimeEntered } = useSocketStore()
  const [standings, setStandings] = useState<TeamStanding[]>([])

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getAll(),
    refetchInterval: 30000, // Fallback polling every 30s
  })

  // Fetch legs for the map
  const { data: legsData } = useQuery({
    queryKey: ['legs'],
    queryFn: async () => {
      const res = await api.get('/dashboard/legs')
      return res.data?.data as Leg[]
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Initialize standings from query
  useEffect(() => {
    if (data?.data?.data?.standings) {
      setStandings(data.data.data.standings)
    }
  }, [data])

  // Listen for real-time updates
  useEffect(() => {
    const unsubLeaderboard = onLeaderboardUpdate((newStandings) => {
      setStandings(newStandings)
    })

    const unsubTime = onTimeEntered(() => {
      // Could trigger a refetch or update specific data
    })

    return () => {
      unsubLeaderboard()
      unsubTime()
    }
  }, [onLeaderboardUpdate, onTimeEntered])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading race data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Failed to load race data. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live Race Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {standings.length > 0
            ? `${standings.reduce((acc, s) => acc + s.completedLegs, 0)} legs completed`
            : 'Race not started'}
        </p>
      </div>

      {/* Team Standings */}
      <Leaderboard standings={standings} />

      {/* Leg Winners */}
      <LegWinners />

      {/* Currently Running - horizontal banner */}
      <CurrentRunners standings={standings} />

      {/* Live Race Map */}
      {legsData && legsData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Live Race Map</h3>
          <RaceMap legs={legsData} standings={standings} />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team progress */}
        <TeamProgress standings={standings} />

        {/* Kills leaderboard */}
        <KillsLeaderboard standings={standings} />

        {/* Runner search */}
        <RunnerSearch />
      </div>

      {/* Pace chart */}
      <PaceChart standings={standings} />
    </div>
  )
}
