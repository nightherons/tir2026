import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useSocketStore } from './store/socketStore'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import RunnerEntry from './pages/RunnerEntry'
import CaptainEntry from './pages/CaptainEntry'
import AdminPanel from './pages/AdminPanel'
import Login from './pages/Login'

// Layouts
import MainLayout from './components/shared/MainLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'

function App() {
  const { checkAuth } = useAuthStore()
  const { connect, disconnect } = useSocketStore()

  useEffect(() => {
    checkAuth()
    connect()
    return () => disconnect()
  }, [checkAuth, connect, disconnect])

  return (
    <Routes>
      {/* Landing page - public */}
      <Route path="/" element={<Landing />} />

      {/* Dashboard - requires admin auth */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>

      {/* Runner time entry - requires admin auth for now */}
      <Route
        path="/entry"
        element={
          <ProtectedRoute requiredRole="admin">
            <RunnerEntry />
          </ProtectedRoute>
        }
      />

      {/* Captain entry - requires captain auth */}
      <Route
        path="/captain"
        element={
          <ProtectedRoute requiredRole="captain">
            <CaptainEntry />
          </ProtectedRoute>
        }
      />

      {/* Admin panel - requires admin auth */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      {/* Login page - redirect to landing */}
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
