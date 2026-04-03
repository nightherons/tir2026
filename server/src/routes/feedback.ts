import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, adminOnly } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Public: submit feedback
router.post('/', async (req, res) => {
  try {
    const { runner_name, team, van, ...rest } = req.body

    if (!runner_name) {
      return res.status(400).json({ success: false, error: 'Runner name is required' })
    }

    const feedback = await prisma.feedback.create({
      data: {
        runnerName: runner_name,
        team: team || null,
        van: van || null,
        data: JSON.stringify(rest),
      },
    })

    res.json({ success: true, data: { id: feedback.id } })
  } catch (error) {
    console.error('Feedback submit error:', error)
    res.status(500).json({ success: false, error: 'Failed to submit feedback' })
  }
})

// Admin: list all feedback
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const feedback = await prisma.feedback.findMany({
      orderBy: { submittedAt: 'desc' },
    })

    res.json({
      success: true,
      data: feedback.map(f => ({
        id: f.id,
        runnerName: f.runnerName,
        team: f.team,
        van: f.van,
        data: JSON.parse(f.data),
        submittedAt: f.submittedAt,
      })),
    })
  } catch (error) {
    console.error('Feedback list error:', error)
    res.status(500).json({ success: false, error: 'Failed to load feedback' })
  }
})

// Admin: export feedback as CSV
router.get('/export', authMiddleware, adminOnly, async (req, res) => {
  try {
    const feedback = await prisma.feedback.findMany({
      orderBy: { submittedAt: 'asc' },
    })

    if (feedback.length === 0) {
      return res.status(404).json({ success: false, error: 'No feedback to export' })
    }

    // Collect all unique keys across all responses
    const allKeys = new Set<string>()
    const parsed = feedback.map(f => {
      const data = JSON.parse(f.data) as Record<string, unknown>
      Object.keys(data).forEach(k => allKeys.add(k))
      return { ...f, parsed: data }
    })

    // Fixed columns first, then all dynamic form fields sorted
    const fixedCols = ['submittedAt', 'runnerName', 'team', 'van']
    const dynamicCols = [...allKeys].sort()
    const allCols = [...fixedCols, ...dynamicCols]

    // Build CSV
    const escapeCsv = (val: unknown): string => {
      if (val == null) return ''
      const str = Array.isArray(val) ? val.join('; ') : String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const header = allCols.map(escapeCsv).join(',')
    const rows = parsed.map(f => {
      return allCols.map(col => {
        if (col === 'submittedAt') return escapeCsv(f.submittedAt.toISOString())
        if (col === 'runnerName') return escapeCsv(f.runnerName)
        if (col === 'team') return escapeCsv(f.team)
        if (col === 'van') return escapeCsv(f.van)
        return escapeCsv(f.parsed[col])
      }).join(',')
    })

    const csv = [header, ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=tir_2026_feedback.csv')
    // UTF-8 BOM so Excel interprets the file correctly
    res.send('\uFEFF' + csv)
  } catch (error) {
    console.error('Feedback export error:', error)
    res.status(500).json({ success: false, error: 'Failed to export feedback' })
  }
})

export default router
