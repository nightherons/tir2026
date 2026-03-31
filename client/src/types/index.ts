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
  legAssignments?: string | null // JSON array of leg numbers, overrides formula
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
  adjustedDistance?: number | null // per-team override for exchange zone legs (12/13)
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
  projectedFinishTime?: string // ISO string
  totalKills: number
  rank: number
  milesCompleted?: number
  legTimings?: number[] // seconds per leg (36 entries, actual or projected)
  legProjectedTimes?: number[] // seconds per leg (36 entries, always from projected pace)
}

export interface DashboardData {
  standings: TeamStanding[]
  totalMiles?: number
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

// Wrapup types
export interface WrapupLeg {
  legNumber: number
  distance: number
  runnerName: string
  projectedPace: number // sec/mi
  actualPace: number | null
  clockTime: number | null
  kills: number
}

export interface WrapupRunnerLeg {
  legNumber: number
  distance: number
  projectedPace: number
  actualPace: number | null
  clockTime: number | null
  kills: number
}

export interface WrapupRunner {
  name: string
  vanNumber: number
  runOrder: number
  projectedPace: number
  avgActualPace: number | null
  totalMiles: number
  totalKills: number
  legs: WrapupRunnerLeg[]
  teamName: string
  teamColor: string
}

export interface WrapupTeam {
  team: { id: string; name: string; city: string; color: string }
  totalTime: number
  projectedTime: number
  paceAheadBehind: number
  totalKills: number
  completedLegs: number
  place: number
  timeBehindLeader: number
  legs: WrapupLeg[]
  runners: Omit<WrapupRunner, 'teamName' | 'teamColor'>[]
}

export interface WrapupLegWinnerEntry {
  runnerName: string
  teamName: string
  teamColor: string
  pace: number
  clockTime: number
  kills: number
  distance: number
}

export interface WrapupLegWinner {
  legNumber: number
  distance: number
  results: WrapupLegWinnerEntry[]
}

export interface WrapupData {
  teamStandings: WrapupTeam[]
  allRunners: WrapupRunner[]
  legWinners: WrapupLegWinner[]
  raceStartTime: string | null
  totalMiles: number
}

// Socket event types
export interface SocketEvents {
  'time:entered': { legResult: LegResult }
  'leaderboard:update': { standings: TeamStanding[] }
  'runner:active': { teamId: string; runnerId: string; legNumber: number }
}
