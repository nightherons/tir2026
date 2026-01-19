import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { Runner, Leg, Team } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'

export default function TimeEntryAdmin() {
  const queryClient = useQueryClient()
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedRunner, setSelectedRunner] = useState('')
  const [selectedLeg, setSelectedLeg] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [kills, setKills] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const { data: teamsData } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => adminApi.getTeams(),
  })

  const { data: runnersData } = useQuery({
    queryKey: ['admin-runners'],
    queryFn: () => adminApi.getRunners(),
  })

  const { data: legsData } = useQuery({
    queryKey: ['admin-legs'],
    queryFn: () => adminApi.getLegs(),
  })

  const teams: Team[] = teamsData?.data?.data || []
  const allRunners: Runner[] = runnersData?.data?.data || []
  const legs: Leg[] = legsData?.data?.data || []

  const filteredRunners = selectedTeam
    ? allRunners.filter((r) => r.teamId === selectedTeam)
    : []

  const selectedRunnerObj = allRunners.find((r) => r.id === selectedRunner)

  // Get legs for selected runner based on their van and order
  const runnerLegs = selectedRunnerObj
    ? legs.filter((leg) => {
        const vanNumber = selectedRunnerObj.vanNumber
        const runOrder = selectedRunnerObj.runOrder
        const baseLeg = vanNumber === 1 ? runOrder : runOrder + 6
        return [baseLeg, baseLeg + 12, baseLeg + 24].includes(leg.legNumber)
      })
    : []

  const submitMutation = useMutation({
    mutationFn: (data: {
      runnerId: string
      legNumber: number
      clockTime: number
      kills: number
    }) => adminApi.submitAnyTime(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSuccess(true)
      setHours('')
      setMinutes('')
      setSeconds('')
      setKills('')
      setSelectedLeg('')
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: () => {
      setError('Failed to submit time')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedRunner || !selectedLeg) {
      setError('Please select a runner and leg')
      return
    }

    const clockTime =
      (parseInt(hours || '0') * 3600) +
      (parseInt(minutes || '0') * 60) +
      parseInt(seconds || '0')

    if (clockTime === 0) {
      setError('Please enter a valid time')
      return
    }

    submitMutation.mutate({
      runnerId: selectedRunner,
      legNumber: parseInt(selectedLeg),
      clockTime,
      kills: parseInt(kills || '0'),
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Time Entry</h2>
        <p className="text-muted-foreground">Enter times for any runner on any leg</p>
      </div>

      {success && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">Time submitted successfully!</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeam(team.id)
                    setSelectedRunner('')
                    setSelectedLeg('')
                  }}
                  className={cn(
                    "p-3 rounded-lg border-2 text-center transition-all font-medium",
                    selectedTeam === team.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Runner selection */}
        {selectedTeam && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Runner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredRunners
                  .sort((a, b) => a.vanNumber - b.vanNumber || a.runOrder - b.runOrder)
                  .map((runner) => (
                    <button
                      key={runner.id}
                      type="button"
                      onClick={() => {
                        setSelectedRunner(runner.id)
                        setSelectedLeg('')
                      }}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        selectedRunner === runner.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <p className="font-medium">{runner.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Van {runner.vanNumber} • #{runner.runOrder}
                      </p>
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leg selection */}
        {selectedRunner && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Leg</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {runnerLegs
                  .sort((a, b) => a.legNumber - b.legNumber)
                  .map((leg) => (
                    <button
                      key={leg.id}
                      type="button"
                      onClick={() => setSelectedLeg(leg.legNumber.toString())}
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all",
                        selectedLeg === leg.legNumber.toString()
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <p className="font-bold">Leg {leg.legNumber}</p>
                      <p className="text-sm text-muted-foreground">{leg.distance} mi</p>
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time entry */}
        {selectedLeg && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground text-center block">
                      Hours
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="text-center text-2xl h-14"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground text-center block">
                      Minutes
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      className="text-center text-2xl h-14"
                      placeholder="00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground text-center block">
                      Seconds
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={seconds}
                      onChange={(e) => setSeconds(e.target.value)}
                      className="text-center text-2xl h-14"
                      placeholder="00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kills (runners passed)</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min="0"
                  value={kills}
                  onChange={(e) => setKills(e.target.value)}
                  className="w-24"
                  placeholder="0"
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Time'}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
