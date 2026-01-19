import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole: 'admin' | 'captain' | 'runner'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, userType } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Admin can access everything
  if (userType === 'admin') {
    return <>{children}</>
  }

  // Captain can access captain and runner routes
  if (userType === 'captain' && (requiredRole === 'captain' || requiredRole === 'runner')) {
    return <>{children}</>
  }

  // Runner can only access runner routes
  if (userType === 'runner' && requiredRole === 'runner') {
    return <>{children}</>
  }

  // Unauthorized - redirect to home
  return <Navigate to="/" replace />
}
