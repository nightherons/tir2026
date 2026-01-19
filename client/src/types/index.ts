// Team types
export interface Team {
  id: string
  name: string
  city: 'Houston' | 'Dallas'
  color: string // Hex color code
  van1Captain?: string
  van2Captain?: string
  runners: Runner[]
  createdAt: string
}

export interface Runner {
  id: string
  name: string
  teamId: string
  team?: Team
  vanNumber: 1 | 2
  runOrder: number
  projectedPace: number // seconds per mile
  legs?: LegResult[]
}

export interface Leg {
  id: string
  legNumber: number
  distance: number
  startPoint?: string
  endPoint?: string
  elevation?: number
  difficulty?: 'easy' | 'moderate' | 'hard'
  startLat?: number
  startLng?: number
  endLat?: number
  endLng?: number
  results?: LegResult[]
}

export interface LegResult {
  id: string
  legId: string
  leg?: Leg
  runnerId: string
  runner?: Runner
  clockTime?: number // total seconds
  startTime?: string
  endTime?: string
  kills: number
  enteredBy: 'runner' | 'captain' | 'admin'
  createdAt: string
  updatedAt: string
}

// Dashboard types
export interface TeamStanding {
  team: Team
  totalTime: number // seconds
  projectedTime: number
  completedLegs: number
  currentLeg: number
  currentRunner?: Runner
  paceVsProjected: number // positive = behind, negative = ahead
  totalKills: number
  rank: number
}

export interface DashboardData {
  standings: TeamStanding[]
  raceStartTime?: string
  lastUpdate: string
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean
  user: AdminUser | RunnerUser | null
  token: string | null
}

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'captain'
  teamId?: string
  vanNumber?: number
}

export interface RunnerUser {
  id: string
  name: string
  teamId: string
  vanNumber: number
  runOrder: number
}

// Time entry types
export interface TimeEntry {
  legNumber: number
  hours: number
  minutes: number
  seconds: number
  kills: number
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Socket event types
export interface SocketEvents {
  'time:entered': { legResult: LegResult }
  'leaderboard:update': { standings: TeamStanding[] }
  'runner:active': { teamId: string; runnerId: string; legNumber: number }
}
