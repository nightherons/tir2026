import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { runnerApi, entryApi } from '../../services/api'
import { queryClient } from '../../lib/queryClient'
import type { Leg } from '../../types'

const EXCHANGE_LEG_A = 12
const EXCHANGE_LEG_B = 13
const EXCHANGE_MAX_ADJUSTMENT = 2 // ±2 miles
const EXCHANGE_STEP = 0.1

interface TimeEntryFormProps {
  onSuccess: () => void
}

export default function TimeEntryForm({ onSuccess }: TimeEntryFormProps) {
  const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [kills, setKills] = useState('')
  const [distanceAdjustment, setDistanceAdjustment] = useState(0) // offset from base distance
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: legsData, isLoading } = useQuery({
    queryKey: ['runner-legs'],
    queryFn: () => runnerApi.getMyLegs(),
  })

  const legs: Leg[] = legsData?.data?.data?.legs || []
  const completedLegNumbers: number[] = legsData?.data?.data?.completedLegs || []
  const existingResults: Record<number, { clockTime: number; kills: number }> = legsData?.data?.data?.existingResults || {}
  const adjustedDistances: Record<number, number> = legsData?.data?.data?.adjustedDistances || {}
  const [isEditing, setIsEditing] = useState(false)

  // Auto-select next incomplete leg
  useEffect(() => {
    if (legs.length > 0 && !selectedLeg) {
      const nextLeg = legs.find((leg) => !completedLegNumbers.includes(leg.legNumber))
      if (nextLeg) {
        setSelectedLeg(nextLeg)
      }
    }
  }, [legs, completedLegNumbers, selectedLeg])

  // Reset distance adjustment and editing state when leg changes
  useEffect(() => {
    setDistanceAdjustment(0)
  }, [selectedLeg?.id])

  // Pre-populate form when editing a completed leg
  const handleSelectLeg = (leg: Leg) => {
    const isCompleted = completedLegNumbers.includes(leg.legNumber)
    setSelectedLeg(leg)
    if (isCompleted && existingResults[leg.legNumber]) {
      const { clockTime, kills: existingKills } = existingResults[leg.legNumber]
      const h = Math.floor(clockTime / 3600)
      const m = Math.floor((clockTime % 3600) / 60)
      const s = clockTime % 60
      setHours(h > 0 ? h.toString() : '')
      setMinutes(m > 0 ? m.toString() : '')
      setSeconds(s > 0 ? s.toString() : '')
      setKills(existingKills > 0 ? existingKills.toString() : '')
      setIsEditing(true)
    } else {
      setHours('')
      setMinutes('')
      setSeconds('')
      setKills('')
      setIsEditing(false)
    }
  }

  const isExchangeLeg = selectedLeg?.legNumber === EXCHANGE_LEG_A

  // Get leg 13 base distance for showing the complement
  const leg13 = legs.find(l => l.legNumber === EXCHANGE_LEG_B)
  const leg13Base = leg13?.distance
  // If not in this runner's legs, try to get from seed data (6.05)
  const leg13BaseDistance = leg13Base ?? 6.05

  const effectiveLeg12Distance = selectedLeg && isExchangeLeg
    ? Math.round((selectedLeg.distance + distanceAdjustment) * 100) / 100
    : null
  const effectiveLeg13Distance = selectedLeg && isExchangeLeg
    ? Math.round((leg13BaseDistance - distanceAdjustment) * 100) / 100
    : null

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
      const payload: {
        legNumber: number
        clockTime: number
        kills: number
        adjustedDistance?: number
      } = {
        legNumber: selectedLeg.legNumber,
        clockTime,
        kills: parseInt(kills || '0'),
      }

      // Include adjusted distance for exchange zone leg 12
      if (isExchangeLeg && distanceAdjustment !== 0) {
        payload.adjustedDistance = effectiveLeg12Distance!
      }

      await entryApi.submitTime(payload)
      // Reset form and clear selected leg so useEffect picks the next one after refetch
      setHours('')
      setMinutes('')
      setSeconds('')
      setKills('')
      setDistanceAdjustment(0)
      setIsEditing(false)
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
            const adjDist = adjustedDistances[leg.legNumber]
            const displayDistance = adjDist ?? leg.distance

            return (
              <button
                key={leg.id}
                type="button"
                onClick={() => handleSelectLeg(leg)}
                className={`p-2 sm:p-3 rounded-lg border-2 text-center transition-all ${
                  isCompleted
                    ? isSelected
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-green-200 bg-green-50 hover:border-amber-300'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`font-bold text-sm sm:text-base ${isCompleted ? (isSelected ? 'text-amber-600' : 'text-green-600') : 'text-gray-900'}`}>
                  Leg {leg.legNumber}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {displayDistance} mi
                  {adjDist != null && adjDist !== leg.distance && (
                    <span className="text-amber-600"> *</span>
                  )}
                </p>
                {isCompleted && (
                  <span className={`text-xs ${isSelected ? 'text-amber-600' : 'text-green-600'}`}>
                    {isSelected ? 'Editing' : 'Done'}
                  </span>
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
              {isEditing ? 'Edit' : 'Enter'} Time for Leg {selectedLeg.legNumber}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-4">
              {isExchangeLeg ? `${effectiveLeg12Distance} mi` : `${adjustedDistances[selectedLeg.legNumber] ?? selectedLeg.distance} mi`}
              {selectedLeg.startPoint && ` • ${selectedLeg.startPoint}`}
              {selectedLeg.endPoint && ` \u2192 ${selectedLeg.endPoint}`}
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

          {/* Exchange zone distance adjustment — only for leg 12 */}
          {isExchangeLeg && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">
                Exchange Zone Distance
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Adjust where you exchanged with the Leg 13 runner. Use your watch distance.
              </p>

              <div className="space-y-3">
                {/* Slider */}
                <div>
                  <input
                    type="range"
                    min={-EXCHANGE_MAX_ADJUSTMENT}
                    max={EXCHANGE_MAX_ADJUSTMENT}
                    step={EXCHANGE_STEP}
                    value={distanceAdjustment}
                    onChange={(e) => setDistanceAdjustment(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{(selectedLeg.distance - EXCHANGE_MAX_ADJUSTMENT).toFixed(1)} mi</span>
                    <span>{selectedLeg.distance.toFixed(1)} mi</span>
                    <span>{(selectedLeg.distance + EXCHANGE_MAX_ADJUSTMENT).toFixed(1)} mi</span>
                  </div>
                </div>

                {/* Direct input */}
                <div className="flex items-center justify-center gap-3">
                  <label className="text-sm text-gray-700">Your distance:</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={(selectedLeg.distance - EXCHANGE_MAX_ADJUSTMENT).toFixed(2)}
                    max={(selectedLeg.distance + EXCHANGE_MAX_ADJUSTMENT).toFixed(2)}
                    value={effectiveLeg12Distance?.toFixed(2) ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        const offset = Math.max(
                          -EXCHANGE_MAX_ADJUSTMENT,
                          Math.min(EXCHANGE_MAX_ADJUSTMENT, val - selectedLeg.distance)
                        )
                        setDistanceAdjustment(Math.round(offset * 100) / 100)
                      }
                    }}
                    className="input w-24 text-center text-lg font-mono"
                  />
                  <span className="text-sm text-gray-500">mi</span>
                </div>

                {/* Show impact on leg 13 */}
                <div className={`rounded-lg p-3 text-center ${
                  distanceAdjustment !== 0
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Leg 12 (you)</p>
                      <p className="font-bold text-lg">{effectiveLeg12Distance?.toFixed(2)} mi</p>
                      {distanceAdjustment !== 0 && (
                        <p className="text-xs text-gray-400">
                          base: {selectedLeg.distance} mi ({distanceAdjustment > 0 ? '+' : ''}{distanceAdjustment.toFixed(1)})
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500">Leg 13</p>
                      <p className="font-bold text-lg">{effectiveLeg13Distance?.toFixed(2)} mi</p>
                      {distanceAdjustment !== 0 && (
                        <p className="text-xs text-gray-400">
                          base: {leg13BaseDistance} mi ({distanceAdjustment > 0 ? '-' : '+'}{Math.abs(distanceAdjustment).toFixed(1)})
                        </p>
                      )}
                    </div>
                  </div>
                  {distanceAdjustment === 0 && (
                    <p className="text-xs text-gray-400 mt-2">No adjustment - using default exchange point</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Leg 13 adjusted distance notice */}
          {selectedLeg.legNumber === EXCHANGE_LEG_B && adjustedDistances[EXCHANGE_LEG_B] != null && (
            <div className="card bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-800">
                Your Leg 13 distance was adjusted to <strong>{adjustedDistances[EXCHANGE_LEG_B]} mi</strong> by the Leg 12 runner's exchange zone selection.
              </p>
            </div>
          )}

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
            {isSubmitting ? 'Submitting...' : isEditing ? 'Update Time' : 'Submit Time'}
          </button>
        </>
      )}

      {!selectedLeg && legs.length > 0 && completedLegNumbers.length === legs.length && (
        <div className="text-center py-4 text-gray-500 text-sm">
          All legs completed. Tap a leg above to edit.
        </div>
      )}
    </div>
  )
}
