import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import { parse as csvParse } from 'csv-parse/sync'
import { generatePin } from './pin.js'

const prisma = new PrismaClient()

// ==================== EXPORT FUNCTIONS ====================

interface ExportData {
  teams: {
    name: string
    city: string
    runnerCount: number
  }[]
  runners: {
    name: string
    team: string
    van: number
    order: number
    projectedPace: string
    pin: string
  }[]
  legs: {
    legNumber: number
    distance: number
    difficulty: string
    startPoint: string
    endPoint: string
    elevation: number
  }[]
  results: {
    team: string
    runner: string
    van: number
    order: number
    leg: number
    distance: number
    time: string
    timeSeconds: number
    pace: string
    kills: number
  }[]
}

function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export async function getExportData(): Promise<ExportData> {
  const teams = await prisma.team.findMany({
    include: { runners: true },
    orderBy: { name: 'asc' },
  })

  const runners = await prisma.runner.findMany({
    include: { team: true },
    orderBy: [{ teamId: 'asc' }, { vanNumber: 'asc' }, { runOrder: 'asc' }],
  })

  const legs = await prisma.leg.findMany({
    orderBy: { legNumber: 'asc' },
  })

  const results = await prisma.legResult.findMany({
    include: {
      leg: true,
      runner: { include: { team: true } },
    },
    orderBy: [{ leg: { legNumber: 'asc' } }],
  })

  return {
    teams: teams.map((t) => ({
      name: t.name,
      city: t.city,
      runnerCount: t.runners.length,
    })),
    runners: runners.map((r) => ({
      name: r.name,
      team: r.team.name,
      van: r.vanNumber,
      order: r.runOrder,
      projectedPace: formatPace(r.projectedPace),
      pin: r.pin,
    })),
    legs: legs.map((l) => ({
      legNumber: l.legNumber,
      distance: l.distance,
      difficulty: l.difficulty || 'moderate',
      startPoint: l.startPoint || '',
      endPoint: l.endPoint || '',
      elevation: l.elevation || 0,
    })),
    results: results.map((r) => {
      const pacePerMile = r.clockTime / r.leg.distance
      return {
        team: r.runner.team.name,
        runner: r.runner.name,
        van: r.runner.vanNumber,
        order: r.runner.runOrder,
        leg: r.leg.legNumber,
        distance: r.leg.distance,
        time: formatTime(r.clockTime),
        timeSeconds: r.clockTime,
        pace: formatPace(Math.round(pacePerMile)),
        kills: r.kills,
      }
    }),
  }
}

export async function exportToCSV(): Promise<string> {
  const data = await getExportData()
  let csv = ''

  // Teams sheet
  csv += '=== TEAMS ===\n'
  csv += 'Team Name,City,Runner Count\n'
  for (const team of data.teams) {
    csv += `${team.name},${team.city},${team.runnerCount}\n`
  }
  csv += '\n'

  // Runners sheet
  csv += '=== RUNNERS ===\n'
  csv += 'Name,Team,Van,Order,Projected Pace,PIN\n'
  for (const runner of data.runners) {
    csv += `${runner.name},${runner.team},${runner.van},${runner.order},${runner.projectedPace},${runner.pin}\n`
  }
  csv += '\n'

  // Legs sheet
  csv += '=== LEGS ===\n'
  csv += 'Leg Number,Distance (mi),Difficulty,Start Point,End Point,Elevation (ft)\n'
  for (const leg of data.legs) {
    csv += `${leg.legNumber},${leg.distance},${leg.difficulty},${leg.startPoint},${leg.endPoint},${leg.elevation}\n`
  }
  csv += '\n'

  // Results sheet
  csv += '=== RESULTS ===\n'
  csv += 'Team,Runner,Van,Order,Leg,Distance,Time,Pace,Kills\n'
  for (const result of data.results) {
    csv += `${result.team},${result.runner},${result.van},${result.order},${result.leg},${result.distance},${result.time},${result.pace},${result.kills}\n`
  }

  return csv
}

