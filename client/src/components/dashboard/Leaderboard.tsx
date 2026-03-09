import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, TrendingUp, TrendingDown, Minus, Users, ChevronDown } from 'lucide-react'
import type { TeamStanding } from '../../types'
import { dashboardApi } from '../../services/api'
import { formatPaceDiff, formatTime, formatPace } from '../../utils/time'
import { getRunnerLegNumbers } from '../../utils/legAssignments'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'
import RunnerDetail from './RunnerDetail'

interface LeaderboardProps {
  standings: TeamStanding[]
  totalMiles: number
}

interface LegResultData {
  id: string
  clockTime: number | null
  kills: number
  leg: { legNumber: number; distance: number }
}

interface RunnerData {
  id: string
  name: string
  vanNumber: number
  runOrder: number
  projectedPace: number
  legAssignments?: string | null
  legResults: LegResultData[]
}

const teamColors: Record<string, { bg: string; text: string; border: string }> = {
  BLACK: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700' },
  BLUE: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  GREY: { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-400' },
  WHITE: { bg: 'bg-slate-100', text: 'text-gray-900', border: 'border-slate-300' },
  RED: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400' },
  GREEN: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-400' },
}

function TeamDetail({ teamId }: { teamId: string }) {
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['teamDetail', teamId],
    queryFn: async () => {
      const res = await dashboardApi.getTeam(teamId)
      return res.data?.data as { runners: RunnerData[] }
    },
  })

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading team data...
      </div>
    )
  }

  if (!data?.runners) return null

  // If a runner is selected, show their full detail view
  if (selectedRunnerId) {
    return (
      <div className="mt-3 p-3 rounded-lg border bg-muted/30">
        <RunnerDetail runnerId={selectedRunnerId} onClose={() => setSelectedRunnerId(null)} />
      </div>
    )
  }

  const van1 = data.runners.filter(r => r.vanNumber === 1).sort((a, b) => a.runOrder - b.runOrder)
  const van2 = data.runners.filter(r => r.vanNumber === 2).sort((a, b) => a.runOrder - b.runOrder)

  const renderRunners = (runners: RunnerData[], vanLabel: string) => (
    <div>
      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{vanLabel}</h5>
      <div className="space-y-1">
        {runners.map(runner => {
          const legNums = getRunnerLegNumbers(runner)
          const totalKills = runner.legResults.reduce((sum, r) => sum + r.kills, 0)

          return (
            <div
              key={runner.id}
              onClick={() => setSelectedRunnerId(runner.id)}
              className="text-sm border rounded-lg p-2 bg-background cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-primary">{runner.name}</span>
                <span className="text-xs text-muted-foreground">
                  Projected: {formatPace(runner.projectedPace)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {legNums.map(legNum => {
                  const result = runner.legResults.find(r => r.leg.legNumber === legNum)
                  return (
                    <div
                      key={legNum}
                      className={cn(
                        "text-xs px-2 py-1 rounded font-mono",
                        result?.clockTime
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="font-semibold">L{legNum}</span>
                      {result?.clockTime ? (
                        <>
                          {' '}{formatTime(result.clockTime)}
                          {result.kills > 0 && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              {result.kills}K
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="ml-1">--</span>
                      )}
                    </div>
                  )
                })}
              </div>
              {totalKills > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Total kills: {totalKills}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="mt-3 p-3 rounded-lg border bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-4">
      {van1.length > 0 && renderRunners(van1, 'Van 1')}
      {van2.length > 0 && renderRunners(van2, 'Van 2')}
    </div>
  )
}

export default function Leaderboard({ standings, totalMiles }: LeaderboardProps) {
  const sortedStandings = [...standings].sort((a, b) => a.rank - b.rank)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [directRunnerId, setDirectRunnerId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Team Standings
          </CardTitle>
          {sortedStandings.length > 0 && (
            <Badge variant="secondary" className="font-mono">
              Leg {sortedStandings[0].currentLeg}/36
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedStandings.map((standing, index) => {
          const colors = teamColors[standing.team.name] || { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-300' }
          const isLeader = index === 0
          const isExpanded = expandedTeam === standing.team.id

          return (
            <div key={standing.team.id}>
              <div
                onClick={() => {
                  if (isExpanded) {
                    setExpandedTeam(null)
                    setDirectRunnerId(null)
                  } else {
                    setExpandedTeam(standing.team.id)
                    setDirectRunnerId(null)
                  }
                }}
                className={cn(
                  "flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer",
                  isLeader
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-2 border-yellow-300 dark:border-yellow-700 shadow-md"
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                {/* Rank */}
                <div className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg flex-shrink-0",
                  isLeader
                    ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}>
                  {standing.rank}
                </div>

                {/* Team badge */}
                <div
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm border flex-shrink-0",
                    colors.bg, colors.text, colors.border
                  )}
                >
                  {standing.team.name.substring(0, 2)}
                </div>

                {/* Team info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="font-semibold text-foreground truncate text-sm sm:text-base">
                      {standing.team.name}
                    </span>
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                      {standing.team.city}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>Leg {standing.completedLegs + 1}/36</span>
                    {standing.currentRunner && (
                      <>
                        <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const runnerId = standing.currentRunner?.id
                            if (runnerId) {
                              if (expandedTeam === standing.team.id && directRunnerId === runnerId) {
                                setExpandedTeam(null)
                                setDirectRunnerId(null)
                              } else {
                                setExpandedTeam(standing.team.id)
                                setDirectRunnerId(runnerId)
                              }
                            }
                          }}
                          className="hidden sm:flex items-center gap-1 text-primary hover:underline"
                        >
                          <Users className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{standing.currentRunner.name}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Miles and projected finish */}
                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-semibold text-foreground text-xs sm:text-sm">
                    {standing.milesCompleted?.toFixed(1) || '0.0'}<span className="hidden sm:inline">/{totalMiles.toFixed(1)}</span> mi
                  </div>
                  {standing.projectedFinishTime ? (
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <span className="hidden sm:inline">Projected Finish: </span>
                      <span>{new Date(standing.projectedFinishTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                  ) : null}
                  <div className={cn(
                    "flex items-center justify-end gap-1 text-xs sm:text-sm font-medium",
                    standing.paceVsProjected < 0 ? "text-green-600 dark:text-green-400" :
                    standing.paceVsProjected > 0 ? "text-red-600 dark:text-red-400" :
                    "text-muted-foreground"
                  )}>
                    {standing.paceVsProjected < 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : standing.paceVsProjected > 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {formatPaceDiff(standing.paceVsProjected)}
                  </div>
                </div>

                {/* Expand indicator */}
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                  isExpanded && "rotate-180"
                )} />
              </div>

              {/* Expanded team detail or direct runner detail */}
              {isExpanded && (
                directRunnerId ? (
                  <div className="mt-3 p-3 rounded-lg border bg-muted/30">
                    <RunnerDetail runnerId={directRunnerId} onClose={() => { setExpandedTeam(null); setDirectRunnerId(null) }} />
                  </div>
                ) : (
                  <TeamDetail teamId={standing.team.id} />
                )
              )}
            </div>
          )
        })}

        {standings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No race data yet.</p>
            <p className="text-sm">The race has not started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
