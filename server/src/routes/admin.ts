import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, adminOnly } from '../middleware/auth.js'
import { generatePin } from '../utils/pin.js'
import { emitTimeEntered } from '../socket/handlers.js'
import { Server } from 'socket.io'
import multer from 'multer'
import {
  exportToCSV,
  exportToExcel,
  importFromBuffer,
  generateTeamsTemplate,
  generateRunnersTemplate,
  generateLegsTemplate,
  generateResultsTemplate,
} from '../utils/importExport.js'

const router = Router()
const prisma = new PrismaClient()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // Some browsers send this for xlsx
    ]
    const allowedExtensions = ['.csv', '.xlsx', '.xls']
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'))

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Please upload CSV or Excel files.'))
    }
  },
})

// Apply auth middleware to all admin routes
router.use(authMiddleware)
router.use(adminOnly)

// ==================== TEAMS ====================

router.get('/teams', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: { runners: true },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: teams })
  } catch (error) {
    console.error('Get teams error:', error)
    res.status(500).json({ success: false, error: 'Failed to load teams' })
  }
})

router.post('/teams', async (req, res) => {
  try {
    const { name, city, color } = req.body
    const team = await prisma.team.create({
      data: { name: name.toUpperCase(), city, color: color || '#3b82f6' },
    })
    res.json({ success: true, data: team })
  } catch (error) {
    console.error('Create team error:', error)
    res.status(500).json({ success: false, error: 'Failed to create team' })
  }
})

router.put('/teams/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, city, color } = req.body
    const team = await prisma.team.update({
      where: { id },
      data: { name: name?.toUpperCase(), city, color },
    })
    res.json({ success: true, data: team })
  } catch (error) {
    console.error('Update team error:', error)
    res.status(500).json({ success: false, error: 'Failed to update team' })
  }
})

router.delete('/teams/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.team.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete team error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete team' })
  }
})

// ==================== RUNNERS ====================

router.get('/runners', async (req, res) => {
  try {
    const runners = await prisma.runner.findMany({
      include: { team: true },
      orderBy: [{ teamId: 'asc' }, { vanNumber: 'asc' }, { runOrder: 'asc' }],
    })
    res.json({ success: true, data: runners })
  } catch (error) {
    console.error('Get runners error:', error)
    res.status(500).json({ success: false, error: 'Failed to load runners' })
  }
})

router.post('/runners', async (req, res) => {
  try {
    const { name, teamId, vanNumber, runOrder, projectedPace } = req.body
    const pin = generatePin()

    const runner = await prisma.runner.create({
      data: {
        name,
        pin,
        teamId,
        vanNumber,
        runOrder,
        projectedPace: projectedPace || 420, // Default 7:00/mi
      },
      include: { team: true },
    })

    res.json({ success: true, data: { ...runner, pin } }) // Include PIN on creation
  } catch (error) {
    console.error('Create runner error:', error)
    res.status(500).json({ success: false, error: 'Failed to create runner' })
  }
})

router.put('/runners/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, teamId, vanNumber, runOrder, projectedPace } = req.body

    const runner = await prisma.runner.update({
      where: { id },
      data: { name, teamId, vanNumber, runOrder, projectedPace },
      include: { team: true },
    })

    res.json({ success: true, data: runner })
  } catch (error) {
    console.error('Update runner error:', error)
    res.status(500).json({ success: false, error: 'Failed to update runner' })
  }
})

router.delete('/runners/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.runner.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete runner error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete runner' })
  }
})

router.post('/runners/:id/regenerate-pin', async (req, res) => {
  try {
    const { id } = req.params
    const pin = generatePin()

    const runner = await prisma.runner.update({
      where: { id },
      data: { pin },
    })

    res.json({ success: true, data: { pin } })
  } catch (error) {
    console.error('Regenerate PIN error:', error)
    res.status(500).json({ success: false, error: 'Failed to regenerate PIN' })
  }
})

// ==================== LEGS ====================

router.get('/legs', async (req, res) => {
  try {
    const legs = await prisma.leg.findMany({
      orderBy: { legNumber: 'asc' },
    })
    res.json({ success: true, data: legs })
  } catch (error) {
    console.error('Get legs error:', error)
    res.status(500).json({ success: false, error: 'Failed to load legs' })
  }
})

router.post('/legs', async (req, res) => {
  try {
    const { legNumber, distance, startPoint, endPoint, elevation, difficulty } = req.body

    const leg = await prisma.leg.create({
      data: { legNumber, distance, startPoint, endPoint, elevation, difficulty },
    })

    res.json({ success: true, data: leg })
  } catch (error) {
    console.error('Create leg error:', error)
    res.status(500).json({ success: false, error: 'Failed to create leg' })
  }
})

router.put('/legs/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { legNumber, distance, startPoint, endPoint, elevation, difficulty } = req.body

    const leg = await prisma.leg.update({
      where: { id },
      data: { legNumber, distance, startPoint, endPoint, elevation, difficulty },
    })

    res.json({ success: true, data: leg })
  } catch (error) {
    console.error('Update leg error:', error)
    res.status(500).json({ success: false, error: 'Failed to update leg' })
  }
})

router.delete('/legs/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.leg.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete leg error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete leg' })
  }
})

// ==================== TIME ENTRY ====================

