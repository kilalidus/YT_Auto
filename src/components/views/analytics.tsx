'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  DollarSign,
  TrendingUp,
  Sparkles,
  Video as VideoIcon,
  ThumbsUp,
  MessageCircle,
  Share2,
  Youtube,
  MousePointerClick,
  Megaphone,
  AlertCircle,
  Settings,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { apiFetch, formatNumber } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'

interface AnalyticsChannel {
  id: string
  title: string
  thumbnail: string | null
  subscriberCount: number
  viewCount: number
  videoCount: number
}

interface TopVideo {
  id: string
  title: string
  thumbnail: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
  isShort: boolean
  publishedAt: string
}

interface AnalyticsTotals {
  views: number
  watchMinutes: number
  subscribersGained: number
  likes: number
  comments: number
  shares: number
  revenue: number
  impressions: number
  clicks: number
}

interface DailyEntry {
  date: string
  views: number
  watchMinutes: number
  subsGained: number
  likes: number
  comments: number
  shares: number
  revenue: number
  impressions: number
  clicks: number
  avgViewDuration: number
}

interface AnalyticsResponse {
  range: string
  totals: AnalyticsTotals
  daily: DailyEntry[]
  topVideos: TopVideo[]
  channels: AnalyticsChannel[]
  hasAnalyticsData?: boolean
  connected?: boolean
}

type TimeRange = '7d' | '30d' | '90d'

const COLORS = {
  primary: 'oklch(0.7 0.24 350)',
  green: 'oklch(0.72 0.18 160)',
  amber: 'oklch(0.78 0.18 70)',
  sky: 'oklch(0.68 0.22 200)',
  red: 'oklch(0.7 0.25 20)',
  violet: 'oklch(0.65 0.2 290)',
}

const tooltipStyle = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  backdropFilter: 'blur(20px)',
  fontSize: 12,
}

const EMPTY_TOTALS: AnalyticsTotals = {
  views: 0,
  watchMinutes: 0,
  subscribersGained: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  revenue: 0,
  impressions: 0,
  clicks: 0,
}

