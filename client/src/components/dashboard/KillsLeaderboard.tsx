import { Zap, Crown } from 'lucide-react'
import type { TeamStanding } from '../../types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Progress } from '../ui/progress'
import { cn } from '@/lib/utils'

interface KillsLeaderboardProps {
  standings: TeamStanding[]
}

const teamColors: Record<string, { text: string; bg: string }> = {
  BLACK: { text: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-900' },
  BLUE: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600' },
  GREY: { text: 'text-gray-500', bg: 'bg-gray-500' },
  WHITE: { text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-400' },
  RED: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-600' },
  GREEN: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-600' },
}

export default function KillsLeaderboard({ standings }: KillsLeaderboardProps) {
  const sortedByKills = [...standings].sort((a, b) => b.totalKills - a.totalKills)
  const maxKills = sortedByKills[0]?.totalKills || 1

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Kill Count
        </CardTitle>
        <CardDescription>Runners passed by each team</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedByKills.map((standing, index) => {
          const colors = teamColors[standing.team.name] || { text: 'text-gray-500', bg: 'bg-gray-400' }
          const isLeader = index === 0 && standing.totalKills > 0

          return (
            <div key={standing.team.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLeader && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className={cn("font-bold", colors.text)}>
                    {standing.team.name.substring(0, 2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {standing.team.name}
                  </span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  {standing.totalKills}
                </span>
              </div>
              <Progress
                value={(standing.totalKills / maxKills) * 100}
                className="h-2"
                indicatorClassName={cn(
                  isLeader ? "bg-gradient-to-r from-yellow-400 to-amber-500" : colors.bg,
                  "transition-all duration-500"
                )}
              />
            </div>
          )
        })}

        {standings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Kill counts will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
