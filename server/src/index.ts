import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import entryRoutes from './routes/entry.js'
import runnerRoutes from './routes/runner.js'
import captainRoutes from './routes/captain.js'
import adminRoutes from './routes/admin.js'
import { setupSocketHandlers } from './socket/handlers.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
// Allow multiple origins for CORS (with and without www)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.FRONTEND_URL?.replace('https://', 'https://www.') || 'http://localhost:5173',
]

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json())

// Make io available to routes
app.set('io', io)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/entry', entryRoutes)
app.use('/api/runner', runnerRoutes)
app.use('/api/captain', captainRoutes)
app.use('/api/admin', adminRoutes)

// Socket.io
setupSocketHandlers(io)

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export { io }
