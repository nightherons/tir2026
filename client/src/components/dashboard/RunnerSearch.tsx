import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import RunnerDetail from './RunnerDetail'

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
        {selectedRunnerId && (
          <div className="pt-2 border-t">
            <RunnerDetail
              runnerId={selectedRunnerId}
              onClose={() => setSelectedRunnerId(null)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
