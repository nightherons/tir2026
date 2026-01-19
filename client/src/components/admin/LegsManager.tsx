import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Route } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { Leg } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

export default function LegsManager() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    legNumber: number
    distance: number
    startPoint: string
    endPoint: string
    elevation: number
    difficulty: 'easy' | 'moderate' | 'hard'
  }>({
    legNumber: 1,
    distance: 5.0,
    startPoint: '',
    endPoint: '',
    elevation: 0,
    difficulty: 'moderate',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-legs'],
    queryFn: () => adminApi.getLegs(),
  })

  const legs: Leg[] = data?.data?.data || []

  const createMutation = useMutation({
    mutationFn: (data: Partial<Leg>) => adminApi.createLeg(data as Parameters<typeof adminApi.createLeg>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-legs'] })
      setIsAdding(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.updateLeg(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-legs'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteLeg(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-legs'] })
    },
  })

  const resetForm = () => {
    const nextLeg = legs.length > 0 ? Math.max(...legs.map((l) => l.legNumber)) + 1 : 1
    setFormData({
      legNumber: nextLeg,
      distance: 5.0,
      startPoint: '',
      endPoint: '',
      elevation: 0,
      difficulty: 'moderate',
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

  const startEdit = (leg: Leg) => {
    setEditingId(leg.id)
    setFormData({
      legNumber: leg.legNumber,
      distance: leg.distance,
      startPoint: leg.startPoint || '',
      endPoint: leg.endPoint || '',
      elevation: leg.elevation || 0,
      difficulty: (leg.difficulty as 'easy' | 'moderate' | 'hard') || 'moderate',
    })
    setIsAdding(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    resetForm()
  }

  // Group legs by run (1-12, 13-24, 25-36)
  const run1 = legs.filter((l) => l.legNumber >= 1 && l.legNumber <= 12)
  const run2 = legs.filter((l) => l.legNumber >= 13 && l.legNumber <= 24)
  const run3 = legs.filter((l) => l.legNumber >= 25 && l.legNumber <= 36)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const renderLegTable = (runLegs: Leg[], runNumber: number) => (
    <Card key={runNumber}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Run {runNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left font-medium text-muted-foreground">Leg</th>
                <th className="pb-3 text-left font-medium text-muted-foreground">Distance</th>
                <th className="pb-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Start</th>
                <th className="pb-3 text-left font-medium text-muted-foreground hidden sm:table-cell">End</th>
                <th className="pb-3 text-left font-medium text-muted-foreground hidden md:table-cell">Elevation</th>
                <th className="pb-3 text-left font-medium text-muted-foreground">Difficulty</th>
                <th className="pb-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runLegs
                .sort((a, b) => a.legNumber - b.legNumber)
                .map((leg) => (
                  <tr key={leg.id} className="group">
                    <td className="py-3 font-medium">{leg.legNumber}</td>
                    <td className="py-3 font-mono">{leg.distance} mi</td>
                    <td className="py-3 text-muted-foreground hidden sm:table-cell">{leg.startPoint || '-'}</td>
                    <td className="py-3 text-muted-foreground hidden sm:table-cell">{leg.endPoint || '-'}</td>
                    <td className="py-3 hidden md:table-cell">{leg.elevation ? `${leg.elevation} ft` : '-'}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          leg.difficulty === 'easy'
                            ? 'success'
                            : leg.difficulty === 'hard'
                            ? 'destructive'
                            : 'warning'
                        }
                      >
                        {leg.difficulty || 'moderate'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(leg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Delete this leg?')) {
                              deleteMutation.mutate(leg.id)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Race Legs</h2>
          <p className="text-muted-foreground">
            {legs.length} of 36 legs configured
          </p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Leg
          </Button>
        )}
      </div>

      {/* Add/Edit form */}
      {(isAdding || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Leg' : 'Add New Leg'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leg #</label>
                  <Input
                    type="number"
                    min="1"
                    max="36"
                    value={formData.legNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, legNumber: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Distance (mi)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="20"
                    value={formData.distance}
                    onChange={(e) =>
                      setFormData({ ...formData, distance: parseFloat(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Elevation (ft)</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.elevation}
                    onChange={(e) =>
                      setFormData({ ...formData, elevation: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'moderate' | 'hard' })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Point</label>
                  <Input
                    type="text"
                    value={formData.startPoint}
                    onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                    placeholder="Exchange 1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Point</label>
                  <Input
                    type="text"
                    value={formData.endPoint}
                    onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                    placeholder="Exchange 2"
                  />
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

      {/* Legs by run */}
      <div className="space-y-6">
        {run1.length > 0 && renderLegTable(run1, 1)}
        {run2.length > 0 && renderLegTable(run2, 2)}
        {run3.length > 0 && renderLegTable(run3, 3)}
      </div>

      {legs.length === 0 && !isAdding && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Route className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No legs configured</p>
            <p className="text-sm text-muted-foreground">Import from CSV or add manually</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
