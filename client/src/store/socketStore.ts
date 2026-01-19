import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { TeamStanding, LegResult } from '../types'

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  lastUpdate: Date | null

  // Actions
  connect: () => void
  disconnect: () => void

  // Event handlers (to be used by components)
  onLeaderboardUpdate: (callback: (standings: TeamStanding[]) => void) => () => void
  onTimeEntered: (callback: (result: LegResult) => void) => () => void
  onRunnerActive: (callback: (data: { teamId: string; runnerId: string; legNumber: number }) => void) => () => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  lastUpdate: null,

  connect: () => {
    const existingSocket = get().socket
    if (existingSocket?.connected) return

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      set({ isConnected: true })
      console.log('Socket connected')
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
      console.log('Socket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    set({ socket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  onLeaderboardUpdate: (callback) => {
    const { socket } = get()
    if (!socket) return () => {}

    socket.on('leaderboard:update', (data: { standings: TeamStanding[] }) => {
      set({ lastUpdate: new Date() })
      callback(data.standings)
    })

    return () => {
      socket.off('leaderboard:update')
    }
  },

  onTimeEntered: (callback) => {
    const { socket } = get()
    if (!socket) return () => {}

    socket.on('time:entered', (data: { legResult: LegResult }) => {
      set({ lastUpdate: new Date() })
      callback(data.legResult)
    })

    return () => {
      socket.off('time:entered')
    }
  },

  onRunnerActive: (callback) => {
    const { socket } = get()
    if (!socket) return () => {}

    socket.on('runner:active', callback)

    return () => {
      socket.off('runner:active')
    }
  },
}))
