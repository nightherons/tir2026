import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminUser, RunnerUser } from '../types'
import { api } from '../services/api'

interface AuthState {
  isAuthenticated: boolean
  user: AdminUser | RunnerUser | null
  token: string | null
  userType: 'admin' | 'captain' | 'runner' | null
  isLoading: boolean
  error: string | null

  // Actions
  loginWithPin: (pin: string) => Promise<boolean>
  loginWithEmail: (email: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      userType: null,
      isLoading: false,
      error: null,

      loginWithPin: async (pin: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/runner', { pin })
          if (response.data.success) {
            set({
              isAuthenticated: true,
              user: response.data.data.runner,
              token: response.data.data.token,
              userType: 'runner',
              isLoading: false,
            })
            return true
          }
          set({ error: response.data.error || 'Invalid PIN', isLoading: false })
          return false
        } catch (err) {
          set({ error: 'Login failed', isLoading: false })
          return false
        }
      },

      loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/admin', { email, password })
          if (response.data.success) {
            const user = response.data.data.user as AdminUser
            set({
              isAuthenticated: true,
              user,
              token: response.data.data.token,
              userType: user.role,
              isLoading: false,
            })
            return true
          }
          set({ error: response.data.error || 'Invalid credentials', isLoading: false })
          return false
        } catch (err) {
          set({ error: 'Login failed', isLoading: false })
          return false
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          userType: null,
        })
      },

      checkAuth: () => {
        const { token } = get()
        if (!token) {
          set({ isAuthenticated: false, user: null, userType: null })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tir-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        userType: state.userType,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
