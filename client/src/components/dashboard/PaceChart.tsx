import { useMemo, useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import type { TeamStanding } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ChevronDown } from 'lucide-react'
import { zoneBands, getZoneName, formatDeviation, zoneStyles } from '../../utils/zones'

interface PaceChartProps {
  standings: TeamStanding[]
}

const teamChartColors: Record<string, string> = {
  BLACK: '#1a1a1a',
  BLUE: '#2563eb',
  GREY: '#6b7280',
  WHITE: '#94a3b8',
  RED: '#dc2626',
  GREEN: '#16a34a',
}

const zoneGuide = [
  { zone: 'Sandbagged', range: '> +10%', desc: 'Clearly lowballed projection' },
  { zone: 'Humble', range: '+5% to +10%', desc: 'Undersold themselves' },
  { zone: 'Dialed In', range: '+1% to +5%', desc: 'Knew their ability, slightly exceeded' },
  { zone: 'On the Nose', range: '±1%', desc: 'Nailed the projection' },
  { zone: 'Optimistic', range: '-1% to -5%', desc: 'Slightly ambitious' },
  { zone: 'Overconfident', range: '-5% to -10%', desc: 'Projected too aggressively' },
  { zone: 'Delusional', range: '> -10%', desc: 'Fantasy pace' },
] as const

export default function PaceChart({ standings }: PaceChartProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const [showGuide, setShowGuide] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Determine max completed leg across all teams (only show actual data)
  const maxCompletedLeg = useMemo(() => {
    return Math.max(...standings.map(s => s.completedLegs), 0)
  }, [standings])

  const chartData = useMemo(() => {
    if (maxCompletedLeg === 0) return []

    const data = []
    for (let leg = 1; leg <= 36; leg++) {
      const point: Record<string, unknown> = { leg }
      for (const standing of standings) {
        const actual = standing.legTimings?.[leg - 1]
        const projected = standing.legProjectedTimes?.[leg - 1]
        // Only include completed legs
        if (leg <= standing.completedLegs && actual && projected && projected > 0) {
          const deviation = ((projected - actual) / projected) * 100
          point[standing.team.name] = Math.round(deviation * 10) / 10
        }
      }
      data.push(point)
    }
    return data
  }, [standings, maxCompletedLeg])

  // Fixed Y-axis range with zone boundary ticks
  const yRange: [number, number] = [-20, 20]
  const yTicks = [-20, -10, -5, -1, 0, 1, 5, 10, 20]

  if (maxCompletedLeg === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projection Accuracy by Leg</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Accuracy chart will appear as race progresses
          </div>
        </CardContent>
      </Card>
    )
  }

  // Van transitions happen at legs 6→7, 12→13, 18→19, 24→25, 30→31
  const vanTransitions = [6.5, 12.5, 18.5, 24.5, 30.5]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projection Accuracy by Leg</CardTitle>
        <p className="text-sm text-muted-foreground">Actual vs projected pace per leg</p>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-72 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
              {/* Zone bands */}
              {zoneBands.map(band => (
                <ReferenceArea
                  key={band.zone}
                  y1={band.min}
                  y2={band.max}
                  fill={band.fill}
                  fillOpacity={0.4}
                  label={isMobile ? undefined : {
                    value: band.zone,
                    position: 'insideRight',
                    fontSize: 9,
                    fill: '#9ca3af',
                  }}
                />
              ))}
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="leg"
                type="number"
                domain={[1, 36]}
                ticks={isMobile
                  ? [1, 6, 12, 18, 24, 30, 36]
                  : Array.from({ length: 36 }, (_, i) => i + 1)
                }
                tick={{ fontSize: isMobile ? 9 : 8 }}
                label={{ value: 'Leg', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                domain={yRange}
                ticks={yTicks}
                tick={{ fontSize: 9 }}
                tickFormatter={(value: number) => `${value > 0 ? '+' : ''}${value}%`}
                width={46}
              />
              <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.3} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${formatDeviation(value)} (${getZoneName(value)})`,
                  name,
                ]}
                labelFormatter={(label) => `Leg ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              {vanTransitions.map(v => (
                <ReferenceLine
                  key={v}
                  x={v}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />
              ))}
              {standings.map((standing) => (
                <Line
                  key={standing.team.id}
                  type="monotone"
                  dataKey={standing.team.name}
                  stroke={teamChartColors[standing.team.name] || '#9ca3af'}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Collapsible zone guide */}
        <div className="mt-3 border-t pt-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
            Zone Guide
          </button>
          {showGuide && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs">
              {zoneGuide.map(({ zone, range, desc }) => {
                const style = zoneStyles[zone]
                return (
                  <div key={zone} className="flex items-center gap-2 py-0.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${style.bg} ${style.color}`}>
                      {zone}
                    </span>
                    <span className="text-muted-foreground font-mono">{range}</span>
                    <span className="text-muted-foreground hidden sm:inline">— {desc}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
