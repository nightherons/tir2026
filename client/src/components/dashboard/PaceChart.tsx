import { useMemo } from 'react'
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
import { zoneBands, getZoneName, formatDeviation } from '../../utils/zones'

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

export default function PaceChart({ standings }: PaceChartProps) {
  // Determine max completed leg across all teams (only show actual data)
  const maxCompletedLeg = useMemo(() => {
    return Math.max(...standings.map(s => s.completedLegs), 0)
  }, [standings])

  const chartData = useMemo(() => {
    if (maxCompletedLeg === 0) return []

    const data = []
    for (let leg = 1; leg <= maxCompletedLeg; leg++) {
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
  const vanTransitions = [6.5, 12.5, 18.5, 24.5, 30.5].filter(v => v <= maxCompletedLeg)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projection Accuracy by Leg</CardTitle>
        <p className="text-sm text-muted-foreground">Actual vs projected pace per leg</p>
      </CardHeader>
      <CardContent>
        <div className="h-56 sm:h-72 lg:h-80">
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
                  label={{
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
                tick={{ fontSize: 10 }}
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
      </CardContent>
    </Card>
  )
}