export async function exportToExcel(): Promise<Buffer> {
  const data = await getExportData()
  const workbook = XLSX.utils.book_new()

  // Teams sheet
  const teamsWs = XLSX.utils.json_to_sheet(data.teams.map((t) => ({
    'Team Name': t.name,
    'City': t.city,
    'Runner Count': t.runnerCount,
  })))
  XLSX.utils.book_append_sheet(workbook, teamsWs, 'Teams')

  // Runners sheet
  const runnersWs = XLSX.utils.json_to_sheet(data.runners.map((r) => ({
    'Name': r.name,
    'Team': r.team,
    'Van': r.van,
    'Order': r.order,
    'Projected Pace': r.projectedPace,
    'PIN': r.pin,
  })))
  XLSX.utils.book_append_sheet(workbook, runnersWs, 'Runners')

  // Legs sheet
  const legsWs = XLSX.utils.json_to_sheet(data.legs.map((l) => ({
    'Leg Number': l.legNumber,
    'Distance (mi)': l.distance,
    'Difficulty': l.difficulty,
    'Start Point': l.startPoint,
    'End Point': l.endPoint,
    'Elevation (ft)': l.elevation,
  })))
  XLSX.utils.book_append_sheet(workbook, legsWs, 'Legs')

  // Results sheet
  const resultsWs = XLSX.utils.json_to_sheet(data.results.map((r) => ({
    'Team': r.team,
    'Runner': r.runner,
    'Van': r.van,
    'Order': r.order,
    'Leg': r.leg,
    'Distance': r.distance,
    'Time': r.time,
    'Pace': r.pace,
    'Kills': r.kills,
  })))
  XLSX.utils.book_append_sheet(workbook, resultsWs, 'Results')

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

// ==================== IMPORT FUNCTIONS ====================

interface ImportStats {
  teams: { created: number; updated: number }
  runners: { created: number; updated: number }
  legs: { created: number; updated: number }
  results: { created: number; updated: number }
  errors: string[]
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parseInt(timeStr) || 0
}

function parsePaceToSeconds(paceStr: string): number {
  if (!paceStr) return 420 // Default 7:00
  const parts = paceStr.split(':').map(Number)
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parseInt(paceStr) || 420
}

export async function importFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<ImportStats> {
  const stats: ImportStats = {
    teams: { created: 0, updated: 0 },
    runners: { created: 0, updated: 0 },
    legs: { created: 0, updated: 0 },
    results: { created: 0, updated: 0 },
    errors: [],
  }

  const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls')

  if (isExcel) {
    return importExcel(buffer, stats)
  } else {
    return importCSV(buffer.toString('utf-8'), stats)
  }
}

async function importExcel(buffer: Buffer, stats: ImportStats): Promise<ImportStats> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

    const normalizedName = sheetName.toLowerCase()

    if (normalizedName.includes('team')) {
      await importTeams(data, stats)
    } else if (normalizedName.includes('runner')) {
      await importRunners(data, stats)
    } else if (normalizedName.includes('leg')) {
      await importLegs(data, stats)
    } else if (normalizedName.includes('result') || normalizedName.includes('time')) {
      await importResults(data, stats)
    }
  }

  return stats
}

async function importCSV(content: string, stats: ImportStats): Promise<ImportStats> {
  // Check if it's a sectioned CSV (with === SECTION === headers)
  if (content.includes('=== TEAMS ===') || content.includes('===TEAMS===')) {
    return importSectionedCSV(content, stats)
  }

  // Try to auto-detect the type based on headers
  const lines = content.trim().split('\n')
  if (lines.length < 2) {
    stats.errors.push('CSV file is empty or has no data rows')
    return stats
  }

  const headers = lines[0].toLowerCase()
  const records = csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  if (headers.includes('team') && headers.includes('city') && !headers.includes('runner')) {
    await importTeams(records, stats)
  } else if (headers.includes('runner') || (headers.includes('name') && headers.includes('van'))) {
    await importRunners(records, stats)
  } else if (headers.includes('leg') && headers.includes('distance') && !headers.includes('runner')) {
    await importLegs(records, stats)
  } else if (headers.includes('time') || headers.includes('result')) {
    await importResults(records, stats)
  } else {
    stats.errors.push('Could not determine CSV type from headers. Please use sectioned format or include clear headers.')
  }

  return stats
}

