import { useState } from 'react'
import { Link, Routes, Route, NavLink } from 'react-router-dom'
import {
  Users,
  Route as RouteIcon,
  Timer,
  Upload,
  Settings,
  LayoutDashboard,
  LogOut,
  Menu,
  ChevronDown,
  UserCog
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/button'
import { cn } from '@/lib/utils'
import TeamsManager from '../components/admin/TeamsManager'
import RunnersManager from '../components/admin/RunnersManager'
import LegsManager from '../components/admin/LegsManager'
import TimeEntryAdmin from '../components/admin/TimeEntryAdmin'
import ImportExport from '../components/admin/ImportExport'
import RaceConfig from '../components/admin/RaceConfig'

const navItems = [
  { path: '/admin', label: 'Teams', icon: Users, end: true },
  { path: '/admin/runners', label: 'Runners', icon: UserCog },
  { path: '/admin/legs', label: 'Legs', icon: RouteIcon },
  { path: '/admin/entry', label: 'Time Entry', icon: Timer },
  { path: '/admin/import', label: 'Import/Export', icon: Upload },
  { path: '/admin/config', label: 'Settings', icon: Settings },
]

export default function AdminPanel() {
  const { logout } = useAuthStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
                <span className="text-sm font-bold text-white">TIR</span>
              </div>
            </Link>
            <div className="hidden sm:block">
              <h1 className="font-semibold leading-tight">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Race Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:block border-t">
          <div className="container">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* Mobile navigation toggle */}
        <div className="md:hidden border-t">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Menu className="h-4 w-4" />
              Navigation
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              mobileNavOpen && "rotate-180"
            )} />
          </button>
          {mobileNavOpen && (
            <div className="px-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6">
        <Routes>
          <Route index element={<TeamsManager />} />
          <Route path="runners" element={<RunnersManager />} />
          <Route path="legs" element={<LegsManager />} />
          <Route path="entry" element={<TimeEntryAdmin />} />
          <Route path="import" element={<ImportExport />} />
          <Route path="config" element={<RaceConfig />} />
        </Routes>
      </main>
    </div>
  )
}
