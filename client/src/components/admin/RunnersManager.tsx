import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, KeyRound, Users } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { Runner, Team } from '../../types'
import { formatPace } from '../../utils/time'
import { getRunnerLegNumbers } from '../../utils/legAssignments'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

function RunnerEditForm({
  runner,
  teams,
  onCancel,
  onSaved,
}: {
  runner?: Runner
  teams: Team[]
  onCancel: () => void
  onSaved: () => void
}) {
  const isEditing = !!runner
  const [formData, setFormData] = useState(() => {
    let legAssignmentsStr = ''
    if (runner?.legAssignments) {
      try {
        const parsed = JSON.parse(runner.legAssignments)
        if (Array.isArray(parsed)) legAssignmentsStr = parsed.join(', ')
      } catch { /* ignore */ }
    }
    return {
      name: runner?.name || '',
      teamId: runner?.teamId || teams[0]?.id || '',
      vanNumber: runner?.vanNumber || 1,
      runOrder: runner?.runOrder || 1,
      projectedPace: runner?.projectedPace || 420,
      legAssignments: legAssignmentsStr,
      pin: '',
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof adminApi.createRunner>[0]) => adminApi.createRunner(data),
    onSuccess: () => onSaved(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.updateRunner(id, data),
    onSuccess: () => onSaved(),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const legNums = formData.legAssignments
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 36)
    const { pin, ...rest } = formData
    const submitData: Record<string, unknown> = {
      ...rest,
      legAssignments: legNums.length > 0 ? JSON.stringify(legNums) : null,
    }
    if (pin) {
      submitData.pin = pin
    }
    if (isEditing) {
      updateMutation.mutate({ id: runner.id, data: submitData })
    } else {
      createMutation.mutate(submitData as Parameters<typeof adminApi.createRunner>[0])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/50 rounded-lg border">
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
        {!isEditing && (
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
        )}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Leg Assignments (optional)</label>
          <Input
            value={formData.legAssignments}
            onChange={(e) => setFormData({ ...formData, legAssignments: e.target.value })}
            placeholder="e.g. 1, 12, 23, 34"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated leg numbers. Leave blank for standard rotation.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">PIN {isEditing ? '(leave blank to keep current)' : '(leave blank to auto-generate)'}</label>
          <Input
            value={formData.pin}
            onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
            placeholder={isEditing ? 'Keep current PIN' : 'Auto-generate'}
            maxLength={8}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

export default function RunnersManager() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterTeam, setFilterTeam] = useState<string>('')

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

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-runners'] })
    setEditingId(null)
    setIsAdding(false)
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

      {/* Add form (top-level, only for new runners) */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Runner</CardTitle>
          </CardHeader>
          <CardContent>
            <RunnerEditForm
              teams={teams}
              onCancel={() => setIsAdding(false)}
              onSaved={handleSaved}
            />
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
                          <th className="pb-3 text-left font-medium text-muted-foreground">Legs</th>
                          <th className="pb-3 text-left font-medium text-muted-foreground">Projected Pace</th>
                          <th className="pb-3 text-right font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {vanRunners
                          .sort((a, b) => a.runOrder - b.runOrder)
                          .map((runner) => (
                            <React.Fragment key={runner.id}>
                              <tr className="group">
                                <td className="py-3">
                                  <Badge variant="outline">{runner.runOrder}</Badge>
                                </td>
                                <td className="py-3 font-medium">{runner.name}</td>
                                <td className="py-3 text-sm text-muted-foreground">
                                  {getRunnerLegNumbers(runner).join(', ')}
                                </td>
                                <td className="py-3 font-mono text-muted-foreground">
                                  {formatPace(runner.projectedPace)}
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingId(editingId === runner.id ? null : runner.id)}
                                    >
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
                              {editingId === runner.id && (
                                <tr>
                                  <td colSpan={5} className="py-3">
                                    <RunnerEditForm
                                      runner={runner}
                                      teams={teams}
                                      onCancel={() => setEditingId(null)}
                                      onSaved={handleSaved}
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
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
