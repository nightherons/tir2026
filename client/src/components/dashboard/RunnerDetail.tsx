import { useQuery } from '@tanstack/react-query'
import { User, Clock, Trophy } from 'lucide-react'
import { api } from '@/services/api'
import { calculateZone, formatDeviation } from '@/utils/zones'

interface RunnerResult {
  id: string
  name: string
  teamName: string
  vanNumber: number
  runOrder: number
  projectedPace: number
  legs: {
    legNumber: number
    distance: number
    effectiveDistance?: number
    clockTime: number | null
    kills: number
    pace: number | null
  }[]
}

function formatPace(seconds: number): string {
  const total = Math.round(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}/mi`
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

function abbreviateZone(zone: string): string {
  const abbrevs: Record<string, string> = {
    'Sandbagged': 'SB',
    'Humble': 'HUM',
    'Dialed In': 'DI',
    'On the Nose': 'OTN',
    'Optimistic': 'OPT',
    'Overconfident': 'OC',
    'Delusional': 'DEL',
  }
  return abbrevs[zone] || zone
}

export default function RunnerDetail({ runnerId, onClose }: { runnerId: string; onClose?: () => void }) {
  const { data: runnerDetails, isLoading } = useQuery({
    queryKey: ['runner-details', runnerId],
    queryFn: async () => {
      const res = await api.get(`/dashboard/runners/${runnerId}`)
      return res.data?.data as RunnerResult
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  if (!runnerDetails) return null

  // Compute overall accuracy across completed legs
  const completedLegs = runnerDetails.legs.filter(l => l.clockTime)
  let overallZone = null
  if (completedLegs.length > 0) {
    const totalActual = completedLegs.reduce((sum, l) => sum + l.clockTime!, 0)
    const totalProjected = completedLegs.reduce((sum, l) => {
      const dist = l.effectiveDistance ?? l.distance
      return sum + runnerDetails.projectedPace * dist
    }, 0)
    overallZone = calculateZone(totalActual, totalProjected)
  }

  return (
    <div className="space-y-4">
      {/* Runner info header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{runnerDetails.name}</h3>
            <p className="text-sm text-muted-foreground">
              {runnerDetails.teamName} • Van {runnerDetails.vanNumber} • #{runnerDetails.runOrder}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            ✕
          </button>
        )}
      </div>

      {/* Projected pace + overall accuracy */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Projected: </span>
          <span className="font-medium">{formatPace(runnerDetails.projectedPace)}</span>
        </div>
        {overallZone && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${overallZone.bg} ${overallZone.color}`}>
            {overallZone.zone} ({formatDeviation(overallZone.deviation)})
          </span>
        )}
      </div>

      {/* Legs table */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Assigned Legs</h4>
        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Leg</th>
                <th className="px-2 py-2 text-left font-medium">Dist</th>
                <th className="px-2 py-2 text-left font-medium">Time</th>
                <th className="px-2 py-2 text-left font-medium hidden sm:table-cell">Pace</th>
                <th className="px-2 py-2 text-left font-medium">Accuracy</th>
                <th className="px-2 py-2 text-center font-medium">Kills</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runnerDetails.legs.map((leg) => {
                const dist = leg.effectiveDistance ?? leg.distance
                const projectedTime = runnerDetails.projectedPace * dist
                const zone = leg.clockTime ? calculateZone(leg.clockTime, projectedTime) : null

                return (
                  <tr key={leg.legNumber} className={leg.clockTime ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                    <td className="px-2 py-1.5 font-medium">{leg.legNumber}</td>
                    <td className="px-2 py-1.5">{leg.distance.toFixed(1)}</td>
                    <td className="px-2 py-1.5">
                      {leg.clockTime ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(leg.clockTime)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 hidden sm:table-cell">
                      {leg.pace ? formatPace(leg.pace) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      {zone ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${zone.bg} ${zone.color}`}>
                          <span className="hidden sm:inline">{zone.zone}</span>
                          <span className="sm:hidden">{abbreviateZone(zone.zone)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {leg.clockTime ? (
                        leg.kills > 0 ? (
                          <span className="flex items-center justify-center gap-1 text-amber-600">
                            <Trophy className="h-3 w-3" />
                            {leg.kills}
                          </span>
                        ) : (
                          '0'
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {completedLegs.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-sm pt-2">
            <div>
              <span className="text-muted-foreground">Total time: </span>
              <span className="font-medium">
                {formatTime(runnerDetails.legs.reduce((sum, l) => sum + (l.clockTime || 0), 0))}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total kills: </span>
              <span className="font-medium">
                {runnerDetails.legs.reduce((sum, l) => sum + l.kills, 0)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
