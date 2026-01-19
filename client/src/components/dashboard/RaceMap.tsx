import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ChevronRight, MapPin } from 'lucide-react'
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
  totalTime: string
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
}

// Component to fit map bounds on initial load
function FitBounds({ legs, selectedLeg }: { legs: Leg[], selectedLeg: Leg | null }) {
  const map = useMap()

  useEffect(() => {
    if (selectedLeg) {
      // Zoom to selected leg
      if (selectedLeg.startLat && selectedLeg.startLng && selectedLeg.endLat && selectedLeg.endLng) {
        const bounds = L.latLngBounds([
          [selectedLeg.startLat, selectedLeg.startLng],
          [selectedLeg.endLat, selectedLeg.endLng],
        ])
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
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
  }, [legs, map, selectedLeg])

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

export default function RaceMap({ legs, standings }: RaceMapProps) {
  const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Sort legs for sidebar
  const sortedLegs = useMemo(() => {
    return [...legs].sort((a, b) => a.legNumber - b.legNumber)
  }, [legs])

  // Build route polyline from leg coordinates
  const routePoints = useMemo(() => {
    const points: [number, number][] = []
    const sortedLegs = [...legs].sort((a, b) => a.legNumber - b.legNumber)

    for (const leg of sortedLegs) {
      if (leg.startLat && leg.startLng) {
        points.push([leg.startLat, leg.startLng])
      }
      if (leg.endLat && leg.endLng) {
        points.push([leg.endLat, leg.endLng])
      }
    }

    return points
  }, [legs])

  // Calculate van positions based on standings
  const vanPositions = useMemo(() => {
    const positions: VanPosition[] = []

    for (const standing of standings) {
      const currentLeg = standing.currentLeg || 1
      const teamName = standing.team.name
      const teamColor = standing.team.color || '#3b82f6'

      // Determine which van is active based on current leg
      // Van 1: legs 1-6, 13-18, 25-30
      // Van 2: legs 7-12, 19-24, 31-36
      const legIndex = ((currentLeg - 1) % 12)
      const activeVan = legIndex < 6 ? 1 : 2

      // Find the exchange point for the current leg
      const leg = legs.find(l => l.legNumber === currentLeg)
      if (leg && leg.startLat && leg.startLng) {
        positions.push({
          teamName,
          teamColor,
          vanNumber: activeVan,
          lat: leg.startLat,
          lng: leg.startLng,
          currentLeg,
          totalTime: formatTime(standing.totalTime),
        })
      }

      // Also show the other van at their last completed exchange
      const otherVan = activeVan === 1 ? 2 : 1
      let otherVanLeg: number

      if (activeVan === 1) {
        // Van 2 last ran: find the most recent van 2 leg completed
        if (currentLeg <= 6) otherVanLeg = 0 // Van 2 hasn't started
        else if (currentLeg <= 12) otherVanLeg = currentLeg - 6
        else if (currentLeg <= 18) otherVanLeg = 12
        else if (currentLeg <= 24) otherVanLeg = currentLeg - 6
        else if (currentLeg <= 30) otherVanLeg = 24
        else otherVanLeg = currentLeg - 6
      } else {
        // Van 1 last ran: find the most recent van 1 leg completed
        if (currentLeg <= 6) otherVanLeg = currentLeg
        else if (currentLeg <= 12) otherVanLeg = 6
        else if (currentLeg <= 18) otherVanLeg = currentLeg - 6
        else if (currentLeg <= 24) otherVanLeg = 18
        else if (currentLeg <= 30) otherVanLeg = currentLeg - 6
        else otherVanLeg = 30
      }

      if (otherVanLeg > 0) {
        const otherLeg = legs.find(l => l.legNumber === otherVanLeg)
        if (otherLeg && otherLeg.endLat && otherLeg.endLng) {
          positions.push({
            teamName,
            teamColor,
            vanNumber: otherVan,
            lat: otherLeg.endLat,
            lng: otherLeg.endLng,
            currentLeg: otherVanLeg,
            totalTime: 'Waiting',
          })
        }
      }
    }

    // Apply offsets to spread out vans at the same position
    return applyVanOffsets(positions)
  }, [standings, legs])

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
      <div className={cn(
        "bg-background border-r flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0"
      )}>
        {sidebarOpen && (
          <>
            <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
              <h4 className="font-semibold text-sm">Race Legs</h4>
              <button
                onClick={() => {
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
                  onClick={() => setSelectedLeg(leg)}
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
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-[1000] bg-background border rounded-r-md px-1 py-2 shadow-md hover:bg-muted"
        style={{ marginLeft: sidebarOpen ? '256px' : '0' }}
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform", sidebarOpen && "rotate-180")} />
      </button>

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

          <FitBounds legs={legs} selectedLeg={selectedLeg} />

          {/* Route polyline */}
          <Polyline
            positions={routePoints}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
          />

          {/* Highlight selected leg */}
          {selectedLeg && selectedLeg.startLat && selectedLeg.startLng && selectedLeg.endLat && selectedLeg.endLng && (
            <Polyline
              positions={[
                [selectedLeg.startLat, selectedLeg.startLng],
                [selectedLeg.endLat, selectedLeg.endLng],
              ]}
              color="#ef4444"
              weight={5}
              opacity={1}
            />
          )}

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
            >
              <Popup>
                <strong>{van.teamName} Van {van.vanNumber}</strong><br />
                {van.totalTime === 'Waiting' ? 'Waiting at exchange' : `Leg ${van.currentLeg}`}<br />
                {van.totalTime !== 'Waiting' && `Time: ${van.totalTime}`}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
