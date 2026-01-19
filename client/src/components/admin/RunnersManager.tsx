import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, KeyRound, Users } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { Runner, Team } from '../../types'
import { formatPace } from '../../utils/time'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

export default function RunnersManager() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterTeam, setFilterTeam] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    teamId: '',
    vanNumber: 1,
    runOrder: 1,
    projectedPace: 420, // 7:00/mile in seconds
  })

  const { data: runnersData, isLoading } = useQuery({
    queryKey: ['admin-runners'],
    queryFn: () => adminApi.getRunners(),
  })

  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => adminApi.getTeams(),
  })

  const runners: Runner[] = runnersData?.data?.data || []
  const teams: Team[] = teamsData?.data?.data || []

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => adminApi.createRunner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-runners'] })
      setIsAdding(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.updateRunner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-runners'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteRunner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-runners'] })
    },
  })

  const regeneratePinMutation = useMutation({
    mutationFn: (id: string) => adminApi.regeneratePin(id),
    onSuccess: (data) => {
      alert(`New PIN: ${data.data?.data?.pin}`)
      queryClient.invalidateQueries({ queryKey: ['admin-runners'] })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      teamId: teams[0]?.id || '',
      vanNumber: 1,
      runOrder: 1,
      projectedPace: 420,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const startEdit = (runner: Runner) => {
    setEditingId(runner.id)
    setFormData({
      name: runner.name,
      teamId: runner.teamId,
      vanNumber: runner.vanNumber,
      runOrder: runner.runOrder,
      projectedPace: runner.projectedPace,
    })
    setIsAdding(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    resetForm()
  }

  const filteredRunners = filterTeam
    ? runners.filter((r) => r.teamId === filterTeam)
    : runners

  // Group runners by team and van
  const groupedRunners = filteredRunners.reduce((acc, runner) => {
    const key = `${runner.teamId}-${runner.vanNumber}`
    if (!acc[key]) acc[key] = []
    acc[key].push(runner)
    return acc
  }, {} as Record<string, Runner[]>)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Runners</h2>
          <p className="text-muted-foreground">
            {runners.length} runners across {teams.length} teams
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {!isAdding && !editingId && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Runner
            </Button>
          )}
        </div>
      </div>

      {/* Add/Edit form */}
      {(isAdding || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Runner' : 'Add New Runner'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Runner name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team</label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Van</label>
                  <select
                    value={formData.vanNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, vanNumber: parseInt(e.target.value) as 1 | 2 })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={1}>Van 1</option>
                    <option value={2}>Van 2</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order (1-6)</label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.runOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, runOrder: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Projected Pace (min:sec per mile)</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="4"
                    max="15"
                    className="w-20"
                    value={Math.floor(formData.projectedPace / 60)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        projectedPace:
                          parseInt(e.target.value) * 60 + (formData.projectedPace % 60),
                      })
                    }
                    placeholder="min"
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    className="w-20"
                    value={formData.projectedPace % 60}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        projectedPace:
                          Math.floor(formData.projectedPace / 60) * 60 +
                          parseInt(e.target.value),
                      })
                    }
                    placeholder="sec"
                  />
                  <span className="text-sm text-muted-foreground">per mile</span>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Runners grouped by team/van */}
      <div className="space-y-6">
        {Object.entries(groupedRunners)
          .sort()
          .map(([key, vanRunners]) => {
            const [teamId, vanNumber] = key.split('-')
            const team = teams.find((t) => t.id === teamId)
            return (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{team?.name}</CardTitle>
                    <Badge variant="secondary">Van {vanNumber}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-3 text-left font-medium text-muted-foreground">Order</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Name</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Projected Pace</th>
                          <th className="pb-3 text-right font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {vanRunners
                          .sort((a, b) => a.runOrder - b.runOrder)
                          .map((runner) => (
                            <tr key={runner.id} className="group">
                              <td className="py-3">
                                <Badge variant="outline">{runner.runOrder}</Badge>
                              </td>
                              <td className="py-3 font-medium">{runner.name}</td>
                              <td className="py-3 font-mono text-muted-foreground">
                                {formatPace(runner.projectedPace)}
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" onClick={() => startEdit(runner)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => regeneratePinMutation.mutate(runner.id)}
                                    title="Generate new PIN"
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm('Delete this runner?')) {
                                        deleteMutation.mutate(runner.id)
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {runners.length === 0 && !isAdding && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No runners yet</p>
            <p className="text-sm text-muted-foreground">Add teams first, then add runners</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
