import { useEffect, useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, api } from '../services/api'
import { useSocketStore } from '../store/socketStore'
import { queryClient } from '../lib/queryClient'
import type { TeamStanding, Leg } from '../types'
import Leaderboard from '../components/dashboard/Leaderboard'
import TeamProgress from '../components/dashboard/TeamProgress'
import PaceChart from '../components/dashboard/PaceChart'
import KillsLeaderboard from '../components/dashboard/KillsLeaderboard'
import CurrentRunners from '../components/dashboard/CurrentRunners'
import RaceMap from '../components/dashboard/RaceMap'
import RunnerSearch from '../components/dashboard/RunnerSearch'
import LegWinners from '../components/dashboard/LegWinners'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'standings', label: 'Standings' },
  { id: 'leg-winners', label: 'Legs' },
  { id: 'on-course', label: 'On Course' },
  { id: 'map', label: 'Map' },
  { id: 'stats', label: 'Stats' },
  { id: 'accuracy', label: 'Accuracy' },
]

export default function Dashboard() {
  const { onLeaderboardUpdate, onTimeEntered } = useSocketStore()
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [totalMiles, setTotalMiles] = useState<number>(0)
  const [raceStartTime, setRaceStartTime] = useState<string | undefined>()
  const [activeSection, setActiveSection] = useState('standings')
  const pillBarRef = useRef<HTMLDivElement>(null)
  const isScrollingTo = useRef(false)

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

  // Fetch detailed route paths from static KML-derived JSON
  const { data: routePaths } = useQuery<Record<string, [number, number][]>>({
    queryKey: ['routePaths'],
    queryFn: async () => {
      const res = await fetch('/route.json')
      return res.json()
    },
    staleTime: Infinity,
  })

  // Initialize standings and raceStartTime from query
  useEffect(() => {
    if (data?.data?.data?.standings) {
      setStandings(data.data.data.standings)
    }
    if (data?.data?.data?.totalMiles != null) {
      setTotalMiles(data.data.data.totalMiles)
    }
    if (data?.data?.data?.raceStartTime) {
      setRaceStartTime(data.data.data.raceStartTime)
    }
  }, [data])

  // Listen for real-time updates
  useEffect(() => {
    const unsubLeaderboard = onLeaderboardUpdate((newStandings) => {
      setStandings(newStandings)
    })

    const unsubTime = onTimeEntered(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['leg-winners'] })
      queryClient.invalidateQueries({ queryKey: ['teamDetail'] })
      queryClient.invalidateQueries({ queryKey: ['runner-details'] })
    })

    return () => {
      unsubLeaderboard()
      unsubTime()
    }
  }, [onLeaderboardUpdate, onTimeEntered])

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingTo.current) return

      const offset = 120 // header + pill bar height
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= offset + 20) {
            setActiveSection(sections[i].id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll active pill into view
  useEffect(() => {
    if (!pillBarRef.current) return
    const activePill = pillBarRef.current.querySelector(`[data-section="${activeSection}"]`)
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeSection])

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return

    isScrollingTo.current = true
    setActiveSection(id)

    const offset = 120
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })

    // Re-enable scroll tracking after animation
    setTimeout(() => { isScrollingTo.current = false }, 800)
  }, [])

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
    <>
      {/* Sticky section nav */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div
          ref={pillBarRef}
          className="max-w-7xl mx-auto flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide"
        >
          {sections.map(({ id, label }) => (
            <button
              key={id}
              data-section={id}
              onClick={() => scrollToSection(id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                activeSection === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live Race Dashboard</h2>
        </div>

        {/* Team Standings */}
        <section id="standings">
          <Leaderboard standings={standings} totalMiles={totalMiles} />
        </section>

        {/* Leg Winners */}
        <section id="leg-winners">
          <LegWinners />
        </section>

        {/* Currently Running - horizontal banner */}
        <section id="on-course">
          <CurrentRunners standings={standings} />
        </section>

        {/* Runner search - visible on mobile only, right after currently running */}
        <div className="lg:hidden">
          <RunnerSearch />
        </div>

        {/* Live Race Map */}
        <section id="map">
          {legsData && legsData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Live Race Map</h3>
              <RaceMap legs={legsData} standings={standings} raceStartTime={raceStartTime} routePaths={routePaths} />
            </div>
          )}
        </section>

        {/* Stats row */}
        <section id="stats">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team progress */}
            <TeamProgress standings={standings} />

            {/* Kills leaderboard */}
            <KillsLeaderboard standings={standings} />

            {/* Runner search - desktop only (mobile version is above) */}
            <div className="hidden lg:block">
              <RunnerSearch />
            </div>
          </div>
        </section>

        {/* Accuracy by leg chart */}
        <section id="accuracy">
          <PaceChart standings={standings} />
        </section>
      </div>
    </>
  )
}
