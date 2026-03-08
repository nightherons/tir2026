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
} from 'recharts'
import type { TeamStanding, Leg } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface PaceChartProps {
  standings: TeamStanding[]
  legs: Leg[]
}

const teamChartColors: Record<string, string> = {
  BLACK: '#1a1a1a',
  BLUE: '#2563eb',
  GREY: '#6b7280',
  WHITE: '#94a3b8',
  RED: '#dc2626',
  GREEN: '#16a34a',
}

export default function PaceChart({ standings, legs }: PaceChartProps) {
  const legDistances = useMemo(() => {
    const map = new Map<number, number>()
    for (const leg of legs) {
      map.set(leg.legNumber, leg.distance)
    }
    return map
  }, [legs])

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
        if (standing.legTimings && standing.legTimings.length >= leg) {
          const timeSeconds = standing.legTimings[leg - 1]
          const distance = legDistances.get(leg) || 5
          // Only include if this leg is completed for this team
          if (leg <= standing.completedLegs) {
            const paceMinPerMile = (timeSeconds / distance) / 60
            point[standing.team.name] = Math.round(paceMinPerMile * 100) / 100
          }
        }
      }
      data.push(point)
    }
    return data
  }, [standings, legDistances, maxCompletedLeg])

  if (maxCompletedLeg === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pace Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Pace chart will appear as race progresses
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
        <CardTitle>Pace Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">Actual pace (min/mile) by completed leg</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="leg"
                tick={{ fontSize: 12 }}
                label={{ value: 'Leg', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{
                  value: 'Pace (min/mi)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                }}
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toFixed(1)}
                reversed
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${Math.floor(value)}:${Math.round((value % 1) * 60).toString().padStart(2, '0')}/mi`,
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
