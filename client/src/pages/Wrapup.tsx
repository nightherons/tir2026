import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { Trophy, Medal, TrendingUp, TrendingDown, ChevronDown, Users, Zap } from 'lucide-react'
import { dashboardApi } from '../services/api'
import type { WrapupData, WrapupTeam, WrapupRunner } from '../types'
import { formatTime, formatPace } from '../utils/time'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { cn } from '@/lib/utils'
import LegWinners from '../components/dashboard/LegWinners'
import { NhrcBird } from '../components/icons/NhrcLogo'

const teamChartColors: Record<string, string> = {
  BLACK: '#1a1a1a',
  BLUE: '#2563eb',
  GREY: '#6b7280',
  WHITE: '#94a3b8',
  RED: '#dc2626',
  GREEN: '#16a34a',
}

const teamBgColors: Record<string, { bg: string; text: string; border: string }> = {
  BLACK: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700' },
  BLUE: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  GREY: { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-400' },
  WHITE: { bg: 'bg-slate-100', text: 'text-gray-900', border: 'border-slate-300' },
  RED: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400' },
  GREEN: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-400' },
}

const sections = [
  { id: 'standings', label: 'Standings' },
  { id: 'leg-winners', label: 'Legs' },
  { id: 'pace-by-leg', label: 'Pace/Leg' },
  { id: 'cumulative', label: 'Cumulative' },
  { id: 'vs-projection', label: 'vs Projected' },
  { id: 'runner-pace', label: 'By Pace' },
  { id: 'sandbaggers', label: 'Sandbaggers' },
  { id: 'runner-cards', label: 'All Runners' },
]

function formatPaceShort(secPerMile: number): string {
  const min = Math.floor(secPerMile / 60)
  const sec = Math.floor(secPerMile % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// --- Team Standings ---
function TeamStandings({ teams }: { teams: WrapupTeam[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Final Team Standings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {teams.map((t, i) => {
          const colors = teamBgColors[t.team.name] || teamBgColors.GREY
          return (
            <div key={t.team.id} className="p-3 sm:p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg flex-shrink-0",
                  i === 0
                    ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg"
                    : i === 1
                    ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white"
                    : i === 2
                    ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}>
                  {t.place}
                </div>
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shadow-sm border flex-shrink-0 px-0.5 py-2",
                  colors.bg, colors.border
                )}>
                  <NhrcBird className={cn("w-full h-full", t.team.name === 'WHITE' ? 'text-gray-900' : 'text-white')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base">{t.team.name}</span>
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">{t.team.city}</Badge>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="font-mono">{formatTime(t.totalTime)}</span>
                    {i > 0 && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="font-mono text-red-500">+{formatTime(t.timeBehindLeader)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className={cn(
                    "text-sm font-medium",
                    t.paceAheadBehind < 0 ? "text-green-600" : t.paceAheadBehind > 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {t.paceAheadBehind < 0 ? (
                      <span className="flex items-center gap-1 justify-end"><TrendingUp className="h-3 w-3" />{formatTime(Math.abs(t.paceAheadBehind))} ahead</span>
                    ) : t.paceAheadBehind > 0 ? (
                      <span className="flex items-center gap-1 justify-end"><TrendingDown className="h-3 w-3" />{formatTime(t.paceAheadBehind)} behind</span>
                    ) : 'On pace'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.totalKills} kills • Projected: {formatTime(t.projectedTime)}
                  </div>
                </div>
              </div>
              {/* Mobile extras */}
              <div className="flex items-center gap-2 pl-11 mt-1 sm:hidden text-xs text-muted-foreground">
                <span className={cn(
                  "font-medium",
                  t.paceAheadBehind < 0 ? "text-green-600" : t.paceAheadBehind > 0 ? "text-red-600" : ""
                )}>
                  {t.paceAheadBehind < 0 ? `${formatTime(Math.abs(t.paceAheadBehind))} ahead` :
                   t.paceAheadBehind > 0 ? `${formatTime(t.paceAheadBehind)} behind` : 'On pace'}
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span>{t.totalKills} kills</span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// --- Pace by Leg Chart ---
function PaceByLegChart({ teams }: { teams: WrapupTeam[] }) {
  const data = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const legNum = i + 1
      const point: Record<string, number | string> = { leg: legNum }
      for (const t of teams) {
        const leg = t.legs[i]
        if (leg?.actualPace) {
          point[t.team.name] = Math.round(leg.actualPace * 10) / 10
        }
      }
      return point
    })
  }, [teams])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Pace by Leg</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="leg" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatPaceShort(v)}
              domain={['auto', 'auto']}
              reversed
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatPace(value), name]}
              labelFormatter={(l) => `Leg ${l}`}
            />
            <Legend />
            {teams.map(t => (
              <Line
                key={t.team.name}
                type="monotone"
                dataKey={t.team.name}
                stroke={teamChartColors[t.team.name] || '#888'}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// --- Cumulative Average Pace ---
function CumulativePaceChart({ teams }: { teams: WrapupTeam[] }) {
  const data = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const legNum = i + 1
      const point: Record<string, number | string> = { leg: legNum }
      for (const t of teams) {
        // Cumulative avg pace through leg i
        let totalTime = 0
        let totalDist = 0
        for (let j = 0; j <= i; j++) {
          const leg = t.legs[j]
          if (leg?.clockTime) {
            totalTime += leg.clockTime
            totalDist += leg.distance
          }
        }
        if (totalDist > 0) {
          point[t.team.name] = Math.round((totalTime / totalDist) * 10) / 10
        }
      }
      return point
    })
  }, [teams])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Cumulative Average Pace</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="leg" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => formatPaceShort(v)}
              domain={['auto', 'auto']}
              reversed
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatPace(value), name]}
              labelFormatter={(l) => `Through Leg ${l}`}
            />
            <Legend />
            {teams.map(t => (
              <Line
                key={t.team.name}
                type="monotone"
                dataKey={t.team.name}
                stroke={teamChartColors[t.team.name] || '#888'}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// --- Pace vs Projection Chart ---
function PaceVsProjectionChart({ teams }: { teams: WrapupTeam[] }) {
  const data = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const legNum = i + 1
      const point: Record<string, number | string> = { leg: legNum }
      for (const t of teams) {
        const leg = t.legs[i]
        if (leg?.actualPace) {
          // Negative = faster than projected (good), positive = slower
          point[t.team.name] = Math.round((leg.actualPace - leg.projectedPace) * 10) / 10
        }
      }
      return point
    })
  }, [teams])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Pace vs Projection by Leg</CardTitle>
        <p className="text-xs text-muted-foreground">Below zero = faster than projected</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="leg" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => {
                const sign = v >= 0 ? '+' : ''
                return `${sign}${formatPaceShort(Math.abs(v))}`
              }}
            />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            <Tooltip
              formatter={(value: number, name: string) => {
                const sign = value >= 0 ? '+' : '-'
                return [`${sign}${formatPaceShort(Math.abs(value))}/mi`, name]
              }}
              labelFormatter={(l) => `Leg ${l}`}
            />
            <Legend />
            {teams.map(t => (
              <Line
                key={t.team.name}
                type="monotone"
                dataKey={t.team.name}
                stroke={teamChartColors[t.team.name] || '#888'}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// --- Runner Rankings by Pace ---
function RunnerPaceRankings({ runners }: { runners: WrapupRunner[] }) {
  const ranked = useMemo(() => {
    return [...runners]
      .filter(r => r.avgActualPace !== null)
      .sort((a, b) => a.avgActualPace! - b.avgActualPace!)
  }, [runners])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          All Runners Ranked by Pace
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {ranked.map((r, i) => (
            <div key={`${r.teamName}-${r.name}`} className="flex items-center gap-2 sm:gap-3 py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
              <span className={cn(
                "w-7 text-right font-mono text-xs flex-shrink-0",
                i < 3 ? "font-bold text-amber-600" : "text-muted-foreground"
              )}>
                {i + 1}
              </span>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: teamChartColors[r.teamName] || '#888' }}
              />
              <span className="font-medium flex-1 min-w-0 truncate">{r.name}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">{r.teamName}</span>
              <span className="font-mono text-xs sm:text-sm flex-shrink-0">
                {r.avgActualPace !== null ? formatPace(r.avgActualPace) : '--'}
              </span>
              <div className="hidden sm:flex gap-1 flex-shrink-0">
                {r.legs.map(l => (
                  <span key={l.legNumber} className="text-xs font-mono text-muted-foreground">
                    {l.actualPace !== null ? formatPaceShort(l.actualPace) : '--'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Sandbagger / Underachiever Rankings ---
function SandbaggerRankings({ runners }: { runners: WrapupRunner[] }) {
  const ranked = useMemo(() => {
    return [...runners]
      .filter(r => r.avgActualPace !== null)
      .map(r => ({
        ...r,
        delta: r.projectedPace - r.avgActualPace!, // positive = sandbagger (projected slower than actual)
      }))
      .sort((a, b) => b.delta - a.delta)
  }, [runners])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Medal className="h-5 w-5 text-purple-500" />
          Sandbagger Rankings
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Top = biggest sandbaggers (projected slower than actual). Bottom = underachieved.
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(350, ranked.length * 28)}>
          <BarChart
            data={ranked}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => {
                const sign = v >= 0 ? '+' : '-'
                return `${sign}${formatPaceShort(Math.abs(v))}`
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={90}
            />
            <ReferenceLine x={0} stroke="#666" />
            <Tooltip
              formatter={(value: number) => {
                const sign = value >= 0 ? '+' : '-'
                return [`${sign}${formatPaceShort(Math.abs(value))}/mi`, 'Delta']
              }}
              labelFormatter={(name) => {
                const r = ranked.find(r => r.name === name)
                return r ? `${name} (${r.teamName})` : name
              }}
            />
            <Bar dataKey="delta" name="Projected - Actual">
              {ranked.map((r, i) => (
                <Cell
                  key={i}
                  fill={r.delta >= 0 ? '#16a34a' : '#dc2626'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// --- Individual Runner Cards ---
function RunnerCards({ teams }: { teams: WrapupTeam[] }) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Individual Runner Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {teams.map(t => {
          const colors = teamBgColors[t.team.name] || teamBgColors.GREY
          const isExpanded = expandedTeam === t.team.id

          return (
            <div key={t.team.id}>
              <button
                onClick={() => setExpandedTeam(isExpanded ? null : t.team.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border flex-shrink-0 px-0.5",
                  colors.bg, colors.border
                )}>
                  <NhrcBird className={cn("w-full h-full", t.team.name === 'WHITE' ? 'text-gray-900' : 'text-white')} />
                </div>
                <span className="font-semibold flex-1 text-left">{t.team.name}</span>
                <Badge variant="secondary" className="font-mono">{formatTime(t.totalTime)}</Badge>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-2 pl-2">
                  {/* Van 1 */}
                  {[1, 2].map(van => {
                    const vanRunners = t.runners.filter(r => r.vanNumber === van)
                    if (vanRunners.length === 0) return null
                    return (
                      <div key={van}>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 mt-2">
                          Van {van}
                        </h5>
                        <div className="space-y-1.5">
                          {vanRunners.map(runner => {
                            const completedLegs = runner.legs.filter(l => l.actualPace !== null)
                            const avgPace = completedLegs.length > 0
                              ? completedLegs.reduce((s, l) => s + l.clockTime!, 0) /
                                completedLegs.reduce((s, l) => s + l.distance, 0)
                              : null

                            return (
                              <div key={runner.name} className="p-2.5 rounded-lg border bg-background text-sm">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-medium">{runner.name}</span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Proj: {formatPace(runner.projectedPace)}</span>
                                    {avgPace !== null && (
                                      <>
                                        <span className="text-muted-foreground/50">•</span>
                                        <span className="font-medium text-foreground">Avg: {formatPace(avgPace)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {runner.legs.map(leg => {
                                    const delta = leg.actualPace !== null
                                      ? leg.actualPace - leg.projectedPace
                                      : null
                                    return (
                                      <div
                                        key={leg.legNumber}
                                        className={cn(
                                          "text-xs px-2 py-1 rounded font-mono",
                                          leg.actualPace !== null
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                            : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        <span className="font-semibold">L{leg.legNumber}</span>
                                        {leg.actualPace !== null ? (
                                          <>
                                            {' '}{formatTime(leg.clockTime!)}
                                            {' '}({formatPaceShort(leg.actualPace)}/mi)
                                            {delta !== null && (
                                              <span className={cn(
                                                "ml-1",
                                                delta <= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                              )}>
                                                {delta <= 0 ? '-' : '+'}{formatPaceShort(Math.abs(delta))}
                                              </span>
                                            )}
                                            {leg.kills > 0 && (
                                              <span className="ml-1 text-amber-600 dark:text-amber-400">{leg.kills}K</span>
                                            )}
                                          </>
                                        ) : (
                                          <span className="ml-1">--</span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                {runner.totalKills > 0 && (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Total kills: {runner.totalKills}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// --- Main Wrapup Page ---
export default function Wrapup() {
  const [activeSection, setActiveSection] = useState('standings')
  const pillBarRef = useRef<HTMLDivElement>(null)
  const isScrollingTo = useRef(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['wrapup'],
    queryFn: async () => {
      const res = await dashboardApi.getWrapup()
      return res.data?.data as WrapupData
    },
    staleTime: 5 * 60 * 1000,
  })

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingTo.current) return
      const offset = 120
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

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Failed to load race data. Please try again.</p>
        </div>
      </div>
    )
  }

  const { teamStandings, allRunners, } = data

  return (
    <>
      {/* Sticky section nav */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div
          ref={pillBarRef}
          className="max-w-7xl mx-auto flex gap-1.5 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto scrollbar-hide"
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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Race Wrap-Up</h2>
          <p className="text-sm text-muted-foreground mt-1">Post-race analysis and stats</p>
        </div>

        <section id="standings">
          <TeamStandings teams={teamStandings} />
        </section>

        <section id="leg-winners">
          <LegWinners />
        </section>

        <section id="pace-by-leg">
          <PaceByLegChart teams={teamStandings} />
        </section>

        <section id="cumulative">
          <CumulativePaceChart teams={teamStandings} />
        </section>

        <section id="vs-projection">
          <PaceVsProjectionChart teams={teamStandings} />
        </section>

        <section id="runner-pace">
          <RunnerPaceRankings runners={allRunners} />
        </section>

        <section id="sandbaggers">
          <SandbaggerRankings runners={allRunners} />
        </section>

        <section id="runner-cards">
          <RunnerCards teams={teamStandings} />
        </section>
      </div>
    </>
  )
}
