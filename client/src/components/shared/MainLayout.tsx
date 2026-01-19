import { Outlet, Link } from 'react-router-dom'
import { Timer, Radio, LogOut, Settings, ClipboardList } from 'lucide-react'
import { useSocketStore } from '../../store/socketStore'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

export default function MainLayout() {
  const { isConnected } = useSocketStore()
  const { userType, logout } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
              <span className="text-lg font-bold text-white">TIR</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-foreground leading-tight">
                Texas Independence Relay
              </h1>
              <p className="text-xs text-muted-foreground">
                Night Heron Running Club 2026
              </p>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-2 sm:gap-4">
            {/* Connection status */}
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className={cn(
                "gap-1.5 hidden sm:flex",
                isConnected && "bg-green-600 hover:bg-green-600"
              )}
            >
              <Radio className={cn("h-3 w-3", isConnected && "animate-pulse")} />
              {isConnected ? 'Live' : 'Offline'}
            </Badge>

            {/* Mobile live indicator */}
            <div className="sm:hidden">
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )} />
            </div>

            {/* Entry link */}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/entry" className="gap-2">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">Enter Time</span>
              </Link>
            </Button>

            {/* Auth links */}
            {userType === 'admin' && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            {userType === 'captain' && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/captain" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Van Entry</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/30">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            Night Heron Running Club — Texas Independence Relay 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
