import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User, Clock, Trophy } from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

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
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
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

export default function RunnerSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null)

  // Search runners
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['runner-search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return []
      const res = await api.get(`/dashboard/runners/search?q=${encodeURIComponent(searchQuery)}`)
      return res.data?.data as { id: string; name: string; teamName: string }[]
    },
    enabled: searchQuery.length >= 2,
  })

  // Get runner details when selected
  const { data: runnerDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['runner-details', selectedRunnerId],
    queryFn: async () => {
      if (!selectedRunnerId) return null
      const res = await api.get(`/dashboard/runners/${selectedRunnerId}`)
      return res.data?.data as RunnerResult
    },
    enabled: !!selectedRunnerId,
  })

  const handleSelectRunner = (runnerId: string) => {
    setSelectedRunnerId(runnerId)
    setSearchQuery('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Runner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by runner name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search results dropdown */}
        {searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
          <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
            {searchResults.map((runner) => (
              <button
                key={runner.id}
                onClick={() => handleSelectRunner(runner.id)}
                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
              >
                <span className="font-medium">{runner.name}</span>
                <Badge variant="outline">{runner.teamName}</Badge>
              </button>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults?.length === 0 && !searchLoading && (
          <p className="text-sm text-muted-foreground text-center py-2">No runners found</p>
        )}

        {/* Selected runner details */}
        {selectedRunnerId && runnerDetails && (
          <div className="space-y-4 pt-2 border-t">
            {/* Runner info header */}
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

            {/* Projected pace */}
            <div className="text-sm">
              <span className="text-muted-foreground">Projected pace: </span>
              <span className="font-medium">{formatPace(runnerDetails.projectedPace)}</span>
            </div>

            {/* Legs table */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Assigned Legs</h4>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Leg</th>
                      <th className="px-3 py-2 text-left font-medium">Distance</th>
                      <th className="px-3 py-2 text-left font-medium">Time</th>
                      <th className="px-3 py-2 text-left font-medium">Pace</th>
                      <th className="px-3 py-2 text-center font-medium">Kills</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {runnerDetails.legs.map((leg) => (
                      <tr key={leg.legNumber} className={leg.clockTime ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                        <td className="px-3 py-2 font-medium">Leg {leg.legNumber}</td>
                        <td className="px-3 py-2">{leg.distance.toFixed(2)} mi</td>
                        <td className="px-3 py-2">
                          {leg.clockTime ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(leg.clockTime)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {leg.pace ? formatPace(leg.pace) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
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
                <div className="flex gap-4 text-sm pt-2">
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
        )}

        {detailsLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
