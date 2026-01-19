import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { generateToken } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Runner login with PIN
router.post('/runner', async (req, res) => {
  try {
    const { pin } = req.body

    if (!pin || pin.length < 4) {
      return res.status(400).json({ success: false, error: 'Invalid PIN' })
    }

    const runner = await prisma.runner.findUnique({
      where: { pin },
      include: { team: true },
    })

    if (!runner) {
      return res.status(401).json({ success: false, error: 'Invalid PIN' })
    }

    const token = generateToken({
      id: runner.id,
      type: 'runner',
      teamId: runner.teamId,
      vanNumber: runner.vanNumber,
    })

    res.json({
      success: true,
      data: {
        token,
        runner: {
          id: runner.id,
          name: runner.name,
          teamId: runner.teamId,
          teamName: runner.team.name,
          vanNumber: runner.vanNumber,
          runOrder: runner.runOrder,
        },
      },
    })
  } catch (error) {
    console.error('Runner login error:', error)
    res.status(500).json({ success: false, error: 'Login failed' })
  }
})

// Admin/Captain login with email
router.post('/admin', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' })
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    })

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const token = generateToken({
      id: admin.id,
      type: admin.role === 'admin' ? 'admin' : 'captain',
      role: admin.role,
      teamId: admin.teamId || undefined,
      vanNumber: admin.vanNumber || undefined,
    })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          teamId: admin.teamId,
          vanNumber: admin.vanNumber,
        },
      },
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({ success: false, error: 'Login failed' })
  }
})

export default router