async function importSectionedCSV(content: string, stats: ImportStats): Promise<ImportStats> {
  const sections = content.split(/===\s*(\w+)\s*===/)

  for (let i = 1; i < sections.length; i += 2) {
    const sectionName = sections[i].toLowerCase()
    const sectionContent = sections[i + 1]?.trim()

    if (!sectionContent) continue

    const records = csvParse(sectionContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[]

    if (sectionName.includes('team')) {
      await importTeams(records, stats)
    } else if (sectionName.includes('runner')) {
      await importRunners(records, stats)
    } else if (sectionName.includes('leg')) {
      await importLegs(records, stats)
    } else if (sectionName.includes('result')) {
      await importResults(records, stats)
    }
  }

  return stats
}

async function importTeams(
  records: Record<string, unknown>[],
  stats: ImportStats
): Promise<void> {
  for (const record of records) {
    try {
      const name = String(record['Team Name'] || record['name'] || record['Name'] || '').toUpperCase().trim()
      const city = String(record['City'] || record['city'] || 'Houston').trim()

      if (!name) continue

      const existing = await prisma.team.findUnique({ where: { name } })

      if (existing) {
        await prisma.team.update({
          where: { name },
          data: { city },
        })
        stats.teams.updated++
      } else {
        await prisma.team.create({
          data: { name, city },
        })
        stats.teams.created++
      }
    } catch (error) {
      stats.errors.push(`Failed to import team: ${JSON.stringify(record)}`)
    }
  }
}

async function importRunners(
  records: Record<string, unknown>[],
  stats: ImportStats
): Promise<void> {
  // Build team lookup
  const teams = await prisma.team.findMany()
  const teamMap = new Map(teams.map((t) => [t.name.toUpperCase(), t.id]))

  for (const record of records) {
    try {
      const name = String(record['Name'] || record['name'] || record['Runner'] || '').trim()
      const teamName = String(record['Team'] || record['team'] || '').toUpperCase().trim()
      const van = parseInt(String(record['Van'] || record['van'] || record['Van Number'] || '1'))
      const order = parseInt(String(record['Order'] || record['order'] || record['Run Order'] || '1'))
      const paceStr = String(record['Projected Pace'] || record['projectedPace'] || record['Pace'] || '7:00')
      const pin = String(record['PIN'] || record['pin'] || '')

      if (!name || !teamName) continue

      const teamId = teamMap.get(teamName)
      if (!teamId) {
        stats.errors.push(`Team not found for runner ${name}: ${teamName}`)
        continue
      }

      const projectedPace = parsePaceToSeconds(paceStr)
      const finalPin = pin || generatePin()

      const existing = await prisma.runner.findFirst({
        where: { teamId, vanNumber: van, runOrder: order },
      })

      if (existing) {
        await prisma.runner.update({
          where: { id: existing.id },
          data: { name, projectedPace, pin: pin || existing.pin },
        })
        stats.runners.updated++
      } else {
        await prisma.runner.create({
          data: {
            name,
            teamId,
            vanNumber: van,
            runOrder: order,
            projectedPace,
            pin: finalPin,
          },
        })
        stats.runners.created++
      }
    } catch (error) {
      stats.errors.push(`Failed to import runner: ${JSON.stringify(record)}`)
    }
  }
}

async function importLegs(
  records: Record<string, unknown>[],
  stats: ImportStats
): Promise<void> {
  for (const record of records) {
    try {
      const legNumber = parseInt(String(record['Leg Number'] || record['legNumber'] || record['Leg'] || '0'))
      const distance = parseFloat(String(record['Distance (mi)'] || record['Distance'] || record['distance'] || '0'))
      const difficulty = String(record['Difficulty'] || record['difficulty'] || 'moderate').toLowerCase()
      const startPoint = String(record['Start Point'] || record['startPoint'] || '')
      const endPoint = String(record['End Point'] || record['endPoint'] || '')
      const elevation = parseInt(String(record['Elevation (ft)'] || record['Elevation'] || record['elevation'] || '0'))

      if (!legNumber || !distance) continue

      const existing = await prisma.leg.findUnique({ where: { legNumber } })

      if (existing) {
        await prisma.leg.update({
          where: { legNumber },
          data: { distance, difficulty, startPoint, endPoint, elevation },
        })
        stats.legs.updated++
      } else {
        await prisma.leg.create({
          data: { legNumber, distance, difficulty, startPoint, endPoint, elevation },
        })
        stats.legs.created++
      }
    } catch (error) {
      stats.errors.push(`Failed to import leg: ${JSON.stringify(record)}`)
    }
  }
}

async function importResults(
  records: Record<string, unknown>[],
  stats: ImportStats
): Promise<void> {
  // Build lookups
  const teams = await prisma.team.findMany()
  const teamMap = new Map(teams.map((t) => [t.name.toUpperCase(), t.id]))

  const runners = await prisma.runner.findMany()
  const runnerMap = new Map<string, string>()
  for (const r of runners) {
    runnerMap.set(`${r.teamId}-${r.vanNumber}-${r.runOrder}`, r.id)
    runnerMap.set(r.name.toLowerCase(), r.id)
  }

  const legs = await prisma.leg.findMany()
  const legMap = new Map(legs.map((l) => [l.legNumber, l.id]))

  for (const record of records) {
    try {
      const teamName = String(record['Team'] || record['team'] || '').toUpperCase().trim()
      const runnerName = String(record['Runner'] || record['runner'] || record['Name'] || '').trim()
      const van = parseInt(String(record['Van'] || record['van'] || '0'))
      const order = parseInt(String(record['Order'] || record['order'] || '0'))
      const legNumber = parseInt(String(record['Leg'] || record['leg'] || record['Leg Number'] || '0'))
      const timeStr = String(record['Time'] || record['time'] || record['Clock Time'] || '')
      const kills = parseInt(String(record['Kills'] || record['kills'] || '0'))

      if (!legNumber || !timeStr) continue

      const legId = legMap.get(legNumber)
      if (!legId) {
        stats.errors.push(`Leg not found: ${legNumber}`)
        continue
      }

      // Try to find runner by team/van/order first, then by name
      let runnerId: string | undefined
      const teamId = teamMap.get(teamName)
      if (teamId && van && order) {
        runnerId = runnerMap.get(`${teamId}-${van}-${order}`)
      }
      if (!runnerId && runnerName) {
        runnerId = runnerMap.get(runnerName.toLowerCase())
      }

      if (!runnerId) {
        stats.errors.push(`Runner not found: ${runnerName || `${teamName} Van${van} #${order}`}`)
        continue
      }

      const clockTime = parseTimeToSeconds(timeStr)

      const existing = await prisma.legResult.findUnique({
        where: { legId_runnerId: { legId, runnerId } },
      })

      if (existing) {
        await prisma.legResult.update({
          where: { id: existing.id },
          data: { clockTime, kills },
        })
        stats.results.updated++
      } else {
        await prisma.legResult.create({
          data: { legId, runnerId, clockTime, kills, enteredBy: 'import' },
        })
        stats.results.created++
      }
    } catch (error) {
      stats.errors.push(`Failed to import result: ${JSON.stringify(record)}`)
    }
  }
}

// ==================== TEMPLATE GENERATION ====================

export function generateTeamsTemplate(): Buffer {
  const workbook = XLSX.utils.book_new()
  const data = [
    { 'Team Name': 'BLACK', 'City': 'Houston' },
    { 'Team Name': 'BLUE', 'City': 'Houston' },
    { 'Team Name': 'RED', 'City': 'Dallas' },
  ]
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, ws, 'Teams')
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

export function generateRunnersTemplate(): Buffer {
  const workbook = XLSX.utils.book_new()
  const data = [
    { 'Name': 'John Smith', 'Team': 'BLACK', 'Van': 1, 'Order': 1, 'Projected Pace': '7:30' },
    { 'Name': 'Jane Doe', 'Team': 'BLACK', 'Van': 1, 'Order': 2, 'Projected Pace': '8:00' },
    { 'Name': 'Bob Wilson', 'Team': 'BLACK', 'Van': 2, 'Order': 1, 'Projected Pace': '7:15' },
  ]
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, ws, 'Runners')
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

export function generateLegsTemplate(): Buffer {
  const workbook = XLSX.utils.book_new()
  const data = [
    { 'Leg Number': 1, 'Distance (mi)': 5.22, 'Difficulty': 'moderate', 'Start Point': 'Start', 'End Point': 'Exchange 1', 'Elevation (ft)': 100 },
    { 'Leg Number': 2, 'Distance (mi)': 5.34, 'Difficulty': 'moderate', 'Start Point': 'Exchange 1', 'End Point': 'Exchange 2', 'Elevation (ft)': 150 },
    { 'Leg Number': 3, 'Distance (mi)': 4.86, 'Difficulty': 'easy', 'Start Point': 'Exchange 2', 'End Point': 'Exchange 3', 'Elevation (ft)': 50 },
  ]
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, ws, 'Legs')
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

export function generateResultsTemplate(): Buffer {
  const workbook = XLSX.utils.book_new()
  const data = [
    { 'Team': 'BLACK', 'Runner': 'John Smith', 'Van': 1, 'Order': 1, 'Leg': 1, 'Time': '0:42:30', 'Kills': 2 },
    { 'Team': 'BLACK', 'Runner': 'John Smith', 'Van': 1, 'Order': 1, 'Leg': 13, 'Time': '0:45:15', 'Kills': 1 },
  ]
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, ws, 'Results')
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}
