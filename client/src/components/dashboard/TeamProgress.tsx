import { Flag } from 'lucide-react'
import type { TeamStanding } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { cn } from '@/lib/utils'

interface TeamProgressProps {
  standings: TeamStanding[]
}

const teamProgressColors: Record<string, string> = {
  BLACK: 'bg-gray-900',
  BLUE: 'bg-blue-600',
  GREY: 'bg-gray-500',
  WHITE: 'bg-slate-400',
  RED: 'bg-red-600',
  GREEN: 'bg-green-600',
}

export default function TeamProgress({ standings }: TeamProgressProps) {
  const totalLegs = 36

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          Race Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {standings.map((standing) => {
          const progress = (standing.completedLegs / totalLegs) * 100
          const colorClass = teamProgressColors[standing.team.name] || 'bg-gray-400'

          return (
            <div key={standing.team.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", colorClass)} />
                  <span className="font-medium text-foreground">
                    {standing.team.name}
                  </span>
                </div>
                <span className="text-muted-foreground font-mono">
                  {standing.completedLegs}/{totalLegs}
                </span>
              </div>
              <Progress
                value={progress}
                className="h-3"
                indicatorClassName={cn(colorClass, "transition-all duration-700")}
              />
            </div>
          )
        })}

        {standings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Flag className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Race progress will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
