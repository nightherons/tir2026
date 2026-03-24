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

  // Compute Y-axis range from data
  const yRange = useMemo(() => {
    let min = -10
    let max = 10
    for (const point of chartData) {
      for (const key of Object.keys(point)) {
        if (key === 'leg') continue
        const val = point[key] as number
        if (val < min) min = val
        if (val > max) max = val
      }
    }
    // Pad a bit and round to nearest 5
    return [Math.floor((min - 2) / 5) * 5, Math.ceil((max + 2) / 5) * 5]
  }, [chartData])

  if (maxCompletedLeg === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accuracy by Leg</CardTitle>
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
        <CardTitle>Accuracy by Leg</CardTitle>
        <p className="text-sm text-muted-foreground">% deviation from projected pace per leg</p>
      </CardHeader>
      <CardContent>
        <div className="h-56 sm:h-72 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
              {/* Zone bands */}
              {zoneBands.map(band => {
                const clampedMin = Math.max(band.min, yRange[0])
                const clampedMax = Math.min(band.max, yRange[1])
                if (clampedMin >= clampedMax) return null
                return (
                  <ReferenceArea
                    key={band.zone}
                    y1={clampedMin}
                    y2={clampedMax}
                    fill={band.fill}
                    fillOpacity={0.4}
                    label={{
                      value: band.zone,
                      position: 'insideRight',
                      fontSize: 9,
                      fill: '#9ca3af',
                    }}
                  />
                )
              })}
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="leg"
                tick={{ fontSize: 10 }}
                label={{ value: 'Leg', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                label={{
                  value: 'Deviation %',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 11 },
                }}
                domain={yRange}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}%`}
                width={50}
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
