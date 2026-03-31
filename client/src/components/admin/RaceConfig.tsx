import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, CheckCircle2, Info, Flag, AlertTriangle } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import AdminUsers from './AdminUsers'

interface ConfigItem {
  key: string
  value: string
  label: string
  type: 'text' | 'datetime-local' | 'number'
}

const configFields: Omit<ConfigItem, 'value'>[] = [
  { key: 'raceName', label: 'Race Name', type: 'text' },
  { key: 'raceDate', label: 'Race Start Date/Time', type: 'datetime-local' },
  { key: 'totalLegs', label: 'Total Legs', type: 'number' },
  { key: 'runnersPerTeam', label: 'Runners Per Team', type: 'number' },
  { key: 'runnersPerVan', label: 'Runners Per Van', type: 'number' },
  { key: 'pinLength', label: 'Runner PIN Length (4-8 digits)', type: 'number' },
]

function RaceStatusCard({ config }: { config: Record<string, string> }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const raceStatus = config.raceStatus || 'pre-race'

  const finalizeMutation = useMutation({
    mutationFn: (status: string) => adminApi.updateConfig({ raceStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setConfirming(false)
    },
  })

  const isFinished = raceStatus === 'finished'

  return (
    <Card className={isFinished ? 'border-green-300 dark:border-green-800' : 'border-amber-300 dark:border-amber-800'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Race Status
        </CardTitle>
        <CardDescription>
          {isFinished
            ? 'The race has been finalized. Dashboard shows final results ranked by actual finish time.'
            : 'Finalize the race when all teams have finished to lock in final standings.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Current status:</span>
          <Badge variant={isFinished ? 'default' : 'secondary'}>
            {raceStatus === 'finished' ? 'Finished' : raceStatus === 'active' ? 'Active' : 'Pre-Race'}
          </Badge>
        </div>

        {!isFinished && !confirming && (
          <Button
            variant="default"
            onClick={() => setConfirming(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Flag className="h-4 w-4 mr-2" />
            Finalize Race
          </Button>
        )}

        {!isFinished && confirming && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This will switch the dashboard to show final results ranked by actual finish time.
                Are you sure all teams have finished?
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => finalizeMutation.mutate('finished')}
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? 'Finalizing...' : 'Yes, Finalize'}
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isFinished && (
          <Button
            variant="outline"
            onClick={() => finalizeMutation.mutate('active')}
            disabled={finalizeMutation.isPending}
          >
            {finalizeMutation.isPending ? 'Reverting...' : 'Revert to Active'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function RaceConfig() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.getConfig(),
  })

  const config: Record<string, string> = data?.data?.data || {}

  useEffect(() => {
    if (config) {
      const data = { ...config }
      // Convert ISO date to datetime-local format for the input
      if (data.raceDate) {
        const d = new Date(data.raceDate)
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, '0')
          data.raceDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        }
      }
      setFormData(data)
    }
  }, [config])

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => adminApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Convert datetime-local value to full ISO string with timezone
    const dataToSave = { ...formData }
    if (dataToSave.raceDate && !dataToSave.raceDate.includes('Z') && !dataToSave.raceDate.includes('+')) {
      dataToSave.raceDate = new Date(dataToSave.raceDate).toISOString()
    }
    updateMutation.mutate(dataToSave)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage admin users and race configuration
        </p>
      </div>

      {/* Admin Users Section */}
      <AdminUsers />

      {saved && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">Settings saved successfully!</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {configFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="text-sm font-medium">
                  {field.label}
                </label>
                <Input
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  className="max-w-md"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Default Values
            </CardTitle>
            <CardDescription>
              Pre-configured values for the Texas Independence Relay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Total Distance</span>
                <Badge variant="secondary">~200 miles</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Teams</span>
                <Badge variant="secondary">6</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Runners/Team</span>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Total Legs</span>
                <Badge variant="secondary">36</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Runs per Runner</span>
                <Badge variant="secondary">3</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Duration</span>
                <Badge variant="secondary">~22 hours</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard Settings</CardTitle>
            <CardDescription>
              Control what appears on the public dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={formData['showKills'] === 'true'}
                onChange={(e) =>
                  setFormData({ ...formData, showKills: e.target.checked ? 'true' : 'false' })
                }
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium">Show kill counts</span>
                <p className="text-xs text-muted-foreground">Display runner pass counts on dashboard</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={formData['showPaceChart'] === 'true'}
                onChange={(e) =>
                  setFormData({ ...formData, showPaceChart: e.target.checked ? 'true' : 'false' })
                }
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium">Show pace trend chart</span>
                <p className="text-xs text-muted-foreground">Display pace visualization over time</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={formData['showCurrentRunners'] === 'true'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    showCurrentRunners: e.target.checked ? 'true' : 'false',
                  })
                }
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium">Show currently running panel</span>
                <p className="text-xs text-muted-foreground">Display active runners on course</p>
              </div>
            </label>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      {/* Finalize Race */}
      <RaceStatusCard config={config} />
    </div>
  )
}
