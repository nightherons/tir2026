import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { Team } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

// Preset team colors for quick selection
const presetColors = [
  { name: 'Black', value: '#1f2937' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Green', value: '#16a34a' },
  { name: 'White', value: '#f1f5f9' },
  { name: 'Grey', value: '#6b7280' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Yellow', value: '#ca8a04' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Navy', value: '#1e3a8a' },
]

export default function TeamsManager() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{ name: string; city: 'Houston' | 'Dallas'; color: string }>({ name: '', city: 'Houston', color: '#3b82f6' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => adminApi.getTeams(),
  })

  const teams: Team[] = data?.data?.data || []

  const createMutation = useMutation({
    mutationFn: (data: { name: string; city: string; color: string }) => adminApi.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      setIsAdding(false)
      setFormData({ name: '', city: 'Houston', color: '#3b82f6' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Team> }) =>
      adminApi.updateTeam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const startEdit = (team: Team) => {
    setEditingId(team.id)
    setFormData({ name: team.name, city: team.city as 'Houston' | 'Dallas', color: team.color || '#3b82f6' })
    setIsAdding(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ name: '', city: 'Houston', color: '#3b82f6' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">
            Manage race teams and their configurations
          </p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        )}
      </div>

      {/* Add/Edit form */}
      {(isAdding || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Team' : 'Add New Team'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Team Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    placeholder="e.g., BLACK, BLUE"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    City
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value as 'Houston' | 'Dallas' })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Houston">Houston</option>
                    <option value="Dallas">Dallas</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Team Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-9 w-12 rounded-md border border-input cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              {/* Preset colors */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Quick Colors
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: preset.value })}
                      className={cn(
                        "w-8 h-8 rounded-md border-2 transition-all",
                        formData.color === preset.value ? "ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
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

      {/* Teams grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <Card key={team.id} className="group relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: team.color || '#3b82f6' }}
                    />
                    <h3 className="font-semibold text-lg">{team.name}</h3>
                  </div>
                  <Badge variant="secondary">{team.city}</Badge>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-2">
                    <Users className="h-4 w-4" />
                    <span>{team.runners?.length || 0} runners</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEdit(team)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Delete this team? This cannot be undone.')) {
                        deleteMutation.mutate(team.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && !isAdding && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No teams yet</p>
            <p className="text-sm text-muted-foreground">Click "Add Team" to create one</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
