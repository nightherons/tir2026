import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogIn, Radio, BarChart3 } from 'lucide-react'
import { dashboardApi } from '../services/api'
import LoginModal from '../components/LoginModal'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function CountdownTimer({ raceDate }: { raceDate: Date }) {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const difference = raceDate.getTime() - new Date().getTime()
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    }
  }, [raceDate])

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    return () => clearInterval(timer)
  }, [calculateTimeLeft])

  return (
    <div className="flex gap-4 sm:gap-6">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Minutes' },
        { value: timeLeft.seconds, label: 'Seconds' },
      ].map(({ value, label }) => (
        <div key={label} className="text-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-5 sm:py-3 border border-white/20">
            <span className="text-3xl sm:text-5xl font-bold text-white tabular-nums">
              {value.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs sm:text-sm text-white/80 mt-1 block">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Landing() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getAll(),
    staleTime: 60 * 1000,
  })
  const raceStatus = data?.data?.data?.raceStatus || 'pre-race'
  const raceStartTime = data?.data?.data?.raceStartTime
  const isFinished = raceStatus === 'finished'

  const raceDate = raceStartTime ? new Date(raceStartTime) : new Date('2027-03-20T06:00:00')
  const raceDateLabel = raceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* YouTube Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          src="https://www.youtube.com/embed/Yrwgxc0pCII?autoplay=1&mute=1&loop=1&playlist=Yrwgxc0pCII&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
          title="Texas Independence Relay"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full min-h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="/nhrc.png"
            alt="NHRC Logo"
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain filter drop-shadow-lg"
            style={{ filter: 'brightness(0) invert(1) drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-bold text-white text-center mb-2 drop-shadow-lg">
          Texas Independence Relay
        </h1>
        <p className="text-xl sm:text-2xl text-white/90 text-center mb-12 drop-shadow-md">
          {raceDateLabel}
        </p>

        {/* Countdown Timer - hidden while loading */}
        {!isLoading && <CountdownTimer raceDate={raceDate} />}

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => navigate(isFinished ? '/wrapup' : '/dashboard')}
            className="w-48 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-3 rounded-lg border border-white/30 transition-all hover:scale-105"
          >
            {isFinished ? <BarChart3 className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
            <span className="font-medium">{isFinished ? '2026 Race Wrap-Up' : 'Live Dashboard'}</span>
          </button>
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-48 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/70 py-3 rounded-lg border border-white/20 transition-all hover:scale-105"
          >
            <LogIn className="w-5 h-5" />
            <span className="font-medium">Admin Login</span>
          </button>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}
