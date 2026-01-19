import { useState, useEffect } from 'react'
import { LogIn } from 'lucide-react'
import LoginModal from '../components/LoginModal'

// Race date: March 28, 2026
const RACE_DATE = new Date('2026-03-28T06:00:00')

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(): TimeLeft {
  const difference = RACE_DATE.getTime() - new Date().getTime()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

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
          March 28, 2026
        </p>

        {/* Countdown Timer */}
        <CountdownTimer />

        {/* Login Button */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="mt-12 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg border border-white/30 transition-all hover:scale-105"
        >
          <LogIn className="w-5 h-5" />
          <span className="font-medium">Admin Login</span>
        </button>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}
