import { Trophy, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react'
import type { TeamStanding } from '../../types'
import { formatTime, formatPaceDiff } from '../../utils/time'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

interface LeaderboardProps {
  standings: TeamStanding[]
}

const teamColors: Record<string, { bg: string; text: string; border: string }> = {
  BLACK: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700' },
  BLUE: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  GREY: { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-400' },
  WHITE: { bg: 'bg-slate-100', text: 'text-gray-900', border: 'border-slate-300' },
  RED: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400' },
  GREEN: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-400' },
}

export default function Leaderboard({ standings }: LeaderboardProps) {
  const sortedStandings = [...standings].sort((a, b) => a.rank - b.rank)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Team Standings
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {standings.reduce((acc, s) => acc + s.completedLegs, 0)} legs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedStandings.map((standing, index) => {
          const colors = teamColors[standing.team.name] || { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-300' }
          const isLeader = index === 0

          return (
            <div
              key={standing.team.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
                isLeader
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-2 border-yellow-300 dark:border-yellow-700 shadow-md"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {/* Rank */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                isLeader
                  ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg"
                  : "bg-muted-foreground/10 text-muted-foreground"
              )}>
                {standing.rank}
              </div>

              {/* Team badge */}
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm border",
                  colors.bg, colors.text, colors.border
                )}
              >
                {standing.team.name.substring(0, 2)}
              </div>

              {/* Team info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">
                    {standing.team.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {standing.team.city}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Leg {standing.completedLegs + 1}/36</span>
                  {standing.currentRunner && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="flex items-center gap-1 text-primary">
                        <Users className="h-3 w-3" />
                        {standing.currentRunner.name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Time and pace */}
              <div className="text-right">
                <div className="font-mono font-semibold text-foreground">
                  {formatTime(standing.totalTime)}
                </div>
                <div className={cn(
                  "flex items-center justify-end gap-1 text-sm font-medium",
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
