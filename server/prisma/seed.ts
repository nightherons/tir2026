import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Leg data from TIR Google Maps route
// https://www.google.com/maps/d/u/0/viewer?mid=13Ohh-4QsBGV8iI5I4RFQakQtNnA
// Coordinates: [startLat, startLng, endLat, endLng]
const legData = [
  { distance: 5.22, start: [29.503671, -97.444339], end: [29.49606, -97.38505], startPoint: 'Gonzales', endPoint: 'Chicken Farm' },                          // Leg 1
  { distance: 5.34, start: [29.49606, -97.38505], end: [29.47556, -97.30774], startPoint: 'Chicken Farm', endPoint: "Sam's Oak" },                            // Leg 2
  { distance: 4.86, start: [29.47556, -97.30774], end: [29.48651, -97.26951], startPoint: "Sam's Oak", endPoint: 'Country Vista' },                           // Leg 3
  { distance: 4.08, start: [29.48651, -97.26951], end: [29.46001, -97.22472], startPoint: 'Country Vista', endPoint: 'Krejci' },                              // Leg 4
  { distance: 3.92, start: [29.46001, -97.22472], end: [29.4309, -97.17125], startPoint: 'Krejci', endPoint: 'Shiner' },                                     // Leg 5
  { distance: 4.10, start: [29.4309, -97.17125], end: [29.48384, -97.19054], startPoint: 'Shiner', endPoint: 'N Shiner' },                                   // Leg 6
  { distance: 3.71, start: [29.48384, -97.19054], end: [29.52661, -97.18093], startPoint: 'N Shiner', endPoint: 'Btw Shiner & Moulton' },                    // Leg 7
  { distance: 5.18, start: [29.52661, -97.18093], end: [29.58766, -97.17648], startPoint: 'Btw Shiner & Moulton', endPoint: 'Old Moulton' },                 // Leg 8
  { distance: 4.68, start: [29.58766, -97.17648], end: [29.63681, -97.13134], startPoint: 'Old Moulton', endPoint: 'Wiedemann' },                             // Leg 9
  { distance: 3.97, start: [29.63681, -97.13134], end: [29.68678, -97.10769], startPoint: 'Wiedemann', endPoint: 'Flatonia' },                                // Leg 10
  { distance: 4.31, start: [29.68678, -97.10769], end: [29.66852, -97.06731], startPoint: 'Flatonia', endPoint: 'Praha' },                                    // Leg 11
  { distance: 6.13, start: [29.66852, -97.06731], end: [29.67004, -96.97755], startPoint: 'Praha', endPoint: 'Wolters' },                                     // Leg 12
  { distance: 6.05, start: [29.67004, -96.97755], end: [29.67986, -96.9061], startPoint: 'Wolters', endPoint: 'Schulenburg' },                                // Leg 13
  { distance: 6.38, start: [29.67986, -96.9061], end: [29.65751, -96.82041], startPoint: 'Schulenburg', endPoint: "Molly's Corrale" },                        // Leg 14
  { distance: 5.33, start: [29.65751, -96.82041], end: [29.70267, -96.77938], startPoint: "Molly's Corrale", endPoint: 'Weimar' },                            // Leg 15
  { distance: 6.35, start: [29.70267, -96.77938], end: [29.69578, -96.69802], startPoint: 'Weimar', endPoint: '209 & 217' },                                  // Leg 16
  { distance: 6.78, start: [29.69578, -96.69802], end: [29.70202, -96.58678], startPoint: '209 & 217', endPoint: 'Train Switching Depot' },                   // Leg 17
  { distance: 4.42, start: [29.70202, -96.58678], end: [29.68867, -96.53743], startPoint: 'Train Switching Depot', endPoint: 'Columbus' },                    // Leg 18
  { distance: 3.70, start: [29.68867, -96.53743], end: [29.64193, -96.51491], startPoint: 'Columbus', endPoint: 'CR102' },                                    // Leg 19
  { distance: 6.82, start: [29.64193, -96.51491], end: [29.57088, -96.45564], startPoint: 'CR102', endPoint: 'Apocalypse' },                                  // Leg 20
  { distance: 6.82, start: [29.57088, -96.45564], end: [29.58562, -96.34902], startPoint: 'Apocalypse', endPoint: 'Colorado Co' },                            // Leg 21
  { distance: 2.84, start: [29.58562, -96.34902], end: [29.58991, -96.31321], startPoint: 'Colorado Co', endPoint: 'E Eagle Lake' },                          // Leg 22
  { distance: 6.52, start: [29.58991, -96.31321], end: [29.61015, -96.2076], startPoint: 'E Eagle Lake', endPoint: 'Giant Grain Elevator' },                  // Leg 23
  { distance: 5.05, start: [29.61015, -96.2076], end: [29.62733, -96.12717], startPoint: 'Giant Grain Elevator', endPoint: 'Country Oaks' },                  // Leg 24
  { distance: 6.08, start: [29.62733, -96.12717], end: [29.62058, -96.0348], startPoint: 'Country Oaks', endPoint: 'Wallis' },                                // Leg 25
  { distance: 6.40, start: [29.62058, -96.0348], end: [29.64363, -95.97649], startPoint: 'Wallis', endPoint: 'Orchard' },                                     // Leg 26
  { distance: 2.79, start: [29.64363, -95.97649], end: [29.68339, -95.97825], startPoint: 'Orchard', endPoint: 'Simonton' },                                  // Leg 27
  { distance: 5.02, start: [29.68339, -95.97825], end: [29.69019, -95.89984], startPoint: 'Simonton', endPoint: 'Fulshear' },                                // Leg 28
  { distance: 4.69, start: [29.69019, -95.89984], end: [29.71801, -95.8466], startPoint: 'Fulshear', endPoint: 'HEB Fulshear Bend' },                         // Leg 29
  { distance: 6.08, start: [29.71801, -95.8466], end: [29.73472, -95.76307], startPoint: 'HEB Fulshear Bend', endPoint: 'Good Times Running Co' },            // Leg 30
  { distance: 5.32, start: [29.73472, -95.76307], end: [29.73495, -95.68676], startPoint: 'Good Times Running Co', endPoint: 'GB Park' },                     // Leg 31
  { distance: 6.79, start: [29.73495, -95.68676], end: [29.76905, -95.64249], startPoint: 'GB Park', endPoint: 'Terry Hershey Trail' },                       // Leg 32
  { distance: 6.63, start: [29.76905, -95.64249], end: [29.74816, -95.57221], startPoint: 'Terry Hershey Trail', endPoint: 'Food Town' },                     // Leg 33
  { distance: 4.82, start: [29.74816, -95.57221], end: [29.7551, -95.49937], startPoint: 'Food Town', endPoint: 'Voss & Woodway' },                           // Leg 34
  { distance: 5.97, start: [29.7551, -95.49937], end: [29.76124, -95.41966], startPoint: 'Voss & Woodway', endPoint: 'Memorial Dr' },                         // Leg 35
  { distance: 5.32, start: [29.76124, -95.41966], end: [29.77128, -95.34853], startPoint: 'Memorial Dr', endPoint: 'Houston' },                               // Leg 36 (Finish)
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
    const difficulty = leg.distance > 6 ? 'hard' : leg.distance < 4 ? 'easy' : 'moderate'
    await prisma.leg.upsert({
      where: { legNumber },
      update: {
        distance: leg.distance,
        difficulty,
        startPoint: leg.startPoint,
        endPoint: leg.endPoint,
        startLat: leg.start[0],
        startLng: leg.start[1],
        endLat: leg.end[0],
        endLng: leg.end[1],
      },
      create: {
        legNumber,
        distance: leg.distance,
        difficulty,
        startPoint: leg.startPoint,
        endPoint: leg.endPoint,
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
