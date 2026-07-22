'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Upload,
  Sparkles,
  Flame,
  AlarmClock,
  FileBarChart,
  Calendar,
  Info,
  CheckCheck,
  Trash2,
  CheckCircle2,
  Mail,
  BellRing,
  Loader2,
  Settings2,
  Inbox,
  PartyPopper,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { apiFetch, timeAgo } from '@/lib/api-client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

interface UserSettings {
  theme?: string
  language?: string
  aiProvider?: string
  geminiApiKey?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  uploadReminders?: boolean
  weeklyReports?: boolean
  monthlyReports?: boolean
  trendingAlerts?: boolean
}

type TypeFilter =
  | 'all'
  | 'unread'
  | 'upload'
  | 'recommendation'
  | 'trending'
  | 'deadline'
  | 'weekly'
  | 'monthly'
  | 'system'

const TYPE_META: Record<
  string,
  {
    icon: typeof Upload
    color: string
    bg: string
    border: string
    label: string
  }
> = {
  upload: {
    icon: Upload,
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-l-sky-500',
    label: 'Upload',
  },
  recommendation: {
    icon: Sparkles,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/15',
    border: 'border-l-fuchsia-500',
    label: 'Recommendation',
  },
  trending: {
    icon: Flame,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-l-amber-500',
    label: 'Trending',
  },
  deadline: {
    icon: AlarmClock,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-l-red-500',
    label: 'Deadline',
  },
  weekly: {
    icon: FileBarChart,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-l-emerald-500',
    label: 'Weekly Report',
  },
  monthly: {
    icon: Calendar,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-l-violet-500',
    label: 'Monthly Report',
  },
  system: {
    icon: Info,
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-l-slate-500',
    label: 'System',
  },
}

function getMeta(type: string) {
  return (
    TYPE_META[type] ?? {
      icon: Bell,
      color: 'text-slate-400',
      bg: 'bg-slate-500/15',
      border: 'border-l-slate-500',
      label: type.charAt(0).toUpperCase() + type.slice(1),
    }
  )
}

function groupByDate(items: Notification[]) {
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000

  const groups: { title: string; items: Notification[] }[] = [
    { title: 'Today', items: [] },
    { title: 'Earlier this week', items: [] },
    { title: 'Older', items: [] },
  ]

  for (const n of items) {
    const t = new Date(n.createdAt).getTime()
    if (t >= startOfToday) groups[0].items.push(n)
    else if (t >= startOfWeek) groups[1].items.push(n)
    else groups[2].items.push(n)
  }
  return groups.filter((g) => g.items.length > 0)
}

