import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, LogOut, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { captainApi, entryApi } from '../services/api'
import type { Runner, Leg } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { cn } from '@/lib/utils'

export default function CaptainEntry() {
  const { logout } = useAuthStore()
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null)
  const [selectedLeg, setSelectedLeg] = useState<number | null>(null)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [kills, setKills] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const { data: vanData, isLoading } = useQuery({
    queryKey: ['captain-van'],
    queryFn: () => captainApi.getVanRoster(),
  })

  const runners: Runner[] = vanData?.data?.data?.runners || []
  const legs: Leg[] = vanData?.data?.data?.legs || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRunner || selectedLeg === null) return

    const clockTime =
      (parseInt(hours || '0') * 3600) +
      (parseInt(minutes || '0') * 60) +
      parseInt(seconds || '0')

    if (clockTime === 0) {
      setError('Please enter a valid time')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await entryApi.submitVanTime({
        runnerId: selectedRunner.id,
        legNumber: selectedLeg,
        clockTime,
        kills: parseInt(kills || '0'),
      })
      setSuccess(true)
      setHours('')
      setMinutes('')
      setSeconds('')
      setKills('')
      setSelectedRunner(null)
      setSelectedLeg(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to submit time')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get legs for selected runner
  const runnerLegs = selectedRunner
    ? legs.filter((leg) => {
        const vanNumber = selectedRunner.vanNumber
        const runOrder = selectedRunner.runOrder
        // Van 1: legs 1-6, 13-18, 25-30
        // Van 2: legs 7-12, 19-24, 31-36
        const baseLeg = vanNumber === 1 ? runOrder : runOrder + 6
        return [baseLeg, baseLeg + 12, baseLeg + 24].includes(leg.legNumber)
      })
    : []

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
              <span className="text-xs font-bold text-white">TIR</span>
            </div>
            <span className="font-semibold">Van Captain Entry</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-2xl py-6">
        {success && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-green-800 dark:text-green-200 font-medium">Time submitted successfully!</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Runner selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Runner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {runners.map((runner) => (
                  <button
                    key={runner.id}
                    type="button"
                    onClick={() => {
                      setSelectedRunner(runner)
                      setSelectedLeg(null)
                    }}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      selectedRunner?.id === runner.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{runner.name}</p>
                    <p className="text-sm text-muted-foreground">Runner #{runner.runOrder}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leg selection */}
          {selectedRunner && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Leg</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {runnerLegs.map((leg) => (
                    <button
                      key={leg.id}
                      type="button"
                      onClick={() => setSelectedLeg(leg.legNumber)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all",
                        selectedLeg === leg.legNumber
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <p className="font-bold text-lg">Leg {leg.legNumber}</p>
                      <p className="text-sm text-muted-foreground">{leg.distance} mi</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Time entry */}
          {selectedRunner && selectedLeg !== null && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Enter Time
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

                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">Kills (runners passed)</label>
                    <Input
                      type="number"
                      min="0"
                      value={kills}
                      onChange={(e) => setKills(e.target.value)}
                      className="w-24"
                      placeholder="0"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="xl"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Time'}
              </Button>
            </>
          )}
        </form>
      </main>
    </div>
  )
}
