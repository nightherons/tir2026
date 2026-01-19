import { Activity } from 'lucide-react'
import type { TeamStanding } from '../../types'

interface CurrentRunnersProps {
  standings: TeamStanding[]
}

// Helper to determine if a color is light (for text contrast)
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// Helper to darken a hex color for borders
function darkenColor(hexColor: string, amount: number = 0.2): string {
  const hex = hexColor.replace('#', '')
  const r = Math.max(0, Math.floor(parseInt(hex.substring(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.floor(parseInt(hex.substring(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.floor(parseInt(hex.substring(4, 6), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function RunnerCard({ standing }: { standing: TeamStanding }) {
  const teamColor = standing.team.color || '#3b82f6'
  const isLight = isLightColor(teamColor)
  const borderColor = darkenColor(teamColor, 0.2)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-lg border-2 shadow-sm min-w-[200px] flex-shrink-0"
      style={{
        backgroundColor: teamColor,
        borderColor: borderColor,
        color: isLight ? '#1f2937' : '#ffffff',
      }}
    >
      {/* Logo icon */}
      <div className="relative flex-shrink-0">
        <img
          src="/nhrc.png"
          alt="NHRC"
          className="w-14 h-14 object-contain"
          style={{ filter: isLight ? 'none' : 'brightness(0) invert(1)' }}
        />
      </div>

      {/* Runner info */}
      <div className="min-w-0">
        <p className="font-semibold truncate text-sm">
          {standing.currentRunner?.name}
        </p>
        <p className="text-xs opacity-80">
          {standing.team.name} • Leg {standing.currentLeg}
        </p>
      </div>
    </div>
  )
}

export default function CurrentRunners({ standings }: CurrentRunnersProps) {
  const activeTeams = standings.filter((s) => s.currentRunner)

  if (activeTeams.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center gap-3">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">No runners currently on course</span>
      </div>
    )
  }

  // Calculate animation duration based on number of runners (more runners = longer scroll)
  const animationDuration = Math.max(15, activeTeams.length * 5)

  return (
    <div className="bg-muted/30 rounded-lg border">
      {/* Header */}
      <div className="px-4 py-2 border-b bg-muted/50 flex items-center gap-2">
        <Activity className="h-4 w-4 text-green-500" />
        <span className="font-semibold text-sm">Currently Running</span>
        <span className="text-xs text-muted-foreground ml-auto">{activeTeams.length} runners on course</span>
      </div>

      {/* Ticker container */}
      <div className="overflow-hidden relative">
        {/* Gradient fade on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />

        {/* Scrolling ticker - duplicate content for seamless loop */}
        <div
          className="flex gap-3 p-3 animate-ticker hover:pause-animation"
          style={{
            animationDuration: `${animationDuration}s`,
          }}
        >
          {/* First set of cards */}
          {activeTeams.map((standing) => (
            <RunnerCard key={standing.team.id} standing={standing} />
          ))}
          {/* Duplicate set for seamless looping */}
          {activeTeams.map((standing) => (
            <RunnerCard key={`dup-${standing.team.id}`} standing={standing} />
          ))}
        </div>
      </div>

      {/* CSS for ticker animation */}
      <style>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
