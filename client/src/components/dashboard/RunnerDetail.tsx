import { useQuery } from '@tanstack/react-query'
import { User, Clock, Trophy } from 'lucide-react'
import { api } from '@/services/api'

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

      {/* Projected pace */}
      <div className="text-sm">
        <span className="text-muted-foreground">Projected pace: </span>
        <span className="font-medium">{formatPace(runnerDetails.projectedPace)}</span>
      </div>

      {/* Legs table */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Assigned Legs</h4>
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 sm:px-3 py-2 text-left font-medium">Leg</th>
                <th className="px-2 sm:px-3 py-2 text-left font-medium">Dist</th>
                <th className="px-2 sm:px-3 py-2 text-left font-medium">Time</th>
                <th className="px-2 sm:px-3 py-2 text-left font-medium">Pace</th>
                <th className="px-2 sm:px-3 py-2 text-center font-medium">Kills</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runnerDetails.legs.map((leg) => (
                <tr key={leg.legNumber} className={leg.clockTime ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                  <td className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">{leg.legNumber}</td>
                  <td className="px-2 sm:px-3 py-2 whitespace-nowrap">{leg.distance.toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                    {leg.clockTime ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(leg.clockTime)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                    {leg.pace ? formatPace(leg.pace) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 sm:px-3 py-2 text-center">
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {runnerDetails.legs.some(l => l.clockTime) && (
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
