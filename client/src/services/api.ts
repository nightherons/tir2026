import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

// API functions
export const dashboardApi = {
  getAll: () => api.get('/dashboard'),
  getTeam: (teamId: string) => api.get(`/dashboard/team/${teamId}`),
  getLeaderboard: () => api.get('/leaderboard'),
}

export const entryApi = {
  submitTime: (data: {
    legNumber: number
    clockTime: number
    kills: number
  }) => api.post('/entry/time', data),

  submitVanTime: (data: {
    runnerId: string
    legNumber: number
    clockTime: number
    kills: number
  }) => api.post('/entry/van', data),
}

export const runnerApi = {
  getMyLegs: () => api.get('/runner/legs'),
  getMyInfo: () => api.get('/runner/me'),
}

export const captainApi = {
  getVanRoster: () => api.get('/captain/van'),
  getVanLegs: () => api.get('/captain/legs'),
}

export const adminApi = {
  // Teams
  getTeams: () => api.get('/admin/teams'),
  createTeam: (data: { name: string; city: string }) =>
    api.post('/admin/teams', data),
  updateTeam: (id: string, data: Partial<{ name: string; city: string }>) =>
    api.put(`/admin/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/admin/teams/${id}`),

  // Runners
  getRunners: () => api.get('/admin/runners'),
  createRunner: (data: {
    name: string
    teamId: string
    vanNumber: number
    runOrder: number
    projectedPace: number
  }) => api.post('/admin/runners', data),
  updateRunner: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/runners/${id}`, data),
  deleteRunner: (id: string) => api.delete(`/admin/runners/${id}`),
  regeneratePin: (id: string) => api.post(`/admin/runners/${id}/regenerate-pin`),

  // Legs
  getLegs: () => api.get('/admin/legs'),
  createLeg: (data: {
    legNumber: number
    distance: number
    startPoint?: string
    endPoint?: string
  }) => api.post('/admin/legs', data),
  updateLeg: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/legs/${id}`, data),
  deleteLeg: (id: string) => api.delete(`/admin/legs/${id}`),

  // Time entries
  submitAnyTime: (data: {
    runnerId: string
    legNumber: number
    clockTime: number
    kills: number
  }) => api.post('/admin/entry', data),

  // Import/Export
  importData: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  exportData: (format: 'csv' | 'xlsx' = 'csv') =>
    api.get(`/admin/export?format=${format}`, { responseType: 'blob' }),

  // Templates
  downloadTemplate: (type: 'teams' | 'runners' | 'legs' | 'results') =>
    api.get(`/admin/templates/${type}`, { responseType: 'blob' }),

  // Config
  getConfig: () => api.get('/admin/config'),
  updateConfig: (data: Record<string, string>) =>
    api.put('/admin/config', data),

  // Admin Users
  getAdminUsers: () => api.get('/admin/users'),
  createAdminUser: (data: { email: string; password: string; role: string }) =>
    api.post('/admin/users', data),
  updateAdminUser: (id: string, data: Partial<{ email: string; password: string; role: string }>) =>
    api.put(`/admin/users/${id}`, data),
  deleteAdminUser: (id: string) => api.delete(`/admin/users/${id}`),
}
