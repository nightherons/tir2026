import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function PinLogin() {
  const [pin, setPin] = useState('')
  const { loginWithPin, isLoading, error, clearError } = useAuthStore()

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit)
      clearError()
    }
  }

  const handleBackspace = () => {
    setPin(pin.slice(0, -1))
    clearError()
  }

  const handleClear = () => {
    setPin('')
    clearError()
  }

  const handleSubmit = async () => {
    if (pin.length >= 4) {
      await loginWithPin(pin)
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* PIN display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-shrink-0">
        <div className="flex justify-center space-x-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-10 h-11 rounded-lg border-2 flex items-center justify-center text-xl font-bold ${
                pin[i]
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {pin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-red-600 mt-2 text-sm">{error}</p>
        )}
      </div>

      {/* Number pad - fills remaining space */}
      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 text-2xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          className="bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 text-base font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="bg-white rounded-xl shadow-sm border border-gray-100 text-2xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center"
          disabled={isLoading}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
            />
          </svg>
        </button>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={pin.length < 4 || isLoading}
        className={`w-full py-4 rounded-xl text-lg font-semibold transition-all flex-shrink-0 ${
          pin.length >= 4 && !isLoading
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isLoading ? 'Verifying...' : 'Submit'}
      </button>
    </div>
  )
}