function NotificationCard({
  n,
  onRead,
  onDelete,
  index,
}: {
  n: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  index: number
}) {
  const meta = getMeta(n.type)
  const Icon = meta.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => !n.read && onRead(n.id)}
      className={`group glass rounded-2xl border-l-4 ${meta.border} p-3 sm:p-4 cursor-pointer transition-all hover:shadow-lg ${
        !n.read
          ? 'ring-1 ring-primary/30 bg-primary/5'
          : 'opacity-90 hover:opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{n.title}</p>
                {!n.read && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {n.message}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </span>
                <span className="text-[10px] text-muted-foreground/70">·</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 px-1.5 font-normal ${meta.color} border-current/20`}
                >
                  {meta.label}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!n.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRead(n.id)
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-primary/15 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  title="Mark as read"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(n.id)
                }}
                className="w-7 h-7 rounded-lg hover:bg-red-500/15 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PrefToggle({
  id,
  label,
  description,
  icon: Icon,
  color,
  value,
  onChange,
}: {
  id: string
  label: string
  description: string
  icon: typeof Bell
  color: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const [pending, setPending] = useState(false)
  const handle = async (v: boolean) => {
    setPending(true)
    try {
      await apiFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [id]: v }),
      })
      onChange(v)
      toast.success(`${label} ${v ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error(`Failed to update ${label.toLowerCase()}`)
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <Label className="text-sm font-medium cursor-pointer" htmlFor={id}>
            {label}
          </Label>
          <p className="text-xs text-muted-foreground truncate">
            {description}
          </p>
        </div>
      </div>
      <Switch
        id={id}
        checked={value}
        disabled={pending}
        onCheckedChange={handle}
      />
    </div>
  )
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TypeFilter>('all')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    try {
      const [nRes, sRes] = await Promise.all([
        apiFetch<{ notifications: Notification[] }>('/api/notifications'),
        apiFetch<{ settings: UserSettings }>('/api/settings'),
      ])
      setNotifications(nRes.notifications)
      setSettings(sRes.settings)
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Live-refresh when a new realtime notification arrives.
  useEffect(() => {
    function onNewRealtime() {
      void load()
    }
    window.addEventListener(
      'tf:notification:new',
      onNewRealtime as EventListener
    )
    return () =>
      window.removeEventListener(
        'tf:notification:new',
        onNewRealtime as EventListener
      )
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    if (filter === 'unread') return notifications.filter((n) => !n.read)
    return notifications.filter((n) => n.type === filter)
  }, [notifications, filter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    try {
      await apiFetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      })
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      )
      toast.error('Failed to mark as read')
    }
  }, [])

  const deleteOne = useCallback(async (id: string) => {
    const prev = notifications
    setNotifications((cur) => cur.filter((n) => n.id !== id))
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' })
      toast.success('Notification deleted')
    } catch {
      setNotifications(prev)
      toast.error('Failed to delete')
    }
  }, [notifications])

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return
    setMarkingAll(true)
    const prev = notifications
    setNotifications((cur) => cur.map((n) => ({ ...n, read: true })))
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' })
      toast.success(
        `Marked ${unreadCount} notification${unreadCount === 1 ? '' : 's'} as read`
      )
    } catch {
      setNotifications(prev)
      toast.error('Failed to mark all read')
    } finally {
      setMarkingAll(false)
    }
  }, [notifications, unreadCount])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-10 w-48 rounded-xl glass shimmer" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl glass shimmer" />
            ))}
          </div>
          <div className="h-72 rounded-2xl glass shimmer" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BellRing className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Inbox
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-gradient">Notifications</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay on top of uploads, trends, deadlines, and reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as TypeFilter)}
          >
            <SelectTrigger className="w-[170px] rounded-xl bg-background/40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="upload">Uploads</SelectItem>
              <SelectItem value="recommendation">Recommendations</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="deadline">Deadlines</SelectItem>
              <SelectItem value="weekly">Weekly reports</SelectItem>
              <SelectItem value="monthly">Monthly reports</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
            variant="outline"
            className="rounded-xl"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-2" />
            )}
            Mark all read
          </Button>
        </div>
      </motion.div>

      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
      >
        <div className="glass rounded-2xl p-4 lift">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Bell className="w-3.5 h-3.5" /> Unread
          </div>
          <div className="text-2xl font-bold mt-1 text-gradient">
            {unreadCount}
          </div>
        </div>
        <div className="glass rounded-2xl p-4 lift">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Inbox className="w-3.5 h-3.5" /> Total
          </div>
          <div className="text-2xl font-bold mt-1">{notifications.length}</div>
        </div>
        <div className="glass rounded-2xl p-4 lift col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <CheckCheck className="w-3.5 h-3.5" /> Read
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-400">
            {notifications.length - unreadCount}
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-5">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-12 text-center"
            >
              <div className="relative mx-auto w-24 h-24 mb-4">
                <div className="absolute inset-0 grad-success rounded-full opacity-20 blur-2xl" />
                <div className="relative w-24 h-24 rounded-2xl glass-strong flex items-center justify-center float-slow">
                  {unreadCount === 0 && filter === 'all' ? (
                    <PartyPopper className="w-10 h-10 text-emerald-400" />
                  ) : (
                    <CheckCheck className="w-10 h-10 text-emerald-400" />
                  )}
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {unreadCount === 0 && filter === 'all'
                  ? "You're all caught up!"
                  : 'No notifications here'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {unreadCount === 0 && filter === 'all'
                  ? 'No unread notifications. We will let you know when something new comes in.'
                  : 'Try changing your filter to see other notification types.'}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {grouped.map((group) => (
                <motion.div key={group.title} layout className="space-y-2.5">
                  <div className="flex items-center gap-2 pt-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </h3>
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-[10px] text-muted-foreground">
                      {group.items.length}
                    </span>
                  </div>
                  {group.items.map((n, idx) => (
                    <NotificationCard
                      key={n.id}
                      n={n}
                      onRead={markRead}
                      onDelete={deleteOne}
                      index={idx}
                    />
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Right column: preferences */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Preferences
                </CardTitle>
                <CardDescription className="text-xs">
                  Quick toggles — changes save instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/50 pt-0">
                <PrefToggle
                  id="uploadReminders"
                  label="Upload reminders"
                  description="Remind me to keep a schedule"
                  icon={Upload}
                  color="grad-cool"
                  value={!!settings?.uploadReminders}
                  onChange={(v) =>
                    setSettings((s) => (s ? { ...s, uploadReminders: v } : s))
                  }
                />
                <PrefToggle
                  id="weeklyReports"
                  label="Weekly reports"
                  description="Summary every Monday"
                  icon={FileBarChart}
                  color="grad-success"
                  value={!!settings?.weeklyReports}
                  onChange={(v) =>
                    setSettings((s) => (s ? { ...s, weeklyReports: v } : s))
                  }
                />
                <PrefToggle
                  id="trendingAlerts"
                  label="Trending alerts"
                  description="Notify on trending topics"
                  icon={Flame}
                  color="grad-warm"
                  value={!!settings?.trendingAlerts}
                  onChange={(v) =>
                    setSettings((s) => (s ? { ...s, trendingAlerts: v } : s))
                  }
                />
                <PrefToggle
                  id="emailNotifications"
                  label="Email notifications"
                  description="Send to my inbox"
                  icon={Mail}
                  color="grad-primary"
                  value={!!settings?.emailNotifications}
                  onChange={(v) =>
                    setSettings((s) =>
                      s ? { ...s, emailNotifications: v } : s
                    )
                  }
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="glass border-border/60 overflow-hidden">
              <div className="grad-primary p-4 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-dots opacity-20" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                      Pro Tip
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    Enable trending alerts to catch viral topics before your
                    competitors do.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
