import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const kmlPath = resolve(__dirname, '..', 'route.kml')
const outputPath = resolve(__dirname, '..', 'client', 'public', 'route.json')

const kml = readFileSync(kmlPath, 'utf-8')

const result: Record<string, [number, number][]> = {}

// Match each Placemark that has a Leg name and LineString coordinates
const placemarkRegex = /<Placemark>\s*<name>(Leg (\d+)[^<]*)<\/name>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Placemark>/g

let match: RegExpExecArray | null
while ((match = placemarkRegex.exec(kml)) !== null) {
  const legNumber = match[2]
  const coordsRaw = match[3]

  const coords: [number, number][] = coordsRaw
    .trim()
    .split(/\s+/)
    .filter(line => line.length > 0)
    .map(line => {
      const [lng, lat] = line.split(',').map(Number)
      return [lat, lng] as [number, number]
    })

  result[legNumber] = coords
}

const legCount = Object.keys(result).length
console.log(`Parsed ${legCount} legs from KML`)

for (const [leg, coords] of Object.entries(result)) {
  console.log(`  Leg ${leg}: ${coords.length} points`)
}

writeFileSync(outputPath, JSON.stringify(result))
console.log(`\nWritten to ${outputPath}`)
