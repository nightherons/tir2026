import { Server, Socket } from 'socket.io'

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    // Join room for real-time updates
    socket.on('join:dashboard', () => {
      socket.join('dashboard')
      console.log(`Socket ${socket.id} joined dashboard room`)
    })

    socket.on('join:team', (teamId: string) => {
      socket.join(`team:${teamId}`)
      console.log(`Socket ${socket.id} joined team:${teamId} room`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })
}

// Emit functions to be called from routes
export function emitTimeEntered(io: Server, data: {
  legResult: unknown
  teamId: string
}) {
  io.to('dashboard').emit('time:entered', { legResult: data.legResult })
  io.to(`team:${data.teamId}`).emit('time:entered', { legResult: data.legResult })
}

export function emitLeaderboardUpdate(io: Server, standings: unknown[]) {
  io.to('dashboard').emit('leaderboard:update', { standings })
}

export function emitRunnerActive(io: Server, data: {
  teamId: string
  runnerId: string
  legNumber: number
}) {
  io.to('dashboard').emit('runner:active', data)
}
