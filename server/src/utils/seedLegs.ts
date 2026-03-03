import type { PrismaClient } from '@prisma/client'

const legData = [
  { distance: 5.22, start: [29.503671, -97.444339], end: [29.49606, -97.38505], startPoint: 'Gonzales', endPoint: 'Chicken Farm' },
  { distance: 5.34, start: [29.49606, -97.38505], end: [29.47556, -97.30774], startPoint: 'Chicken Farm', endPoint: "Sam's Oak" },
  { distance: 4.86, start: [29.47556, -97.30774], end: [29.48651, -97.26951], startPoint: "Sam's Oak", endPoint: 'Country Vista' },
  { distance: 4.08, start: [29.48651, -97.26951], end: [29.46001, -97.22472], startPoint: 'Country Vista', endPoint: 'Krejci' },
  { distance: 3.92, start: [29.46001, -97.22472], end: [29.4309, -97.17125], startPoint: 'Krejci', endPoint: 'Shiner' },
  { distance: 4.10, start: [29.4309, -97.17125], end: [29.48384, -97.19054], startPoint: 'Shiner', endPoint: 'N Shiner' },
  { distance: 3.71, start: [29.48384, -97.19054], end: [29.52661, -97.18093], startPoint: 'N Shiner', endPoint: 'Btw Shiner & Moulton' },
  { distance: 5.18, start: [29.52661, -97.18093], end: [29.58766, -97.17648], startPoint: 'Btw Shiner & Moulton', endPoint: 'Old Moulton' },
  { distance: 4.68, start: [29.58766, -97.17648], end: [29.63681, -97.13134], startPoint: 'Old Moulton', endPoint: 'Wiedemann' },
  { distance: 3.97, start: [29.63681, -97.13134], end: [29.68678, -97.10769], startPoint: 'Wiedemann', endPoint: 'Flatonia' },
  { distance: 4.31, start: [29.68678, -97.10769], end: [29.66852, -97.06731], startPoint: 'Flatonia', endPoint: 'Praha' },
  { distance: 6.13, start: [29.66852, -97.06731], end: [29.67004, -96.97755], startPoint: 'Praha', endPoint: 'Wolters' },
  { distance: 6.05, start: [29.67004, -96.97755], end: [29.67986, -96.9061], startPoint: 'Wolters', endPoint: 'Schulenburg' },
  { distance: 6.38, start: [29.67986, -96.9061], end: [29.65751, -96.82041], startPoint: 'Schulenburg', endPoint: "Molly's Corrale" },
  { distance: 5.33, start: [29.65751, -96.82041], end: [29.70267, -96.77938], startPoint: "Molly's Corrale", endPoint: 'Weimar' },
  { distance: 6.35, start: [29.70267, -96.77938], end: [29.69578, -96.69802], startPoint: 'Weimar', endPoint: '209 & 217' },
  { distance: 6.78, start: [29.69578, -97.69802], end: [29.70202, -96.58678], startPoint: '209 & 217', endPoint: 'Train Switching Depot' },
  { distance: 4.42, start: [29.70202, -96.58678], end: [29.68867, -96.53743], startPoint: 'Train Switching Depot', endPoint: 'Columbus' },
  { distance: 3.70, start: [29.68867, -96.53743], end: [29.64193, -96.51491], startPoint: 'Columbus', endPoint: 'CR102' },
  { distance: 6.82, start: [29.64193, -96.51491], end: [29.57088, -96.45564], startPoint: 'CR102', endPoint: 'Apocalypse' },
  { distance: 6.82, start: [29.57088, -96.45564], end: [29.58562, -96.34902], startPoint: 'Apocalypse', endPoint: 'Colorado Co' },
  { distance: 2.84, start: [29.58562, -96.34902], end: [29.58991, -96.31321], startPoint: 'Colorado Co', endPoint: 'E Eagle Lake' },
  { distance: 6.52, start: [29.58991, -96.31321], end: [29.61015, -96.2076], startPoint: 'E Eagle Lake', endPoint: 'Giant Grain Elevator' },
  { distance: 5.05, start: [29.61015, -96.2076], end: [29.62733, -96.12717], startPoint: 'Giant Grain Elevator', endPoint: 'Country Oaks' },
  { distance: 6.08, start: [29.62733, -96.12717], end: [29.62058, -96.0348], startPoint: 'Country Oaks', endPoint: 'Wallis' },
  { distance: 6.40, start: [29.62058, -96.0348], end: [29.64363, -95.97649], startPoint: 'Wallis', endPoint: 'Orchard' },
  { distance: 2.79, start: [29.64363, -95.97649], end: [29.68339, -95.97825], startPoint: 'Orchard', endPoint: 'Simonton' },
  { distance: 5.02, start: [29.68339, -95.97825], end: [29.69019, -95.89984], startPoint: 'Simonton', endPoint: 'Fulshear' },
  { distance: 4.69, start: [29.69019, -95.89984], end: [29.71801, -95.8466], startPoint: 'Fulshear', endPoint: 'HEB Fulshear Bend' },
  { distance: 6.08, start: [29.71801, -95.8466], end: [29.73472, -95.76307], startPoint: 'HEB Fulshear Bend', endPoint: 'Good Times Running Co' },
  { distance: 5.32, start: [29.73472, -95.76307], end: [29.73495, -95.68676], startPoint: 'Good Times Running Co', endPoint: 'GB Park' },
  { distance: 6.79, start: [29.73495, -95.68676], end: [29.76905, -95.64249], startPoint: 'GB Park', endPoint: 'Terry Hershey Trail' },
  { distance: 6.63, start: [29.76905, -95.64249], end: [29.74816, -95.57221], startPoint: 'Terry Hershey Trail', endPoint: 'Food Town' },
  { distance: 4.82, start: [29.74816, -95.57221], end: [29.7551, -95.49937], startPoint: 'Food Town', endPoint: 'Voss & Woodway' },
  { distance: 5.97, start: [29.7551, -95.49937], end: [29.76124, -95.41966], startPoint: 'Voss & Woodway', endPoint: 'Memorial Dr' },
  { distance: 5.32, start: [29.76124, -95.41966], end: [29.77128, -95.34853], startPoint: 'Memorial Dr', endPoint: 'Houston' },
]

export async function seedLegs(prisma: PrismaClient) {
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
  console.log('Seeded 36 legs with exchange points and coordinates')
}
