import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, ChevronDown, Clock, Medal } from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

interface LegResult {
  runnerId: string
  runnerName: string
  teamName: string
  clockTime: number
  pace: number
  kills: number
  rank: number
}

interface LegWithResults {
  legNumber: number
  distance: number
  results: LegResult[]
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}/mi`
}

function getRankBadge(rank: number) {
  if (rank === 1) return <Medal className="h-4 w-4 text-yellow-500" />
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />
  return <span className="text-xs text-muted-foreground w-4 text-center">{rank}</span>
}

function LegCard({ leg }: { leg: LegWithResults }) {
  const [expanded, setExpanded] = useState(false)
  const winner = leg.results[0]
  const otherResults = leg.results.slice(1)

  if (!winner) return null

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header - always visible, shows winner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Badge variant="outline" className="shrink-0">
            Leg {leg.legNumber}
          </Badge>
          <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
          <span className="font-medium truncate">{winner.runnerName}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {winner.teamName}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
          <span className="font-mono">{formatTime(winner.clockTime)}</span>
          <span className="hidden sm:inline text-xs">{formatPace(winner.pace)}</span>
          {winner.kills > 0 && (
            <span className="text-amber-600 text-xs">+{winner.kills} kills</span>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-180"
          )} />
        </div>
      </button>

      {/* Expanded content - all results */}
      {expanded && otherResults.length > 0 && (
        <div className="border-t bg-muted/30">
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/50">
            All Finishers ({leg.results.length} runners • {leg.distance.toFixed(2)} mi)
          </div>
          <div className="divide-y">
            {/* Winner row */}
            <div className="px-3 py-2 flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/20">
              {getRankBadge(1)}
              <span className="font-medium flex-1 truncate">{winner.runnerName}</span>
              <Badge variant="secondary" className="text-xs">{winner.teamName}</Badge>
              <span className="font-mono text-sm w-16 text-right">{formatTime(winner.clockTime)}</span>
              <span className="text-xs text-muted-foreground w-16 text-right">{formatPace(winner.pace)}</span>
              <span className="w-12 text-right text-xs">
                {winner.kills > 0 ? <span className="text-amber-600">+{winner.kills}</span> : '—'}
              </span>
            </div>
            {/* Other runners */}
            {otherResults.map((result) => (
              <div key={result.runnerId} className="px-3 py-2 flex items-center gap-3">
                {getRankBadge(result.rank)}
                <span className="flex-1 truncate">{result.runnerName}</span>
                <Badge variant="outline" className="text-xs">{result.teamName}</Badge>
                <span className="font-mono text-sm w-16 text-right">{formatTime(result.clockTime)}</span>
                <span className="text-xs text-muted-foreground w-16 text-right">{formatPace(result.pace)}</span>
                <span className="w-12 text-right text-xs">
                  {result.kills > 0 ? <span className="text-amber-600">+{result.kills}</span> : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show message if only winner exists */}
      {expanded && otherResults.length === 0 && (
        <div className="border-t bg-muted/30 px-3 py-2 text-sm text-muted-foreground text-center">
          Only one finisher so far
        </div>
      )}
    </div>
  )
}

export default function LegWinners() {
  const { data: legResults, isLoading } = useQuery({
    queryKey: ['leg-winners'],
    queryFn: async () => {
      const res = await api.get('/dashboard/leg-results')
      return res.data?.data as LegWithResults[]
    },
    refetchInterval: 30000,
  })

  const completedLegs = legResults?.filter(l => l.results.length > 0) || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leg Winners
          {completedLegs.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {completedLegs.length} legs completed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : completedLegs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No legs completed yet</p>
            <p className="text-sm">Winners will appear here as runners finish</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {completedLegs.map((leg) => (
              <LegCard key={leg.legNumber} leg={leg} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
