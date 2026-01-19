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
} from 'recharts'
import type { TeamStanding } from '../../types'

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
  // This would normally come from historical data via API
  // For now, we'll show a placeholder
  const hasData = standings.length > 0 && standings.some((s) => s.completedLegs > 0)

  const chartData = useMemo(() => {
    // Generate sample data based on completed legs
    // In production, this would come from the API with actual pace data per leg
    const data = []
    const maxLegs = Math.max(...standings.map((s) => s.completedLegs), 1)

    for (let leg = 1; leg <= maxLegs; leg++) {
      const point: Record<string, unknown> = { leg }
      standings.forEach((standing) => {
        // Simulated pace data - in production, get actual per-leg data
        if (standing.completedLegs >= leg) {
          // Random variation around 7 min/mile pace
          point[standing.team.name] = 7 + (Math.random() - 0.5)
        }
      })
      data.push(point)
    }

    return data
  }, [standings])

  if (!hasData) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pace Over Time</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Pace chart will appear as race progresses
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pace Over Time</h3>
      <p className="text-sm text-gray-500 mb-4">Average pace (min/mile) by leg</p>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="leg"
              label={{ value: 'Leg', position: 'bottom', offset: -5 }}
              tick={{ fontSize: 12 }}
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
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)} min/mi`, '']}
              labelFormatter={(label) => `Leg ${label}`}
            />
            <Legend />
            {standings.map((standing) => (
              <Line
                key={standing.team.id}
                type="monotone"
                dataKey={standing.team.name}
                stroke={teamChartColors[standing.team.name] || '#9ca3af'}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
