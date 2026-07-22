'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  Sparkles,
  Command,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  Check,
  Keyboard,
  ChevronRight,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { apiFetch, timeAgo } from '@/lib/api-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  image?: string | null
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

const typeColors: Record<string, string> = {
  upload: 'bg-sky-500',
  recommendation: 'bg-fuchsia-500',
  trending: 'bg-amber-500',
  deadline: 'bg-red-500',
  weekly: 'bg-emerald-500',
  monthly: 'bg-violet-500',
  system: 'bg-slate-500',
}

// Map view key to a human title + icon
const VIEW_META: Record<string, { title: string; group: string }> = {
  dashboard: { title: 'Dashboard', group: 'Overview' },
  channels: { title: 'YouTube Channels', group: 'Overview' },
  analytics: { title: 'Analytics', group: 'Overview' },
  analysis: { title: 'AI Analysis', group: 'AI Studio' },
  recommendations: { title: 'Recommendations', group: 'AI Studio' },
  'idea-lab': { title: 'Idea Lab', group: 'AI Studio' },
  script: { title: 'Script Generator', group: 'AI Studio' },
  workflow: { title: 'Workflow', group: 'Workspace' },
  planner: { title: 'Content Planner', group: 'Workspace' },
  notes: { title: 'Notes', group: 'Workspace' },
  files: { title: 'File Manager', group: 'Workspace' },
  notifications: { title: 'Notifications', group: 'System' },
  settings: { title: 'Settings', group: 'System' },
}

export function Topbar({
  user,
  notifTick = 0,
  realtimeConnected = false,
  onUnreadCleared,
}: {
  user: User
  notifTick?: number
  realtimeConnected?: boolean
  onUnreadCleared?: () => void
}) {
  const { navigate, setSearchOpen, view } = useAppStore()
  const viewMeta = VIEW_META[view] || { title: view, group: '' }
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  const fetchNotifs = async () => {
    try {
      const data = await apiFetch<{ notifications: Notification[] }>(
        '/api/notifications'
      )
      setNotifs(data.notifications)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const data = await apiFetch<{ notifications: Notification[] }>(
          '/api/notifications'
        )
        if (active) setNotifs(data.notifications)
      } catch {
        // ignore
      }
    }
    run()
    const t = setInterval(run, 60000)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [])

  // When AppShell tells us a new realtime notification arrived (via notifTick
  // bump), refetch the popover list so the new notification shows up.
  useEffect(() => {
    if (notifTick === 0) return
    void fetchNotifs()
  }, [notifTick])

  async function markAllRead() {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' })
      setNotifs((n) => n.map((x) => ({ ...x, read: true })))
      onUnreadCleared?.()
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to update notifications')
    }
  }

  async function logout() {
    try {
      // Destroys the DB-backed session and clears the session cookie.
      await apiFetch('/api/auth/logout', { method: 'POST' })
      router.refresh()
    } catch {
      toast.error('Logout failed')
    }
  }

  const initials = (user.name || user.email)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="h-16 shrink-0 glass border-b border-border/60 flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-30">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileOpen((o) => !o)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Breadcrumb / page title */}
      <div className="hidden sm:flex items-center gap-2 min-w-0">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground/70 font-medium hidden lg:inline">
          {viewMeta.group}
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/40 hidden lg:inline shrink-0" />
        <span className="text-sm font-semibold truncate">{viewMeta.title}</span>
      </div>

      {/* Search trigger */}
      <button
        onClick={() => setSearchOpen(true)}
        className="ml-auto sm:ml-6 flex items-center gap-2 h-9 px-3 rounded-xl bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-accent/40 transition-all text-sm text-muted-foreground min-w-[160px] sm:min-w-[280px] group"
      >
        <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
        <span className="hidden sm:inline">Search everything…</span>
        <kbd className="ml-auto hidden sm:flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-background">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      <div className="ml-auto sm:ml-0 flex items-center gap-1.5">
        {/* Keyboard shortcuts help */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('tf:open-shortcuts'))
          }}
          className="rounded-xl hidden sm:flex"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-[18px] h-[18px]" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-xl"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="w-[18px] h-[18px]" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl relative">
              <Bell className="w-[18px] h-[18px]" />
              {/* Realtime connection indicator (subtle bottom-right dot) */}
              <span
                className={`absolute bottom-1 left-1 w-2 h-2 rounded-full border border-background transition-colors ${
                  realtimeConnected ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                }`}
                title={
                  realtimeConnected
                    ? 'Realtime connected'
                    : 'Realtime disconnected'
                }
                aria-label={
                  realtimeConnected
                    ? 'Realtime connected'
                    : 'Realtime disconnected'
                }
              />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center pulse-glow">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80 sm:w-96 p-0 glass-strong border-border/60"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Notifications</span>
                {unread > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {unread} new
                  </Badge>
                )}
              </div>
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto scroll-styled">
              {notifs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                notifs.slice(0, 8).map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3 border-b border-border/40 hover:bg-accent/40 transition-colors cursor-pointer ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => navigate('notifications')}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        typeColors[n.type] || 'bg-slate-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => navigate('notifications')}
              className="w-full p-3 text-center text-sm text-primary hover:bg-accent/40 border-t border-border/60 font-medium"
            >
              View all notifications
            </button>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-xl hover:bg-accent/50 transition-colors">
              <Avatar className="w-7 h-7 grad-primary">
                <AvatarFallback className="grad-primary text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                {user.name || user.email}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-strong border-border/60">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span>{user.name || 'User'}</span>
              <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('settings')}>
              <UserIcon className="w-4 h-4 mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('settings')}>
              <SettingsIcon className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileNav onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  )
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const { view, navigate } = useAppStore()
  const items: { key: ReturnType<typeof useAppStore.getState>['view']; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'channels', label: 'Channels' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'analysis', label: 'AI Analysis' },
    { key: 'recommendations', label: 'Recommendations' },
    { key: 'idea-lab', label: 'Idea Lab' },
    { key: 'script', label: 'Script Generator' },
    { key: 'workflow', label: 'Workflow' },
    { key: 'planner', label: 'Content Planner' },
    { key: 'notes', label: 'Notes' },
    { key: 'files', label: 'File Manager' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'settings', label: 'Settings' },
  ]
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 md:hidden"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute left-0 top-0 bottom-0 w-72 glass-strong border-r border-border/60 p-4 overflow-y-auto scroll-styled"
      >
        <div className="flex items-center gap-2 mb-6 mt-2">
          <div className="w-9 h-9 rounded-xl grad-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">TubeFlow AI</span>
        </div>
        <div className="space-y-1">
          {items.map((i) => (
            <button
              key={i.key}
              onClick={() => {
                navigate(i.key)
                onClose()
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                view === i.key
                  ? 'grad-primary text-white'
                  : 'text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
