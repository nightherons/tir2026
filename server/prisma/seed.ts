import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Leg data from 2025 TIR Google Maps route
// Coordinates: [startLat, startLng, endLat, endLng]
const legData = [
  { distance: 5.22, start: [29.503671, -97.444339], end: [29.49606, -97.38505] },   // Leg 1
  { distance: 5.34, start: [29.49606, -97.38505], end: [29.47556, -97.30774] },     // Leg 2
  { distance: 4.86, start: [29.47556, -97.30774], end: [29.48651, -97.26951] },     // Leg 3
  { distance: 4.08, start: [29.48651, -97.26951], end: [29.46001, -97.22472] },     // Leg 4
  { distance: 3.92, start: [29.46001, -97.22472], end: [29.4309, -97.17125] },      // Leg 5
  { distance: 4.10, start: [29.4309, -97.17125], end: [29.48384, -97.19054] },      // Leg 6
  { distance: 3.71, start: [29.48384, -97.19054], end: [29.52661, -97.18093] },     // Leg 7
  { distance: 5.18, start: [29.52661, -97.18093], end: [29.58766, -97.17648] },     // Leg 8
  { distance: 4.68, start: [29.58766, -97.17648], end: [29.63681, -97.13134] },     // Leg 9
  { distance: 3.97, start: [29.63681, -97.13134], end: [29.68678, -97.10769] },     // Leg 10
  { distance: 4.31, start: [29.68678, -97.10769], end: [29.66852, -97.06731] },     // Leg 11
  { distance: 6.13, start: [29.66852, -97.06731], end: [29.67004, -96.97755] },     // Leg 12
  { distance: 6.05, start: [29.67004, -96.97755], end: [29.67986, -96.9061] },      // Leg 13
  { distance: 6.38, start: [29.67986, -96.9061], end: [29.65751, -96.82041] },      // Leg 14
  { distance: 5.33, start: [29.65751, -96.82041], end: [29.70267, -96.77938] },     // Leg 15
  { distance: 6.35, start: [29.70267, -96.77938], end: [29.69578, -96.69802] },     // Leg 16
  { distance: 6.78, start: [29.69578, -96.69802], end: [29.70202, -96.58678] },     // Leg 17
  { distance: 4.42, start: [29.70202, -96.58678], end: [29.68867, -96.53743] },     // Leg 18
  { distance: 3.70, start: [29.68867, -96.53743], end: [29.64193, -96.51491] },     // Leg 19
  { distance: 6.82, start: [29.64193, -96.51491], end: [29.57088, -96.45564] },     // Leg 20
  { distance: 6.82, start: [29.57088, -96.45564], end: [29.58562, -96.34902] },     // Leg 21
  { distance: 2.84, start: [29.58562, -96.34902], end: [29.58991, -96.31321] },     // Leg 22
  { distance: 6.52, start: [29.58991, -96.31321], end: [29.61015, -96.2076] },      // Leg 23
  { distance: 5.05, start: [29.61015, -96.2076], end: [29.62733, -96.12717] },      // Leg 24
  { distance: 6.08, start: [29.62733, -96.12717], end: [29.62058, -96.0348] },      // Leg 25
  { distance: 6.40, start: [29.62058, -96.0348], end: [29.64363, -95.97649] },      // Leg 26
  { distance: 2.79, start: [29.64363, -95.97649], end: [29.68339, -95.97825] },     // Leg 27
  { distance: 5.02, start: [29.68339, -95.97825], end: [29.69019, -95.89984] },     // Leg 28
  { distance: 4.69, start: [29.69019, -95.89984], end: [29.71801, -95.8466] },      // Leg 29
  { distance: 6.08, start: [29.71801, -95.8466], end: [29.73472, -95.76307] },      // Leg 30
  { distance: 5.32, start: [29.73472, -95.76307], end: [29.73495, -95.68676] },     // Leg 31
  { distance: 6.79, start: [29.73495, -95.68676], end: [29.76905, -95.64249] },     // Leg 32
  { distance: 6.63, start: [29.76905, -95.64249], end: [29.74816, -95.57221] },     // Leg 33
  { distance: 4.82, start: [29.74816, -95.57221], end: [29.7551, -95.49937] },      // Leg 34
  { distance: 5.97, start: [29.7551, -95.49937], end: [29.76124, -95.41966] },      // Leg 35
  { distance: 5.32, start: [29.76124, -95.41966], end: [29.77128, -95.34853] },     // Leg 36 (Finish)
]

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.admin.upsert({
    where: { email: 'admin@nhrc.org' },
    update: {},
    create: {
      email: 'admin@nhrc.org',
      passwordHash: adminPassword,
      role: 'admin',
    },
  })
  console.log('Created admin user: admin@nhrc.org / admin123')

  // Create 6 teams (4 Houston, 2 Dallas)
  const teamsData = [
    { name: 'BLACK', city: 'Houston' },
    { name: 'BLUE', city: 'Houston' },
    { name: 'GREY', city: 'Houston' },
    { name: 'WHITE', city: 'Houston' },
    { name: 'RED', city: 'Dallas' },
    { name: 'GREEN', city: 'Dallas' },
  ]

  for (const teamData of teamsData) {
    await prisma.team.upsert({
      where: { name: teamData.name },
      update: { city: teamData.city },
      create: teamData,
    })
  }
  console.log('Created 6 teams')

  // Create 36 legs with coordinates
  for (let i = 0; i < legData.length; i++) {
    const legNumber = i + 1
    const leg = legData[i]
    await prisma.leg.upsert({
      where: { legNumber },
      update: {
        distance: leg.distance,
        startLat: leg.start[0],
        startLng: leg.start[1],
        endLat: leg.end[0],
        endLng: leg.end[1],
      },
      create: {
        legNumber,
        distance: leg.distance,
        difficulty: leg.distance > 6 ? 'hard' : leg.distance < 4 ? 'easy' : 'moderate',
        startLat: leg.start[0],
        startLng: leg.start[1],
        endLat: leg.end[0],
        endLng: leg.end[1],
      },
    })
  }
  console.log('Created 36 legs with coordinates')

  // Create sample runners for each team
  const teams = await prisma.team.findMany()
  let pinCounter = 100000

  for (const team of teams) {
    for (let van = 1; van <= 2; van++) {
      for (let order = 1; order <= 6; order++) {
        const runnerName = `${team.name} Van${van} Runner${order}`
        const pin = (pinCounter++).toString()

        await prisma.runner.upsert({
          where: {
            teamId_vanNumber_runOrder: {
              teamId: team.id,
              vanNumber: van,
              runOrder: order,
            },
          },
          update: {},
          create: {
            name: runnerName,
            pin,
            teamId: team.id,
            vanNumber: van,
            runOrder: order,
            projectedPace: 420 + Math.floor(Math.random() * 60), // 7:00-8:00/mi
          },
        })
      }
    }
    console.log(`Created 12 runners for team ${team.name}`)
  }

  // Create van captain accounts
  for (const team of teams) {
    for (let van = 1; van <= 2; van++) {
      const email = `captain.${team.name.toLowerCase()}.van${van}@nhrc.org`
      const captainPassword = await bcrypt.hash('captain123', 10)

      await prisma.admin.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash: captainPassword,
          role: 'captain',
          teamId: team.id,
          vanNumber: van,
        },
      })
    }
  }
  console.log('Created van captain accounts')

  // Set default config
  const defaultConfig = {
    raceName: 'Texas Independence Relay 2026',
    raceDate: '2026-03-28T12:00:00Z',
    totalLegs: '36',
    runnersPerTeam: '12',
    runnersPerVan: '6',
    showKills: 'true',
    showPaceChart: 'true',
    showCurrentRunners: 'true',
  }

  for (const [key, value] of Object.entries(defaultConfig)) {
    await prisma.raceConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
  console.log('Set default race config')

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
