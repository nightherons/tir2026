import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface DebugRunner {
  name: string
  van: number
  order: number
  paceSeconds: number
  pace: string
  assignedLegs: number[]
  customAssignments: string | null
}

interface DebugLeg {
  leg: number
  distance: number
  runner: string
  pacePerMile: string
  paceSeconds: number
  legTimeSeconds: number
  legTimeFormatted: string
  source: string
}

interface DebugTeam {
  team: string
  runnerCount: number
  runners: DebugRunner[]
  totalSeconds: number
  totalFormatted: string
  raceStartTime: string | null
  projectedFinish: string | null
  projectedFinishLocal: string | null
  legBreakdown: DebugLeg[]
}

export default function DebugInfo() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['debug'],
    queryFn: async () => {
      const res = await api.get('/dashboard/debug')
      return res.data?.data as DebugTeam[]
    },
  })

  if (isLoading) {
    return <div className="p-8 text-center">Loading debug data...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Failed to load debug data</div>
  }

  if (!data) return null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Debug Info</h2>
        <p className="text-muted-foreground">Race calculation breakdown per team</p>
      </div>

      {data.map((team) => (
        <Card key={team.team}>
          <CardHeader>
            <CardTitle>{team.team}</CardTitle>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{team.runnerCount} runners | Total: {team.totalFormatted} ({team.totalSeconds}s)</p>
              <p>Race start: {team.raceStartTime || 'Not set'}</p>
              <p>
                Projected finish (UTC): {team.projectedFinish || 'N/A'}
                {team.projectedFinish && (
                  <span className="ml-2 font-medium">
                    (Local: {new Date(team.projectedFinish).toLocaleString()})
                  </span>
                )}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Runners */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Runners</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Van</th>
                      <th className="px-2 py-1 text-left">Order</th>
                      <th className="px-2 py-1 text-left">Pace</th>
                      <th className="px-2 py-1 text-left">Pace (s)</th>
                      <th className="px-2 py-1 text-left">Legs</th>
                      <th className="px-2 py-1 text-left">Custom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {team.runners.map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1">{r.van}</td>
                        <td className="px-2 py-1">{r.order}</td>
                        <td className="px-2 py-1 font-mono">{r.pace}</td>
                        <td className="px-2 py-1 font-mono">{r.paceSeconds}</td>
                        <td className="px-2 py-1 font-mono">{r.assignedLegs.join(', ')}</td>
                        <td className="px-2 py-1 font-mono text-xs">{r.customAssignments || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leg Breakdown */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Leg Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">Leg</th>
                      <th className="px-2 py-1 text-left">Dist</th>
                      <th className="px-2 py-1 text-left">Runner</th>
                      <th className="px-2 py-1 text-left">Pace/mi</th>
                      <th className="px-2 py-1 text-left">Leg Time</th>
                      <th className="px-2 py-1 text-left">Seconds</th>
                      <th className="px-2 py-1 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {team.legBreakdown.map((l) => (
                      <tr key={l.leg} className={l.source === 'actual' ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                        <td className="px-2 py-1 font-medium">{l.leg}</td>
                        <td className="px-2 py-1">{l.distance} mi</td>
                        <td className="px-2 py-1">{l.runner}</td>
                        <td className="px-2 py-1 font-mono">{l.pacePerMile}</td>
                        <td className="px-2 py-1 font-mono">{l.legTimeFormatted}</td>
                        <td className="px-2 py-1 font-mono">{l.legTimeSeconds}</td>
                        <td className="px-2 py-1">
                          <span className={l.source === 'actual' ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {l.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
