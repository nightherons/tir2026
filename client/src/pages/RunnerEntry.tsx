import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import PinLogin from '../components/entry/PinLogin'
import TimeEntryForm from '../components/entry/TimeEntryForm'

export default function RunnerEntry() {
  const { isAuthenticated, userType, user, logout } = useAuthStore()
  const [showSuccess, setShowSuccess] = useState(false)

  const isRunner = isAuthenticated && userType === 'runner'

  const handleTimeSubmitted = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <span className="font-semibold text-gray-900">Time Entry</span>
          {isRunner ? (
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          ) : (
            <div className="w-14" />
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-lg mx-auto px-4 py-4 h-full flex flex-col">
          {/* Success message */}
          {showSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center animate-pulse flex-shrink-0">
              <p className="text-green-800 font-medium">Time submitted successfully!</p>
            </div>
          )}

          {!isRunner ? (
            <PinLogin />
          ) : (
            <div className="space-y-6">
              {/* Runner info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(user as { name: string })?.name}
                </p>
              </div>

              {/* Time entry form */}
              <TimeEntryForm onSuccess={handleTimeSubmitted} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
