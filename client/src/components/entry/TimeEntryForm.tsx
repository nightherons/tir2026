import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { runnerApi, entryApi } from '../../services/api'
import { queryClient } from '../../lib/queryClient'
import type { Leg } from '../../types'

interface TimeEntryFormProps {
  onSuccess: () => void
}

export default function TimeEntryForm({ onSuccess }: TimeEntryFormProps) {
  const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [kills, setKills] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: legsData, isLoading } = useQuery({
    queryKey: ['runner-legs'],
    queryFn: () => runnerApi.getMyLegs(),
  })

  const legs: Leg[] = legsData?.data?.data?.legs || []
  const completedLegNumbers: number[] = legsData?.data?.data?.completedLegs || []

  // Auto-select next incomplete leg
  useEffect(() => {
    if (legs.length > 0 && !selectedLeg) {
      const nextLeg = legs.find((leg) => !completedLegNumbers.includes(leg.legNumber))
      if (nextLeg) {
        setSelectedLeg(nextLeg)
      }
    }
  }, [legs, completedLegNumbers, selectedLeg])

  const handleSubmit = async () => {
    if (!selectedLeg) return

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
      await entryApi.submitTime({
        legNumber: selectedLeg.legNumber,
        clockTime,
        kills: parseInt(kills || '0'),
      })
      // Reset form and clear selected leg so useEffect picks the next one after refetch
      setHours('')
      setMinutes('')
      setSeconds('')
      setKills('')
      setSelectedLeg(null)
      await queryClient.refetchQueries({ queryKey: ['runner-legs'] })
      onSuccess()
    } catch (err) {
      setError('Failed to submit time. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Leg selection */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-2">Your Legs</h3>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {legs.map((leg) => {
            const isCompleted = completedLegNumbers.includes(leg.legNumber)
            const isSelected = selectedLeg?.id === leg.id

            return (
              <button
                key={leg.id}
                type="button"
                onClick={() => !isCompleted && setSelectedLeg(leg)}
                disabled={isCompleted}
                className={`p-2 sm:p-3 rounded-lg border-2 text-center transition-all ${
                  isCompleted
                    ? 'border-green-200 bg-green-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`font-bold text-sm sm:text-base ${isCompleted ? 'text-green-600' : 'text-gray-900'}`}>
                  Leg {leg.legNumber}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">{leg.distance} mi</p>
                {isCompleted && (
                  <span className="text-xs text-green-600">Done</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedLeg && (
        <>
          {/* Time entry */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              Enter Time for Leg {selectedLeg.legNumber}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-4">
              {selectedLeg.distance} mi
              {selectedLeg.startPoint && ` • ${selectedLeg.startPoint}`}
              {selectedLeg.endPoint && ` → ${selectedLeg.endPoint}`}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 text-center">
                  Hours
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="input text-center text-2xl sm:text-3xl font-mono py-2 sm:py-4"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 text-center">
                  Min
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="input text-center text-2xl sm:text-3xl font-mono py-2 sm:py-4"
                  placeholder="00"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 text-center">
                  Sec
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="input text-center text-2xl sm:text-3xl font-mono py-2 sm:py-4"
                  placeholder="00"
                />
              </div>
            </div>
          </div>

          {/* Kills */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Kills</h3>
                <p className="text-xs text-gray-500">Runners passed</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setKills(Math.max(0, parseInt(kills || '0') - 1).toString())}
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl sm:text-2xl"
                >
                  -
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={kills}
                  onChange={(e) => setKills(e.target.value)}
                  className="w-14 sm:w-20 text-center text-2xl sm:text-3xl font-mono border-b-2 border-gray-300 focus:border-blue-500 outline-none py-1"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => setKills((parseInt(kills || '0') + 1).toString())}
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl sm:text-2xl"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full btn-primary py-3 sm:py-4 text-base sm:text-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Time'}
          </button>
        </>
      )}

      {!selectedLeg && legs.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          All your legs have been completed!
        </div>
      )}
    </div>
  )
}
