import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import type { Leg, TeamStanding } from '@/types'
import { cn } from '@/lib/utils'

// Helper to determine if a color is light (for stroke contrast)
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// Create a custom van icon with team color
function createVanIcon(teamColor: string, vanNumber: number): L.DivIcon {
  const color = teamColor || '#3b82f6'
  const strokeColor = isLightColor(color) ? '#333' : '#fff'

  // SVG van icon
  const vanSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 20" width="32" height="20">
      <!-- Van body -->
      <path d="M2 6 L2 16 Q2 18 4 18 L28 18 Q30 18 30 16 L30 6 Q30 4 28 4 L22 4 L20 2 L8 2 Q6 2 6 4 L6 4 L4 4 Q2 4 2 6 Z"
            fill="${color}" stroke="${strokeColor}" stroke-width="1.5"/>
      <!-- Windows -->
      <rect x="7" y="5" width="5" height="4" rx="0.5" fill="${strokeColor}" opacity="0.9"/>
      <rect x="14" y="5" width="4" height="4" rx="0.5" fill="${strokeColor}" opacity="0.9"/>
      <rect x="20" y="5" width="6" height="4" rx="0.5" fill="${strokeColor}" opacity="0.9"/>
      <!-- Wheels -->
      <circle cx="8" cy="18" r="3" fill="#333" stroke="${strokeColor}" stroke-width="1"/>
      <circle cx="8" cy="18" r="1.5" fill="#666"/>
      <circle cx="24" cy="18" r="3" fill="#333" stroke="${strokeColor}" stroke-width="1"/>
      <circle cx="24" cy="18" r="1.5" fill="#666"/>
      <!-- Van number badge -->
      <circle cx="27" cy="8" r="4" fill="${strokeColor}"/>
      <text x="27" y="10" text-anchor="middle" font-size="6" font-weight="bold" fill="${color}">${vanNumber}</text>
    </svg>
  `

  return L.divIcon({
    className: 'custom-van-marker',
    html: vanSvg,
    iconSize: [32, 20],
    iconAnchor: [16, 20],
  })
}

// Exchange point marker icon
const exchangeIcon = L.divIcon({
  className: 'exchange-marker',
  html: `
    <div style="
      width: 10px;
      height: 10px;
      background: #f59e0b;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Start/Finish marker icons
const startIcon = L.divIcon({
  className: 'start-marker',
  html: `
    <div style="
      background: #22c55e;
      color: #fff;
      border: 2px solid #fff;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">START</div>
  `,
  iconSize: [50, 20],
  iconAnchor: [25, 10],
})

const finishIcon = L.divIcon({
  className: 'finish-marker',
  html: `
    <div style="
      background: #ef4444;
      color: #fff;
      border: 2px solid #fff;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">FINISH</div>
  `,
  iconSize: [50, 20],
  iconAnchor: [25, 10],
})

interface VanPosition {
  teamName: string
  teamColor: string
  vanNumber: number
  lat: number
  lng: number
  currentLeg: number
  milesCompleted: string
  offsetLat?: number
  offsetLng?: number
}

// Apply offset to vans at the same position so they fan out
function applyVanOffsets(positions: VanPosition[]): VanPosition[] {
  // Group by approximate position (rounded to avoid floating point issues)
  const groups = new Map<string, VanPosition[]>()

  for (const pos of positions) {
    const key = `${pos.lat.toFixed(4)},${pos.lng.toFixed(4)}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(pos)
  }

  // Apply circular offset to groups with multiple vans
  const result: VanPosition[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0])
    } else {
      // Fan out in a circle around the point
      const radius = 0.003 // ~300m offset
      const angleStep = (2 * Math.PI) / group.length

      group.forEach((pos, index) => {
        const angle = angleStep * index - Math.PI / 2 // Start from top
        result.push({
          ...pos,
          offsetLat: pos.lat + radius * Math.cos(angle),
          offsetLng: pos.lng + radius * Math.sin(angle),
        })
      })
    }
  }

  return result
}

interface RaceMapProps {
  legs: Leg[]
  standings: TeamStanding[]
  raceStartTime?: string
  routePaths?: Record<string, [number, number][]>
}

// Component to fit map bounds on initial load
function FitBounds({ legs, selectedLeg, vanFocus, routePaths }: { legs: Leg[], selectedLeg: Leg | null, vanFocus?: [number, number] | null, routePaths?: Record<string, [number, number][]> }) {
  const map = useMap()

  useEffect(() => {
    if (selectedLeg) {
      if (vanFocus) {
        // Center on van position and zoom in
        map.setView(vanFocus, 13, { animate: true })
      } else {
        // Zoom to selected leg using detailed path if available
        const path = routePaths?.[String(selectedLeg.legNumber)]
        if (path && path.length >= 2) {
          const bounds = L.latLngBounds(path.map(p => [p[0], p[1]] as [number, number]))
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        } else if (selectedLeg.startLat && selectedLeg.startLng && selectedLeg.endLat && selectedLeg.endLng) {
          const bounds = L.latLngBounds([
            [selectedLeg.startLat, selectedLeg.startLng],
            [selectedLeg.endLat, selectedLeg.endLng],
          ])
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        }
      }
    } else if (legs.length > 0) {
      // Fit all legs
      const points: [number, number][] = legs
        .filter(l => l.endLat && l.endLng)
        .map(l => [l.endLat!, l.endLng!])

      if (points.length > 0) {
        const bounds = L.latLngBounds(points)
        map.fitBounds(bounds, { padding: [20, 20] })
      }
    }
  }, [legs, map, selectedLeg, vanFocus, routePaths])

  return null
}

// Difficulty badge colors
function getDifficultyColor(difficulty?: string): string {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800'
    case 'hard': return 'bg-red-100 text-red-800'
    default: return 'bg-yellow-100 text-yellow-800'
  }
}

// Haversine distance between two [lat, lng] points in meters
function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Given a detailed path and a progress [0,1], interpolate position along the path
function interpolateAlongPath(path: [number, number][], progress: number): [number, number] {
  if (path.length === 0) return [0, 0]
  if (path.length === 1 || progress <= 0) return path[0]
  if (progress >= 1) return path[path.length - 1]

  // Compute cumulative distances
  const cumDist: number[] = [0]
  for (let i = 1; i < path.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineDistance(path[i - 1], path[i]))
  }
  const totalDist = cumDist[cumDist.length - 1]
  const targetDist = progress * totalDist

  // Find the segment
  for (let i = 1; i < cumDist.length; i++) {
    if (cumDist[i] >= targetDist) {
      const segLen = cumDist[i] - cumDist[i - 1]
      const t = segLen > 0 ? (targetDist - cumDist[i - 1]) / segLen : 0
      return [
        path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
        path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
      ]
    }
  }
  return path[path.length - 1]
}

export default function RaceMap({ legs, standings, raceStartTime, routePaths }: RaceMapProps) {
  const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null)
  const [vanFocus, setVanFocus] = useState<[number, number] | null>(null)
  const [tick, setTick] = useState(0)

  // Tick every 5 seconds to update van positions
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  // Sort legs for sidebar
  const sortedLegs = useMemo(() => {
    return [...legs].sort((a, b) => a.legNumber - b.legNumber)
  }, [legs])

  // Build route polyline from detailed paths (or fall back to straight lines)
  const routePoints = useMemo(() => {
    const points: [number, number][] = []
    const sorted = [...legs].sort((a, b) => a.legNumber - b.legNumber)

    for (const leg of sorted) {
      const path = routePaths?.[String(leg.legNumber)]
      if (path && path.length > 0) {
        // Skip the first point if it duplicates the last point already added
        const startIdx = points.length > 0 &&
          points[points.length - 1][0] === path[0][0] &&
          points[points.length - 1][1] === path[0][1]
          ? 1 : 0
        for (let i = startIdx; i < path.length; i++) {
          points.push(path[i])
        }
      } else {
        // Fallback to straight line
        if (leg.startLat && leg.startLng) {
          points.push([leg.startLat, leg.startLng])
        }
        if (leg.endLat && leg.endLng) {
          points.push([leg.endLat, leg.endLng])
        }
      }
    }

    return points
  }, [legs, routePaths])

  // Calculate van positions based on standings, with time-based interpolation
  const vanPositions = useMemo(() => {
    const positions: VanPosition[] = []
    const sortedLegs = [...legs].sort((a, b) => a.legNumber - b.legNumber)

    for (const standing of standings) {
      const teamName = standing.team.name
      const teamColor = standing.team.color || '#3b82f6'

      // Try time-based interpolation if we have legTimings and raceStartTime
      let interpolatedLegNum: number | null = null
      let interpolatedLat: number | null = null
      let interpolatedLng: number | null = null

      if (raceStartTime && standing.legTimings && standing.legTimings.length === 36) {
        const raceStart = new Date(raceStartTime).getTime()
        const elapsed = (Date.now() - raceStart) / 1000

        if (elapsed > 0) {
          let cumulative = 0
          for (let i = 0; i < 36; i++) {
            const legSeconds = standing.legTimings[i]
            if (cumulative + legSeconds > elapsed) {
              // Van is on leg i+1 (1-indexed)
              const progress = Math.min((elapsed - cumulative) / legSeconds, 0.95)
              const legNum = i + 1
              const leg = sortedLegs.find(l => l.legNumber === legNum)
              const path = routePaths?.[String(legNum)]

              if (path && path.length >= 2) {
                // Interpolate along the detailed road path
                const pos = interpolateAlongPath(path, progress)
                interpolatedLegNum = legNum
                interpolatedLat = pos[0]
                interpolatedLng = pos[1]
              } else if (leg && leg.startLat && leg.startLng && leg.endLat && leg.endLng) {
                // Fallback to straight-line lerp
                interpolatedLegNum = legNum
                interpolatedLat = leg.startLat + (leg.endLat - leg.startLat) * progress
                interpolatedLng = leg.startLng + (leg.endLng - leg.startLng) * progress
              }
              break
            }
            cumulative += legSeconds
          }

          // If elapsed exceeds all 36 legs, van is at finish
          if (interpolatedLegNum === null) {
            const lastLeg = sortedLegs.find(l => l.legNumber === 36)
            if (lastLeg && lastLeg.endLat && lastLeg.endLng) {
              interpolatedLegNum = 36
              interpolatedLat = lastLeg.endLat
              interpolatedLng = lastLeg.endLng
            }
          }
        }
      }

      // Use interpolated position or fall back to static start-of-leg
      const currentLeg = interpolatedLegNum || standing.currentLeg || 1

      // Determine active van based on which leg the runner is on
      const legIndex = ((currentLeg - 1) % 12)
      const activeVan = legIndex < 6 ? 1 : 2

      if (interpolatedLat !== null && interpolatedLng !== null) {
        positions.push({
          teamName,
          teamColor,
          vanNumber: activeVan,
          lat: interpolatedLat,
          lng: interpolatedLng,
          currentLeg,
          milesCompleted: `${standing.milesCompleted?.toFixed(1) || '0.0'} mi`,
        })
      } else {
        // Fallback: place van at start of current leg
        const leg = legs.find(l => l.legNumber === currentLeg)
        if (leg && leg.startLat && leg.startLng) {
          positions.push({
            teamName,
            teamColor,
            vanNumber: activeVan,
            lat: leg.startLat,
            lng: leg.startLng,
            currentLeg,
            milesCompleted: `${standing.milesCompleted?.toFixed(1) || '0.0'} mi`,
          })
        }
      }

    }

    // Apply offsets to spread out vans at the same position
    return applyVanOffsets(positions)
  }, [standings, legs, raceStartTime, tick, routePaths])

  // Get exchange markers (end points of each leg)
  const exchangeMarkers = useMemo(() => {
    return legs
      .filter(l => l.endLat && l.endLng)
      .map(l => ({
        legNumber: l.legNumber,
        lat: l.endLat!,
        lng: l.endLng!,
        distance: l.distance,
      }))
  }, [legs])

  // Get start point
  const startPoint = useMemo(() => {
    const firstLeg = legs.find(l => l.legNumber === 1)
    if (firstLeg && firstLeg.startLat && firstLeg.startLng) {
      return { lat: firstLeg.startLat, lng: firstLeg.startLng }
    }
    return null
  }, [legs])

  // Get finish point
  const finishPoint = useMemo(() => {
    const lastLeg = legs.find(l => l.legNumber === 36)
    if (lastLeg && lastLeg.endLat && lastLeg.endLng) {
      return { lat: lastLeg.endLat, lng: lastLeg.endLng }
    }
    return null
  }, [legs])

  // Default center (middle of Texas route)
  const defaultCenter: [number, number] = [29.65, -96.4]

  if (legs.length === 0 || !routePoints.length) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map data...</p>
      </div>
    )
  }

  return (
    <div className="h-[500px] rounded-lg overflow-hidden border flex">
      {/* Leg sidebar */}
      <div className="w-64 bg-background border-r flex flex-col">
        <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
          <h4 className="font-semibold text-sm">Race Legs</h4>
          <button
            onClick={() => {
              setVanFocus(null)
              setSelectedLeg(null)
            }}
            className="text-xs text-primary hover:underline"
          >
            View All
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedLegs.map((leg) => (
            <button
              key={leg.legNumber}
              onClick={() => { setVanFocus(null); setSelectedLeg(leg) }}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-2 border-b text-sm transition-colors",
                selectedLeg?.legNumber === leg.legNumber && "bg-primary/10 border-l-2 border-l-primary"
              )}
            >
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Leg {leg.legNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {leg.distance.toFixed(2)} mi
                  {leg.difficulty && (
                    <span className={cn(
                      "ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium",
                      getDifficultyColor(leg.difficulty)
                    )}>
                      {leg.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 relative">
        <MapContainer
          center={defaultCenter}
          zoom={9}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds legs={legs} selectedLeg={selectedLeg} vanFocus={vanFocus} routePaths={routePaths} />

          {/* Route polyline */}
          <Polyline
            positions={routePoints}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
          />

          {/* Highlight selected leg */}
          {selectedLeg && (() => {
            const path = routePaths?.[String(selectedLeg.legNumber)]
            if (path && path.length >= 2) {
              return (
                <Polyline
                  positions={path}
                  color="#ef4444"
                  weight={5}
                  opacity={1}
                />
              )
            }
            if (selectedLeg.startLat && selectedLeg.startLng && selectedLeg.endLat && selectedLeg.endLng) {
              return (
                <Polyline
                  positions={[
                    [selectedLeg.startLat, selectedLeg.startLng],
                    [selectedLeg.endLat, selectedLeg.endLng],
                  ]}
                  color="#ef4444"
                  weight={5}
                  opacity={1}
                />
              )
            }
            return null
          })()}

          {/* Start marker */}
          {startPoint && (
            <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
              <Popup>
                <strong>Race Start</strong><br />
                Gonzales, TX
              </Popup>
            </Marker>
          )}

          {/* Exchange markers */}
          {exchangeMarkers.map((ex) => (
            <Marker
              key={ex.legNumber}
              position={[ex.lat, ex.lng]}
              icon={exchangeIcon}
            >
              <Popup>
                <strong>Exchange {ex.legNumber}</strong><br />
                After Leg {ex.legNumber} ({ex.distance} mi)
              </Popup>
            </Marker>
          ))}

          {/* Finish marker */}
          {finishPoint && (
            <Marker position={[finishPoint.lat, finishPoint.lng]} icon={finishIcon}>
              <Popup>
                <strong>Race Finish</strong><br />
                Houston, TX
              </Popup>
            </Marker>
          )}

          {/* Van markers */}
          {vanPositions.map((van, idx) => (
            <Marker
              key={`${van.teamName}-${van.vanNumber}-${idx}`}
              position={[van.offsetLat ?? van.lat, van.offsetLng ?? van.lng]}
              icon={createVanIcon(van.teamColor, van.vanNumber)}
              eventHandlers={{
                click: () => {
                  const leg = legs.find(l => l.legNumber === van.currentLeg)
                  if (leg) {
                    setVanFocus([van.offsetLat ?? van.lat, van.offsetLng ?? van.lng])
                    setSelectedLeg(leg)
                  }
                },
              }}
            >
              <Popup>
                <strong>{van.teamName} Van {van.vanNumber}</strong><br />
                Leg {van.currentLeg}<br />
                {van.milesCompleted}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}