'use client'

import { motion } from 'framer-motion'
import {
  Youtube,
  LayoutDashboard,
  Tv,
  Brain,
  Lightbulb,
  Wand2,
  FileText,
  KanbanSquare,
  CalendarDays,
  StickyNote,
  BarChart3,
  FolderOpen,
  MessageSquare,
  Bell,
  Settings,
  ChevronLeft,
  Sparkles,
  Crown,
} from 'lucide-react'
import { useAppStore, type ViewKey } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  key: ViewKey
  label: string
  icon: typeof LayoutDashboard
  group: 'main' | 'create' | 'organize' | 'system'
  badge?: string
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { key: 'channels', label: 'YouTube Channels', icon: Tv, group: 'main' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, group: 'main' },
  { key: 'analysis', label: 'AI Analysis', icon: Brain, group: 'create', badge: 'AI' },
  { key: 'recommendations', label: 'Recommendations', icon: Lightbulb, group: 'create', badge: 'AI' },
  { key: 'idea-lab', label: 'AI Idea Lab', icon: Wand2, group: 'create', badge: 'AI' },
  { key: 'script', label: 'Script Generator', icon: FileText, group: 'create', badge: 'AI' },
  { key: 'workflow', label: 'Workflow', icon: KanbanSquare, group: 'organize' },
  { key: 'planner', label: 'Content Planner', icon: CalendarDays, group: 'organize' },
  { key: 'notes', label: 'Notes', icon: StickyNote, group: 'organize' },
  { key: 'files', label: 'File Manager', icon: FolderOpen, group: 'organize' },
  { key: 'community', label: 'Community', icon: MessageSquare, group: 'organize' },
  { key: 'notifications', label: 'Notifications', icon: Bell, group: 'system' },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'system' },
]

const groupLabels: Record<string, string> = {
  main: 'Overview',
  create: 'AI Studio',
  organize: 'Workspace',
  system: 'System',
}

export function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const { view, navigate, sidebarCollapsed, toggleSidebar } = useAppStore()

  const groups = ['main', 'create', 'organize', 'system'] as const

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 76 : 264 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="hidden md:flex flex-col glass border-r border-border/60 relative z-20"
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border/60 shrink-0">
        <div className="relative shrink-0">
          <div className="absolute inset-0 grad-primary blur-md opacity-50" />
          <div className="relative w-10 h-10 rounded-xl grad-primary flex items-center justify-center shadow-lg">
            <Youtube className="w-5 h-5 text-white" />
          </div>
        </div>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 min-w-0"
          >
            <h1 className="font-bold text-base leading-tight">TubeFlow AI</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Creator Studio
            </p>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-styled px-3 py-4 space-y-5">
        {groups.map((g) => {
          const items = navItems.filter((i) => i.group === g)
          return (
            <div key={g} className="space-y-1">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-1">
                  {groupLabels[g]}
                </p>
              )}
              {items.map((item) => {
                const active = view === item.key
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={cn(
                      'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group overflow-hidden',
                      active
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:translate-x-0.5'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {/* Hover left-edge accent */}
                    {!active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 grad-primary rounded-r-full group-hover:h-6 transition-all duration-300" />
                    )}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 grad-primary rounded-xl shadow-lg"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] shrink-0 relative z-10 transition-transform group-hover:scale-110',
                        active && 'drop-shadow'
                      )}
                    />
                    {!sidebarCollapsed && (
                      <span className="relative z-10 flex-1 text-left">{item.label}</span>
                    )}
                    {!sidebarCollapsed && item.badge && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          'relative z-10 h-5 px-1.5 text-[9px] font-bold uppercase',
                          active
                            ? 'bg-white/20 text-white border-0'
                            : 'grad-warm text-white border-0'
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {item.key === 'notifications' && unreadCount > 0 && !sidebarCollapsed && (
                      <span className="relative z-10 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                    {item.key === 'notifications' && unreadCount > 0 && sidebarCollapsed && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Pro card */}
      {!sidebarCollapsed && (
        <div className="p-3">
          <div className="relative overflow-hidden rounded-2xl p-4 grad-primary text-white shadow-lg">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Pro Plan</span>
              </div>
              <p className="text-xs text-white/80 mb-3">
                Unlock unlimited AI scripts & deep analytics.
              </p>
              <button className="w-full bg-white/15 hover:bg-white/25 backdrop-blur text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:scale-110 transition-transform z-30"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            sidebarCollapsed && 'rotate-180'
          )}
        />
      </button>
    </motion.aside>
  )
}