router.post('/entry', async (req, res) => {
  try {
    const { runnerId, legNumber, clockTime, kills } = req.body

    const leg = await prisma.leg.findUnique({
      where: { legNumber },
    })

    if (!leg) {
      return res.status(404).json({ success: false, error: 'Leg not found' })
    }

    const runner = await prisma.runner.findUnique({
      where: { id: runnerId },
    })

    if (!runner) {
      return res.status(404).json({ success: false, error: 'Runner not found' })
    }

    const result = await prisma.legResult.upsert({
      where: {
        legId_runnerId: {
          legId: leg.id,
          runnerId,
        },
      },
      update: {
        clockTime,
        kills: kills || 0,
        enteredBy: 'admin',
      },
      create: {
        legId: leg.id,
        runnerId,
        clockTime,
        kills: kills || 0,
        enteredBy: 'admin',
      },
      include: {
        leg: true,
        runner: { include: { team: true } },
      },
    })

    const io: Server = req.app.get('io')
    emitTimeEntered(io, {
      legResult: result,
      teamId: runner.teamId,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Admin entry error:', error)
    res.status(500).json({ success: false, error: 'Failed to submit time' })
  }
})

// ==================== CONFIG ====================

router.get('/config', async (req, res) => {
  try {
    const configs = await prisma.raceConfig.findMany()
    const configMap = configs.reduce((acc, c) => {
      acc[c.key] = c.value
      return acc
    }, {} as Record<string, string>)

    res.json({ success: true, data: configMap })
  } catch (error) {
    console.error('Get config error:', error)
    res.status(500).json({ success: false, error: 'Failed to load config' })
  }
})

router.put('/config', async (req, res) => {
  try {
    const data = req.body as Record<string, string>

    for (const [key, value] of Object.entries(data)) {
      await prisma.raceConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Update config error:', error)
    res.status(500).json({ success: false, error: 'Failed to update config' })
  }
})

// ==================== IMPORT/EXPORT ====================

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const stats = await importFromBuffer(req.file.buffer, req.file.originalname)

    const summary = []
    if (stats.teams.created || stats.teams.updated) {
      summary.push(`Teams: ${stats.teams.created} created, ${stats.teams.updated} updated`)
    }
    if (stats.runners.created || stats.runners.updated) {
      summary.push(`Runners: ${stats.runners.created} created, ${stats.runners.updated} updated`)
    }
    if (stats.legs.created || stats.legs.updated) {
      summary.push(`Legs: ${stats.legs.created} created, ${stats.legs.updated} updated`)
    }
    if (stats.results.created || stats.results.updated) {
      summary.push(`Results: ${stats.results.created} created, ${stats.results.updated} updated`)
    }

    res.json({
      success: true,
      data: {
        message: summary.length > 0 ? summary.join('. ') : 'No data imported',
        stats,
      },
    })
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ success: false, error: 'Import failed: ' + (error as Error).message })
  }
})

router.get('/export', async (req, res) => {
  try {
    const format = req.query.format as string || 'csv'
    const dateStr = new Date().toISOString().split('T')[0]

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await exportToExcel()
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=tir2026-export-${dateStr}.xlsx`)
      res.send(buffer)
    } else {
      const csv = await exportToCSV()
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=tir2026-export-${dateStr}.csv`)
      res.send(csv)
    }
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ success: false, error: 'Export failed' })
  }
})

// Template downloads
router.get('/templates/teams', async (req, res) => {
  try {
    const buffer = generateTeamsTemplate()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=teams-template.xlsx')
    res.send(buffer)
  } catch (error) {
    console.error('Template error:', error)
    res.status(500).json({ success: false, error: 'Failed to generate template' })
  }
})

router.get('/templates/runners', async (req, res) => {
  try {
    const buffer = generateRunnersTemplate()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=runners-template.xlsx')
    res.send(buffer)
  } catch (error) {
    console.error('Template error:', error)
    res.status(500).json({ success: false, error: 'Failed to generate template' })
  }
})

router.get('/templates/legs', async (req, res) => {
  try {
    const buffer = generateLegsTemplate()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=legs-template.xlsx')
    res.send(buffer)
  } catch (error) {
    console.error('Template error:', error)
    res.status(500).json({ success: false, error: 'Failed to generate template' })
  }
})

router.get('/templates/results', async (req, res) => {
  try {
    const buffer = generateResultsTemplate()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=results-template.xlsx')
    res.send(buffer)
  } catch (error) {
    console.error('Template error:', error)
    res.status(500).json({ success: false, error: 'Failed to generate template' })
  }
})

// ==================== ADMIN USERS ====================

router.get('/users', async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        teamId: true,
        vanNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: admins })
  } catch (error) {
    console.error('Get admins error:', error)
    res.status(500).json({ success: false, error: 'Failed to load admin users' })
  }
})

router.post('/users', async (req, res) => {
  try {
    const { email, password, role, teamId, vanNumber } = req.body

    const passwordHash = await bcrypt.hash(password, 10)

    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash,
        role,
        teamId: teamId || null,
        vanNumber: vanNumber ? parseInt(vanNumber, 10) : null,
      },
    })

    res.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        teamId: admin.teamId,
        vanNumber: admin.vanNumber,
        createdAt: admin.createdAt,
      },
    })
  } catch (error) {
    console.error('Create admin error:', error)
    res.status(500).json({ success: false, error: 'Failed to create admin user' })
  }
})

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { email, password, role, teamId, vanNumber } = req.body

    const updateData: Record<string, unknown> = {
      email,
      role,
      teamId: teamId || null,
      vanNumber: vanNumber ? parseInt(vanNumber, 10) : null,
    }

    // Only hash and update password if provided
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    const admin = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        teamId: true,
        vanNumber: true,
        createdAt: true,
      },
    })

    res.json({ success: true, data: admin })
  } catch (error) {
    console.error('Update admin error:', error)
    res.status(500).json({ success: false, error: 'Failed to update admin user' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.admin.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete admin error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete admin user' })
  }
})

export default router