function shortDate(iso: string): string {
  // iso is 'YYYY-MM-DD' — parse in local time to avoid off-by-one drift.
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AnalyticsView() {
  const { viewParams, navigate } = useAppStore()
  const presetChannelId = (viewParams.channelId as string) || ''

  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TimeRange>('30d')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ range })
    if (presetChannelId) params.set('channelId', presetChannelId)
    apiFetch<AnalyticsResponse>(`/api/analytics?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [presetChannelId, range])

  const channels = data?.channels ?? []
  const totals = data?.totals ?? EMPTY_TOTALS
  const daily = data?.daily ?? []
  const topVideos = data?.topVideos ?? []
  const hasAnalyticsData = data?.hasAnalyticsData === true

  // Sparkline data for stat cards (raw daily values).
  const viewsSpark = useMemo(
    () => daily.map((d) => ({ day: d.date, value: d.views })),
    [daily]
  )
  const watchSpark = useMemo(
    () =>
      daily.map((d) => ({
        day: d.date,
        value: +(d.watchMinutes / 60).toFixed(2),
      })),
    [daily]
  )
  const subsSpark = useMemo(
    () => daily.map((d) => ({ day: d.date, value: d.subsGained })),
    [daily]
  )
  const revenueSpark = useMemo(
    () => daily.map((d) => ({ day: d.date, value: d.revenue })),
    [daily]
  )

  // Chart series with human-readable date labels.
  const viewsSeries = useMemo(
    () => daily.map((d) => ({ date: shortDate(d.date), views: d.views })),
    [daily]
  )
  const watchSeries = useMemo(
    () =>
      daily.map((d) => ({
        date: shortDate(d.date),
        hours: +(d.watchMinutes / 60).toFixed(2),
      })),
    [daily]
  )
  const subsSeries = useMemo(
    () => daily.map((d) => ({ date: shortDate(d.date), subs: d.subsGained })),
    [daily]
  )
  const revenueSeries = useMemo(
    () => daily.map((d) => ({ date: shortDate(d.date), revenue: d.revenue })),
    [daily]
  )

  // Last 14 days for the daily-views bar chart.
  const dailyBars = useMemo(() => {
    const slice = daily.slice(-14)
    return slice.map((d, i) => ({
      day: i === slice.length - 1 ? 'Today' : shortDate(d.date),
      views: d.views,
    }))
  }, [daily])

  // Engagement series from totals (likes / comments / shares).
  const engagementBars = useMemo(
    () => [
      { name: 'Likes', value: totals.likes, color: COLORS.primary },
      { name: 'Comments', value: totals.comments, color: COLORS.amber },
      { name: 'Shares', value: totals.shares, color: COLORS.green },
    ],
    [totals]
  )

  // Top videos with computed engagement rate.
  const topVideosWithEr = useMemo(
    () =>
      topVideos.map((v) => {
        const er =
          v.viewCount > 0
            ? ((v.likeCount + v.commentCount) / v.viewCount) * 100
            : 0
        return { ...v, engagementRate: +er.toFixed(2) }
      }),
    [topVideos]
  )

  // CTR computed from totals (0% when no impressions).
  const ctr =
    totals.impressions > 0
      ? (totals.clicks / totals.impressions) * 100
      : 0

  const watchHours = +(totals.watchMinutes / 60).toFixed(1)
  const rangeLabel =
    range === '7d' ? 'Last 7 days' : range === '90d' ? 'Last 90 days' : 'Last 30 days'

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-16 rounded-2xl glass shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl glass shimmer" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-80 rounded-2xl glass shimmer" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl glass shimmer" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state #1: no channels connected at all.
  if (channels.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center py-16 px-4"
        >
          <div className="w-20 h-20 rounded-3xl grad-primary flex items-center justify-center shadow-xl mb-5">
            <Youtube className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            No YouTube channel connected
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Connect your YouTube account in Settings to sync your real
            watch-time, audience, and revenue data from the YouTube Analytics
            API.
          </p>
          <Button
            onClick={() => navigate('settings')}
            className="rounded-xl grad-primary text-white shadow-lg"
          >
            <Settings className="w-4 h-4 mr-2" /> Go to Settings
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Performance Insights
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {`Aggregated performance across ${channels.length} channel${channels.length > 1 ? 's' : ''}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
            <SelectTrigger className="w-44 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Empty state #2: channels exist but no analytics data synced yet. */}
      {!hasAnalyticsData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl grad-warm flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Analytics data not synced yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click <span className="font-medium">Sync Now</span> in
                    Settings to fetch your real watch-time and audience data
                    from YouTube.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('settings')}
                variant="outline"
                className="rounded-xl shrink-0"
              >
                <Settings className="w-4 h-4 mr-2" /> Open Settings
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stat cards with sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Eye}
          label="Views"
          value={formatNumber(totals.views)}
          delay={0}
          gradient="grad-cool"
          data={viewsSpark}
          color={COLORS.sky}
        />
        <StatCard
          icon={Clock}
          label="Watch Time (hrs)"
          value={formatNumber(watchHours)}
          delay={0.05}
          gradient="grad-success"
          data={watchSpark}
          color={COLORS.green}
        />
        <StatCard
          icon={Users}
          label="Subscribers"
          value={formatNumber(totals.subscribersGained)}
          delay={0.1}
          gradient="grad-primary"
          data={subsSpark}
          color={COLORS.primary}
        />
        <StatCard
          icon={DollarSign}
          label="Est. Revenue"
          value={`$${formatNumber(totals.revenue)}`}
          delay={0.15}
          gradient="grad-warm"
          data={revenueSpark}
          color={COLORS.amber}
        />
      </div>

      {/* Views + Subscribers over time */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Views Over Time</CardTitle>
                <CardDescription className="text-xs">{rangeLabel}</CardDescription>
              </div>
              <Badge variant="outline" className="text-sky-400 border-sky-500/30">
                <Eye className="w-3 h-3 mr-1" /> {formatNumber(totals.views)}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {viewsSeries.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={viewsSeries}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.sky} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={COLORS.sky} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 280 / 0.1)" />
                      <XAxis
                        dataKey="date"
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={20}
                      />
                      <YAxis
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke={COLORS.sky}
                        strokeWidth={2.5}
                        fill="url(#colorViews2)"
                        name="Views"
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="glass border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Subscribers Gained</CardTitle>
                <CardDescription className="text-xs">
                  {rangeLabel} · net
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">
                <Users className="w-3 h-3 mr-1" />{' '}
                {formatNumber(totals.subscribersGained)}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {subsSeries.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={subsSeries}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSubs2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 280 / 0.1)" />
                      <XAxis
                        dataKey="date"
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={20}
                      />
                      <YAxis
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="subs"
                        stroke={COLORS.primary}
                        strokeWidth={2.5}
                        fill="url(#colorSubs2)"
                        name="Net Subs"
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Watch time + Revenue */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Watch Time</CardTitle>
                <CardDescription className="text-xs">
                  {rangeLabel} · hours
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                <Clock className="w-3 h-3 mr-1" /> {formatNumber(watchHours)}h
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {watchSeries.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={watchSeries}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorWatch2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 280 / 0.1)" />
                      <XAxis
                        dataKey="date"
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={20}
                      />
                      <YAxis
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${formatNumber(v)}h`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${formatNumber(value)} h`, 'Watch Hours']}
                      />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke={COLORS.green}
                        strokeWidth={2.5}
                        fill="url(#colorWatch2)"
                        name="Watch Hours"
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="glass border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Revenue</CardTitle>
                <CardDescription className="text-xs">
                  {rangeLabel} · USD
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                <DollarSign className="w-3 h-3 mr-1" /> ${formatNumber(totals.revenue)}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {revenueSeries.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={revenueSeries}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRev2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.amber} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 280 / 0.1)" />
                      <XAxis
                        dataKey="date"
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={20}
                      />
                      <YAxis
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${formatNumber(v)}`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={COLORS.amber}
                        strokeWidth={2.5}
                        fill="url(#colorRev2)"
                        name="Revenue"
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Daily views bar (last 14) + Engagement */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Daily Views</CardTitle>
                <CardDescription className="text-xs">Last 14 days</CardDescription>
              </div>
              <Badge variant="outline" className="text-sky-400 border-sky-500/30">
                <TrendingUp className="w-3 h-3 mr-1" /> {dailyBars.length} days
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {dailyBars.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyBars}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="barViews2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.primary} stopOpacity={1} />
                          <stop offset="100%" stopColor={COLORS.violet} stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.5 0.02 280 / 0.1)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={1}
                      />
                      <YAxis
                        stroke="oklch(0.6 0.02 280 / 0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: 'oklch(0.5 0.02 280 / 0.06)' }}
                      />
                      <Bar
                        dataKey="views"
                        fill="url(#barViews2)"
                        radius={[6, 6, 0, 0]}
                        animationDuration={900}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="glass border-border/60 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Engagement</CardTitle>
                <CardDescription className="text-xs">
                  {rangeLabel} · totals
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">
                <Sparkles className="w-3 h-3 mr-1" />{' '}
                {formatNumber(totals.likes + totals.comments + totals.shares)}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <EngagementTile
                  icon={ThumbsUp}
                  label="Likes"
                  value={totals.likes}
                  color={COLORS.primary}
                />
                <EngagementTile
                  icon={MessageCircle}
                  label="Comments"
                  value={totals.comments}
                  color={COLORS.amber}
                />
                <EngagementTile
                  icon={Share2}
                  label="Shares"
                  value={totals.shares}
                  color={COLORS.green}
                />
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={engagementBars}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.5 0.02 280 / 0.1)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
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
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'oklch(0.5 0.02 280 / 0.06)' }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      animationDuration={900}
                    >
                      {engagementBars.map((b, i) => (
                        <Cell key={i} fill={b.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* CTR + Top videos */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass border-border/60 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-primary" />{' '}
                Impressions &amp; CTR
              </CardTitle>
              <CardDescription className="text-xs">{rangeLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Click-through rate
                </p>
                <p className="text-4xl font-bold mt-1 text-primary">{ctr.toFixed(2)}%</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatNumber(totals.clicks)} clicks /{' '}
                  {formatNumber(totals.impressions)} impressions
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl glass p-3 text-center">
                  <Megaphone className="w-4 h-4 mx-auto text-sky-400 mb-1" />
                  <p className="text-lg font-bold">
                    {formatNumber(totals.impressions)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Impressions</p>
                </div>
                <div className="rounded-xl glass p-3 text-center">
                  <MousePointerClick className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{formatNumber(totals.clicks)}</p>
                  <p className="text-[11px] text-muted-foreground">Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="lg:col-span-2"
        >
          <Card className="glass border-border/60 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Top Performing
                  Videos
                </CardTitle>
                <CardDescription className="text-xs">
                  Sorted by all-time views
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {topVideosWithEr.length} videos
              </Badge>
            </CardHeader>
            <CardContent>
              {topVideosWithEr.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No videos available. Sync your channel to populate the video
                  list.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto pr-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">
                          Likes
                        </TableHead>
                        <TableHead className="text-right hidden md:table-cell">
                          Comments
                        </TableHead>
                        <TableHead className="text-right">Engagement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topVideosWithEr.map((v, i) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-bold text-primary">
                            {i + 1}
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                                {v.thumbnail ? (
                                  <img
                                    src={v.thumbnail}
                                    alt={v.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full grad-primary flex items-center justify-center">
                                    <VideoIcon className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium line-clamp-1">
                                  {v.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                  {v.isShort ? 'Short' : 'Video'}
                                  {v.duration ? ` · ${v.duration}` : ''}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(v.viewCount)}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {formatNumber(v.likeCount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {formatNumber(v.commentCount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                v.engagementRate >= 5
                                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                  : v.engagementRate >= 2
                                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                    : 'text-muted-foreground'
                              }
                            >
                              {v.engagementRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <BarChart3 className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">No data for this range</p>
      <p className="text-xs text-muted-foreground/70">
        Try a wider range or sync your channel.
      </p>
    </div>
  )
}

function EngagementTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-xl glass p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-lg font-bold">{formatNumber(value)}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
  gradient,
  data,
  color,
}: {
  icon: typeof Users
  label: string
  value: string
  delay: number
  gradient: string
  data: { day: string; value: number }[]
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden glass rounded-2xl p-4 card-3d"
    >
      <div
        className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${gradient} opacity-20 blur-2xl`}
      />
      <div className="flex items-start justify-between">
        <div
          className={`w-9 h-9 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="h-10 mt-2 -mx-1">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/60">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.8}
                fill={`url(#spark-${label})`}
                animationDuration={700}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}
