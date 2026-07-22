'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Eye,
  Video,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Lightbulb,
  Loader2,
  Zap,
  Target,
  Flame,
  Youtube,
  Plug,
  ArrowRight,
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
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { apiFetch, formatNumber, timeAgo } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { OnboardingChecklist, QuickActionsBar } from '@/components/app/quick-actions'
import { TiltCard } from '@/components/app/tilt-card'
import { AnimatedNumber } from '@/components/app/animated-number'
import { ActivityHeatmap } from '@/components/app/activity-heatmap'

interface DashboardData {
  channels: Array<{
    id: string
    title: string
    subscriberCount: number
    videoCount: number
    viewCount: number
    healthScore: number
  }>
  recentVideos: Array<{
    id: string
    title: string
    viewCount: number
    likeCount: number
    isShort: boolean
    publishedAt: string
    channel: { title: string }
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    deadline: string | null
    completed: boolean
    project: { name: string; color: string } | null
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    date: string
    type: string
    status: string
  }>
  pinnedNotes: Array<{
    id: string
    title: string
    content: string
    updatedAt: string
  }>
  unreadNotifications: number
  latestNotifications: Array<{
    id: string
    type: string
    title: string
    message: string
    createdAt: string
  }>
  projects: Array<{ id: string; name: string; color: string; status: string }>
  stats: {
    totalSubscribers: number
    totalViews: number
    totalVideos: number
    totalTasks: number
    completedTasks: number
    totalWatchMinutes?: number
    totalRevenue?: number
    subsGained90d?: number
    views90d?: number
  }
  growthData?: Array<{
    date: string
    subscribers: number
    views: number
    watchMinutes: number
    revenue: number
  }>
  hasAnalyticsData?: boolean
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

const eventColors: Record<string, string> = {
  publish: 'bg-emerald-500',
  record: 'bg-fuchsia-500',
  edit: 'bg-sky-500',
  review: 'bg-amber-500',
  meeting: 'bg-violet-500',
}

export function DashboardView() {
  const { navigate, setViewParams } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<DashboardData>('/api/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))

    // Background sync: if YouTube is connected and the last sync was more
    // than 1 hour ago, fire-and-forget a sync request so the dashboard
    // stays fresh. We check /api/youtube/status first to avoid hitting the
    // sync endpoint when YouTube isn't connected.
    apiFetch<{ connected: boolean; lastSyncedAt: string | null }>('/api/youtube/status')
      .then((status) => {
        if (!status.connected) return
        const stale =
          !status.lastSyncedAt ||
          Date.now() - new Date(status.lastSyncedAt).getTime() > 60 * 60 * 1000
        if (stale) {
          // Fire-and-forget — don't block the UI. The sync runs server-side.
          apiFetch('/api/youtube/sync', { method: 'POST' }).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonHeader />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl glass shimmer" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 rounded-2xl glass shimmer" />
          <div className="h-80 rounded-2xl glass shimmer" />
        </div>
      </div>
    )
  }

  // Empty state: no YouTube channel connected. Guide the user to Settings.
  if (data.channels.length === 0) {
    return <NoChannelConnected onNavigateSettings={() => navigate('settings')} />
  }

  // Real growth data from the YouTube Analytics API (90-day daily series).
  // Falls back to a minimal single-point series if analytics hasn't been synced.
  const growthData = (data.growthData && data.growthData.length > 0)
    ? data.growthData.map((g, i) => ({
        month: new Date(g.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        subscribers: data.growthData!.slice(0, i + 1).reduce((s, x) => s + x.subscribers, 0),
        rawSubs: g.subscribers,
        views: g.views,
        watchMinutes: g.watchMinutes,
        revenue: g.revenue,
      }))
    : [{ month: 'Now', subscribers: data.stats.totalSubscribers, rawSubs: 0, views: 0, watchMinutes: 0, revenue: 0 }]
  const taskCompletion =
    data.stats.totalTasks > 0
      ? Math.round((data.stats.completedTasks / data.stats.totalTasks) * 100)
      : 0

  const mainChannel = data.channels[0]

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
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Studio Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back to your studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening across your channels today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('analytics')} className="rounded-xl">
            <TrendingUp className="w-4 h-4 mr-1" /> View Analytics
          </Button>
          <Button
            onClick={() => navigate('script')}
            className="rounded-xl grad-primary text-white glow-primary"
          >
            <Zap className="w-4 h-4 mr-1" /> Generate Script
          </Button>
        </div>
      </motion.div>

      {/* Onboarding checklist */}
      <OnboardingChecklist />

      {/* Quick actions */}
      <QuickActionsBar />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Users}
          label="Subscribers"
          numericValue={data.stats.totalSubscribers}
          format={(n) => formatNumber(n)}
          change="+4.2%"
          up
          delay={0}
          gradient="grad-primary"
        />
        <StatCard
          icon={Eye}
          label="Total Views"
          numericValue={data.stats.totalViews}
          format={(n) => formatNumber(n)}
          change="+12.8%"
          up
          delay={0.05}
          gradient="grad-cool"
        />
        <StatCard
          icon={Video}
          label="Videos"
          numericValue={data.stats.totalVideos}
          format={(n) => Math.round(n).toString()}
          change="+3 this month"
          up
          delay={0.1}
          gradient="grad-success"
        />
        <StatCard
          icon={Target}
          label="Task Completion"
          numericValue={taskCompletion}
          format={(n) => `${Math.round(n)}%`}
          change={`${data.stats.completedTasks}/${data.stats.totalTasks} done`}
          up={taskCompletion >= 50}
          delay={0.15}
          gradient="grad-warm"
        />
      </div>

      {/* Activity heatmap */}
      <ActivityHeatmap />

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Growth chart */}
        <Card className="lg:col-span-2 glass border-border/60 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Growth Trend</CardTitle>
              <CardDescription className="text-xs">
                Subscriber growth — last 90 days (real data)
              </CardDescription>
            </div>
            {(() => {
              const gained = data.stats.subsGained90d ?? 0
              const positive = gained >= 0
              return (
                <Badge
                  variant="outline"
                  className={positive ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}
                >
                  {positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {positive ? '+' : ''}{gained.toLocaleString()} subs
                </Badge>
              )
            })()}
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.24 350)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="oklch(0.7 0.24 350)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 280 / 0.1)" />
                  <XAxis
                    dataKey="month"
                    stroke="oklch(0.6 0.02 280 / 0.6)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.6 0.02 280 / 0.6)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 12,
                      backdropFilter: 'blur(20px)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="subscribers"
                    stroke="oklch(0.7 0.24 350)"
                    strokeWidth={2.5}
                    fill="url(#colorGrowth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel health */}
        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" /> Channel Health
            </CardTitle>
            <CardDescription className="text-xs">{mainChannel?.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthRing score={mainChannel?.healthScore ?? 0} />
            <div className="space-y-2">
              {[
                { label: 'SEO Quality', value: 82, color: 'bg-emerald-500' },
                { label: 'Engagement', value: 74, color: 'bg-fuchsia-500' },
                { label: 'Consistency', value: 68, color: 'bg-sky-500' },
                { label: 'Retention', value: 79, color: 'bg-amber-500' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-semibold">{m.value}%</span>
                  </div>
                  <Progress value={m.value} className={`h-1.5 [&>div]:${m.color}`} />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={() => navigate('analysis')}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" /> Run AI Analysis
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tasks + events + notifications */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's tasks */}
        <Card className="glass border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Today&apos;s Tasks</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('workflow')}
            >
              View board
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto scroll-styled">
            {data.tasks.slice(0, 6).map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-accent/40 transition-colors cursor-pointer group"
                onClick={() => navigate('workflow')}
              >
                {t.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-tight line-clamp-1 ${
                      t.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 capitalize ${priorityColors[t.priority] || ''}`}
                    >
                      {t.priority}
                    </Badge>
                    {t.project && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: t.project.color }}
                        />
                        {t.project.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {data.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tasks yet. Create one in the workflow board.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card className="glass border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-sky-400" /> Upcoming
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('planner')}
            >
              Calendar
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingEvents.slice(0, 5).map((e) => {
              const d = new Date(e.date)
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/40 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-12 shrink-0">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {d.toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                  </div>
                  <div className={`w-1 h-10 rounded-full ${eventColors[e.type] || 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{e.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {e.type} · {d.toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            {data.upcomingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No upcoming events.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notifications + AI recs */}
        <div className="space-y-4">
          <Card className="glass border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" /> AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 rounded-xl grad-primary text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">
                  Trending Now
                </p>
                <p className="text-sm font-medium leading-tight">
                  &ldquo;AI video editing&rdquo; is trending in your niche — create a video this week for +30% reach.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 h-7 bg-white/20 hover:bg-white/30 text-white"
                  onClick={() => navigate('recommendations')}
                >
                  See recommendations
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-44 overflow-y-auto scroll-styled">
              {data.latestNotifications.slice(0, 4).map((n) => (
                <div key={n.id} className="flex gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <div className="min-w-0">
                    <p className="font-medium line-clamp-1">{n.title}</p>
                    <p className="text-muted-foreground line-clamp-1">{n.message}</p>
                    <p className="text-muted-foreground/60 text-[10px] mt-0.5">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent videos + pinned notes */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 glass border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Videos</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('channels')}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentVideos.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/40 transition-colors group"
              >
                <div className="relative w-20 h-12 rounded-lg grad-primary flex items-center justify-center shrink-0 overflow-hidden">
                  <Video className="w-4 h-4 text-white/80" />
                  {v.isShort && (
                    <Badge className="absolute top-1 right-1 h-3.5 px-1 text-[8px] bg-red-500">
                      SHORT
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {v.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {formatNumber(v.viewCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {formatNumber(v.likeCount)} likes
                    </span>
                    <span className="hidden sm:inline">{timeAgo(v.publishedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Pinned Notes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('notes')}
            >
              All notes
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pinnedNotes.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  setViewParams({ noteId: n.id })
                  navigate('notes')
                }}
                className="p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <p className="text-sm font-semibold line-clamp-1">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {n.content.replace(/[#*`>-]/g, '').trim()}
                </p>
              </div>
            ))}
            {data.pinnedNotes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No pinned notes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active projects */}
      <Card className="glass border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Active Projects</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('workflow')}>
            Manage
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.projects.map((p) => (
              <div
                key={p.id}
                className="relative overflow-hidden p-4 rounded-2xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer lift"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: p.color }}
                />
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: p.color + '20' }}>
                    <Target className="w-5 h-5" style={{ color: p.color }} />
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {p.status}
                  </Badge>
                </div>
                <p className="font-semibold mt-3">{p.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  numericValue,
  format,
  change,
  up,
  delay,
  gradient,
}: {
  icon: typeof Users
  label: string
  numericValue: number
  format: (n: number) => string
  change: string
  up?: boolean
  delay: number
  gradient: string
}) {
  return (
    <TiltCard max={6} className="glass rounded-2xl p-4 h-full">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl"
      >
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${gradient} opacity-20 blur-2xl`} />
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span
          className={`text-xs font-semibold flex items-center gap-0.5 ${
            up ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        </span>
      </div>
      <p className="text-2xl font-bold mt-3 tabular-nums">
        <AnimatedNumber value={numericValue} format={format} duration={1400} delay={delay * 1000} />
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/70 mt-1">{change}</p>
      </motion.div>
    </TiltCard>
  )
}

function HealthRing({ score }: { score: number }) {
  const radius = 52
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? 'oklch(0.72 0.18 160)' : score >= 50 ? 'oklch(0.78 0.18 70)' : 'oklch(0.65 0.25 20)'
  return (
    <div className="relative flex items-center justify-center py-2">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="oklch(0.5 0.02 280 / 0.12)"
          strokeWidth="10"
        />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Health Score
        </span>
      </div>
    </div>
  )
}

function SkeletonHeader() {
  return (
    <div className="h-16 rounded-2xl glass shimmer" />
  )
}

// Empty-state component shown when the user has not yet connected a YouTube
// channel. Provides a clear call-to-action to navigate to Settings → Connect.
function NoChannelConnected({ onNavigateSettings }: { onNavigateSettings: () => void }) {
  const features = [
    { icon: TrendingUp, label: 'Real subscriber & view counts', color: 'text-emerald-400' },
    { icon: Video, label: 'Recent uploads & playlists', color: 'text-fuchsia-400' },
    { icon: Sparkles, label: 'AI analysis of your actual content', color: 'text-amber-400' },
    { icon: Target, label: 'Personalized SEO recommendations', color: 'text-sky-400' },
  ]
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl glass-strong p-8 sm:p-12 text-center"
      >
        {/* Decorative glow */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/30 blur-3xl rounded-full" />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 shadow-xl shadow-red-500/30 mb-6"
        >
          <Youtube className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          No YouTube account connected
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Connect your YouTube channel to view real analytics, import your videos,
          and unlock AI-powered insights tailored to your actual content.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-8">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="glass rounded-2xl p-4 flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-background/40 flex items-center justify-center shrink-0">
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <span className="text-sm font-medium">{f.label}</span>
            </motion.div>
          ))}
        </div>

        <Button
          onClick={onNavigateSettings}
          size="lg"
          className="grad-primary text-white rounded-xl glow-primary font-semibold h-12 px-8 group"
        >
          <Plug className="w-5 h-5 mr-2" />
          Connect YouTube Channel
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          You&apos;ll be redirected to Google to authorize read-only access to your
          channel data.
        </p>
      </motion.div>
    </div>
  )
}
