'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  RefreshCw,
  CheckCheck,
  Search,
  ThumbsUp,
  MessageCircle,
  Trash2,
  ShieldCheck,
  PauseCircle,
  Ban,
  EyeOff,
  CheckCircle2,
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  Tv,
  Youtube,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { toast } from 'sonner'
import { apiFetch, timeAgo } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { AnimatedNumber } from '@/components/app/animated-number'

type Sentiment = 'positive' | 'neutral' | 'negative'
type Status = 'new' | 'approved' | 'held' | 'spam' | 'hidden'
type StatusFilter = 'all' | Status
type SentimentFilter = 'all' | Sentiment
type BulkAction = 'approve' | 'hold' | 'spam' | 'hide' | 'delete'

interface Comment {
  id: string
  author: string
  authorAvatar: string | null
  text: string
  likeCount: number
  replyCount: number
  sentiment: Sentiment
  status: Status
  publishedAt: string
  createdAt: string
  video: { id: string; title: string }
}

interface VideoOption {
  id: string
  title: string
}

interface CommentsResponse {
  comments: Comment[]
  videos: VideoOption[]
}

const SENTIMENT_META: Record<
  Sentiment,
  {
    label: string
    text: string
    bg: string
    border: string
    dot: string
    icon: typeof Smile
    color: string
  }
> = {
  positive: {
    label: 'Positive',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: Smile,
    color: 'oklch(0.72 0.18 160)',
  },
  neutral: {
    label: 'Neutral',
    text: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    dot: 'bg-slate-500',
    icon: Meh,
    color: 'oklch(0.7 0.02 280)',
  },
  negative: {
    label: 'Negative',
    text: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    icon: Frown,
    color: 'oklch(0.7 0.25 20)',
  },
}

const STATUS_META: Record<
  Status,
  { label: string; text: string; bg: string; border: string }
> = {
  new: {
    label: 'New',
    text: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
  },
  approved: {
    label: 'Approved',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
  },
  held: {
    label: 'Held',
    text: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
  },
  spam: {
    label: 'Spam',
    text: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
  },
  hidden: {
    label: 'Hidden',
    text: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
  },
}

const tooltipStyle = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 12,
  backdropFilter: 'blur(20px)',
  fontSize: 12,
}

// Stable color palette for avatars — derived from name hash
const AVATAR_GRADIENTS = [
  'from-fuchsia-500 to-pink-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-purple-500',
  'from-rose-500 to-red-500',
  'from-indigo-500 to-blue-500',
  'from-lime-500 to-green-500',
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function getInitials(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarGradient(name: string): string {
  return AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
}

interface StatCardProps {
  icon: typeof MessageSquare
  label: string
  value: number
  gradient: string
  delay: number
}

function StatCard({ icon: Icon, label, value, gradient, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden glass rounded-2xl p-4 sm:p-5 card-3d"
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
      <p className="text-2xl sm:text-3xl font-bold mt-3 text-gradient">
        <AnimatedNumber value={value} delay={delay * 1000} />
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  )
}

interface CommentCardProps {
  comment: Comment
  index: number
  selected: boolean
  onToggleSelect: (id: string) => void
  onAction: (id: string, action: BulkAction) => void
  onNavigateToVideo: (videoId: string) => void
}

function CommentCard({
  comment,
  index,
  selected,
  onToggleSelect,
  onAction,
  onNavigateToVideo,
}: CommentCardProps) {
  const sent = SENTIMENT_META[comment.sentiment]
  const stat = STATUS_META[comment.status]
  const SentIcon = sent.icon
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null)

  const handleAction = (action: BulkAction) => {
    setPendingAction(action)
    onAction(comment.id, action)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className={`group glass rounded-2xl p-3 sm:p-4 transition-all hover:shadow-lg ${
        selected ? 'ring-2 ring-primary' : 'ring-1 ring-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <div className="pt-1 shrink-0">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(comment.id)}
            aria-label={`Select comment from ${comment.author}`}
          />
        </div>

        {/* Avatar */}
        <div className="shrink-0">
          {comment.authorAvatar ? (
            <img
              src={comment.authorAvatar}
              alt={comment.author}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                comment.author
              )} flex items-center justify-center text-white text-xs font-bold shadow-md`}
            >
              {getInitials(comment.author)}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{comment.author}</p>
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(comment.publishedAt)}
                </span>
              </div>
              {/* Video title (clickable) */}
              <button
                onClick={() => onNavigateToVideo(comment.video.id)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors max-w-full group/v"
                title={`Open ${comment.video.title}`}
              >
                <span className="truncate">{comment.video.title}</span>
                <ArrowRight className="w-3 h-3 shrink-0 opacity-0 -translate-x-1 group-hover/v:opacity-100 group-hover/v:translate-x-0 transition-all" />
              </button>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${sent.bg} ${sent.text} border ${sent.border}`}
              >
                <SentIcon className="w-3 h-3" />
                {sent.label}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${stat.bg} ${stat.text} border ${stat.border}`}
              >
                {stat.label}
              </span>
            </div>
          </div>

          {/* Comment text */}
          <p className="text-sm text-foreground/90 mt-2 leading-relaxed line-clamp-3">
            {comment.text}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {comment.likeCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {comment.replyCount.toLocaleString()}
              </span>
            </div>

            {/* Action buttons — revealed on hover (always visible on touch) */}
            <div className="flex items-center gap-0.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <ActionButton
                icon={CheckCircle2}
                label="Approve"
                color="text-emerald-400 hover:bg-emerald-500/15"
                pending={pendingAction === 'approve'}
                disabled={pendingAction !== null}
                onClick={() => handleAction('approve')}
              />
              <ActionButton
                icon={PauseCircle}
                label="Hold"
                color="text-amber-400 hover:bg-amber-500/15"
                pending={pendingAction === 'hold'}
                disabled={pendingAction !== null}
                onClick={() => handleAction('hold')}
              />
              <ActionButton
                icon={Ban}
                label="Mark spam"
                color="text-red-400 hover:bg-red-500/15"
                pending={pendingAction === 'spam'}
                disabled={pendingAction !== null}
                onClick={() => handleAction('spam')}
              />
              <ActionButton
                icon={EyeOff}
                label="Hide"
                color="text-slate-400 hover:bg-slate-500/15"
                pending={pendingAction === 'hide'}
                disabled={pendingAction !== null}
                onClick={() => handleAction('hide')}
              />
              <ActionButton
                icon={Trash2}
                label="Delete"
                color="text-red-400 hover:bg-red-500/15"
                pending={pendingAction === 'delete'}
                disabled={pendingAction !== null}
                onClick={() => handleAction('delete')}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  color,
  pending,
  disabled,
  onClick,
}: {
  icon: typeof CheckCircle2
  label: string
  color: string
  pending: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`relative w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${color}`}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
    </button>
  )
}

interface SentimentDonutProps {
  positive: number
  neutral: number
  negative: number
}

function SentimentDonut({ positive, neutral, negative }: SentimentDonutProps) {
  const total = positive + neutral + negative
  const data = useMemo(
    () => [
      { name: 'Positive', value: positive, color: SENTIMENT_META.positive.color },
      { name: 'Neutral', value: neutral, color: SENTIMENT_META.neutral.color },
      { name: 'Negative', value: negative, color: SENTIMENT_META.negative.color },
    ],
    [positive, neutral, negative]
  )

  const posPct = total > 0 ? Math.round((positive / total) * 100) : 0
  const neuPct = total > 0 ? Math.round((neutral / total) * 100) : 0
  const negPct = total > 0 ? Math.round((negative / total) * 100) : 0

  return (
    <div className="grid sm:grid-cols-2 gap-4 items-center">
      <div className="relative h-52 mx-auto w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total > 0 ? data : [{ name: 'None', value: 1, color: 'oklch(0.5 0.02 280 / 0.2)' }]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={84}
              paddingAngle={total > 0 ? 3 : 0}
              animationDuration={900}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {(total > 0 ? data : [{ color: 'oklch(0.5 0.02 280 / 0.2)' }]).map(
                (entry, i) => (
                  <Cell key={i} fill={entry.color} />
                )
              )}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) =>
                total > 0 ? [`${value} (${Math.round((value / total) * 100)}%)`, name] : [`${name}`, '']
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gradient">
            <AnimatedNumber value={total} />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total
          </span>
        </div>
      </div>
      <div className="space-y-2.5">
        <SentimentRow
          icon={Smile}
          label="Positive"
          count={positive}
          pct={posPct}
          color="oklch(0.72 0.18 160)"
        />
        <SentimentRow
          icon={Meh}
          label="Neutral"
          count={neutral}
          pct={neuPct}
          color="oklch(0.7 0.02 280)"
        />
        <SentimentRow
          icon={Frown}
          label="Negative"
          count={negative}
          pct={negPct}
          color="oklch(0.7 0.25 20)"
        />
      </div>
    </div>
  )
}

function SentimentRow({
  icon: Icon,
  label,
  count,
  pct,
  color,
}: {
  icon: typeof Smile
  label: string
  count: number
  pct: number
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in oklch, ${color} 18%, transparent)` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {count} · {pct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-border/60 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
      </div>
    </div>
  )
}

export function CommunityView() {
  const navigate = useAppStore((s) => s.navigate)

  const [comments, setComments] = useState<Comment[]>([])
  const [videos, setVideos] = useState<VideoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all')
  const [videoFilter, setVideoFilter] = useState<string>('all')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPending, setBulkPending] = useState<BulkAction | null>(null)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sentimentFilter !== 'all') params.set('sentiment', sentimentFilter)
      if (videoFilter !== 'all') params.set('videoId', videoFilter)
      if (search.trim()) params.set('search', search.trim())
      const qs = params.toString()
      const res = await apiFetch<CommentsResponse>(
        `/api/comments${qs ? `?${qs}` : ''}`
      )
      setComments(res.comments)
      setVideos(res.videos)
    } catch {
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, sentimentFilter, videoFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  // Stats — derived from currently loaded comments (which respect filters).
  // For the top stats strip we always want a global view, so we fetch all
  // when filters are active. To keep things simple and snappy, we compute
  // from a side-state that tracks full counts by re-fetching unfiltered.
  const [allComments, setAllComments] = useState<Comment[]>([])

  useEffect(() => {
    // Always fetch an unfiltered copy for the stats strip + donut.
    apiFetch<CommentsResponse>('/api/comments')
      .then((res) => setAllComments(res.comments))
      .catch(() => {})
  }, [loading])

  const stats = useMemo(() => {
    const total = allComments.length
    const newCount = allComments.filter((c) => c.status === 'new').length
    const heldCount = allComments.filter((c) => c.status === 'held').length
    const spamCount = allComments.filter((c) => c.status === 'spam').length
    const positive = allComments.filter((c) => c.sentiment === 'positive').length
    const neutral = allComments.filter((c) => c.sentiment === 'neutral').length
    const negative = allComments.filter((c) => c.sentiment === 'negative').length
    return { total, newCount, heldCount, spamCount, positive, neutral, negative }
  }, [allComments])

  // Filtered list (server-filtered, but we also guard client-side for search debounce)
  const filtered = useMemo(() => comments, [comments])

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      if (filtered.length > 0 && filtered.every((c) => prev.has(c.id))) {
        // deselect all visible
        const next = new Set(prev)
        for (const c of filtered) next.delete(c.id)
        return next
      }
      // select all visible
      const next = new Set(prev)
      for (const c of filtered) next.add(c.id)
      return next
    })
  }, [filtered])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    // also refresh the unfiltered stats copy
    try {
      const res = await apiFetch<CommentsResponse>('/api/comments')
      setAllComments(res.comments)
    } catch {
      /* ignore */
    }
    toast.success('Comments refreshed')
  }, [load])

  const applyAction = useCallback(
    async (id: string, action: BulkAction) => {
      const prev = comments
      if (action === 'delete') {
        setComments((cur) => cur.filter((c) => c.id !== id))
      } else {
        const statusMap: Record<string, Status> = {
          approve: 'approved',
          hold: 'held',
          spam: 'spam',
          hide: 'hidden',
        }
        const newStatus = statusMap[action]
        setComments((cur) =>
          cur.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        )
      }
      setSelectedIds((cur) => {
        const next = new Set(cur)
        next.delete(id)
        return next
      })
      try {
        if (action === 'delete') {
          await apiFetch(`/api/comments/${id}`, { method: 'DELETE' })
          toast.success('Comment deleted')
        } else {
          const statusMap: Record<string, Status> = {
            approve: 'approved',
            hold: 'held',
            spam: 'spam',
            hide: 'hidden',
          }
          await apiFetch(`/api/comments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: statusMap[action] }),
          })
          toast.success(`Marked as ${action}`)
        }
        // Refresh the stats copy so counts stay accurate
        const res = await apiFetch<CommentsResponse>('/api/comments')
        setAllComments(res.comments)
      } catch {
        setComments(prev)
        toast.error('Action failed — reverted')
      }
    },
    [comments]
  )

  const applyBulk = useCallback(
    async (action: BulkAction) => {
      const ids = Array.from(selectedIds)
      if (ids.length === 0) return
      setBulkPending(action)
      const prev = comments
      const prevSelected = new Set(selectedIds)

      // Optimistic update
      if (action === 'delete') {
        setComments((cur) => cur.filter((c) => !selectedIds.has(c.id)))
      } else {
        const statusMap: Record<string, Status> = {
          approve: 'approved',
          hold: 'held',
          spam: 'spam',
          hide: 'hidden',
        }
        const newStatus = statusMap[action]
        setComments((cur) =>
          cur.map((c) =>
            selectedIds.has(c.id) ? { ...c, status: newStatus } : c
          )
        )
      }
      clearSelection()
      try {
        const res = await apiFetch<{ updated: number; action: string }>(
          '/api/comments/bulk',
          {
            method: 'POST',
            body: JSON.stringify({ ids, action }),
          }
        )
        toast.success(
          `${res.updated} comment${res.updated === 1 ? '' : 's'} ${
            action === 'delete'
              ? 'deleted'
              : `marked as ${action}`
          }`
        )
        // Refresh stats copy
        const fresh = await apiFetch<CommentsResponse>('/api/comments')
        setAllComments(fresh.comments)
      } catch {
        setComments(prev)
        setSelectedIds(prevSelected)
        toast.error('Bulk action failed — reverted')
      } finally {
        setBulkPending(null)
      }
    },
    [comments, selectedIds, clearSelection]
  )

  const approveAllNew = useCallback(async () => {
    const newOnes = allComments.filter((c) => c.status === 'new')
    if (newOnes.length === 0) {
      toast.info('No new comments to approve')
      return
    }
    setApprovingAll(true)
    try {
      const res = await apiFetch<{ updated: number; action: string }>(
        '/api/comments/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            ids: newOnes.map((c) => c.id),
            action: 'approve',
          }),
        }
      )
      toast.success(
        `${res.updated} new comment${res.updated === 1 ? '' : 's'} approved`
      )
      await load()
      const fresh = await apiFetch<CommentsResponse>('/api/comments')
      setAllComments(fresh.comments)
    } catch {
      toast.error('Failed to approve all new comments')
    } finally {
      setApprovingAll(false)
    }
  }, [allComments, load])

  const navigateToVideo = useCallback(
    (videoId: string) => {
      navigate('channels', { videoId })
    },
    [navigate]
  )

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('all')
    setSentimentFilter('all')
    setVideoFilter('all')
  }, [])

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    sentimentFilter !== 'all' ||
    videoFilter !== 'all'

  // ---------- Render states ----------

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-10 w-56 rounded-xl glass shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl glass shimmer" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-72 rounded-2xl glass shimmer" />
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl glass shimmer" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Empty state: no channel connected (no videos & no comments synced).
  if (videos.length === 0 && comments.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl glass-strong p-8 sm:p-12 text-center"
        >
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
            No community data yet
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Connect your YouTube channel to sync and manage comments across all
            your videos — moderate, reply, and analyze sentiment in one place.
          </p>
          <Button
            onClick={() => navigate('settings')}
            className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
          >
            <Youtube className="w-4 h-4 mr-2" /> Connect YouTube Channel
            <ArrowRight className="w-4 h-4 ml-2" />
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Community Moderation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Comments &amp; <span className="text-gradient">Community</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, moderate, and respond to comments across all your videos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refresh}
            disabled={refreshing}
            variant="outline"
            className="rounded-xl"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            onClick={approveAllNew}
            disabled={approvingAll || stats.newCount === 0}
            className="grad-success text-white rounded-xl glow-success font-semibold"
          >
            {approvingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-2" />
            )}
            Approve all new
            {stats.newCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-white/20 text-white border-0"
              >
                {stats.newCount}
              </Badge>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          icon={MessageSquare}
          label="Total comments"
          value={stats.total}
          gradient="grad-primary"
          delay={0}
        />
        <StatCard
          icon={Sparkles}
          label="New"
          value={stats.newCount}
          gradient="grad-cool"
          delay={0.05}
        />
        <StatCard
          icon={AlertTriangle}
          label="Held for review"
          value={stats.heldCount}
          gradient="grad-warm"
          delay={0.1}
        />
        <StatCard
          icon={Ban}
          label="Marked spam"
          value={stats.spamCount}
          gradient="grad-success"
          delay={0.15}
        />
      </motion.div>

      {/* Sentiment breakdown + filter bar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Donut chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 lg:col-span-1"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Sentiment breakdown</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            AI-classified mood of your audience.
          </p>
          <SentimentDonut
            positive={stats.positive}
            neutral={stats.neutral}
            negative={stats.negative}
          />
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 space-y-3"
        >
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Search className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Filter &amp; search</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by comment text or author name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl bg-background/40"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-full rounded-xl bg-background/40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sentimentFilter}
                onValueChange={(v) => setSentimentFilter(v as SentimentFilter)}
              >
                <SelectTrigger className="w-full rounded-xl bg-background/40">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
              <Select value={videoFilter} onValueChange={setVideoFilter}>
                <SelectTrigger className="w-full rounded-xl bg-background/40">
                  <SelectValue placeholder="Video" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All videos</SelectItem>
                  {videos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="truncate">{v.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {stats.total} comments
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 text-xs rounded-lg"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Select-all header (only when comments exist) */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={toggleSelectAllVisible}
              aria-label="Select all visible comments"
            />
            Select all visible
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {selectedIds.size} selected
              </Badge>
            )}
          </label>
          <span className="text-xs text-muted-foreground">
            {filtered.length} comment{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Comments feed */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-12 sm:p-16 text-center"
        >
          <div className="relative mx-auto w-28 h-28 mb-5">
            <div className="absolute inset-0 grad-primary rounded-full opacity-20 blur-2xl" />
            <div className="relative w-28 h-28 rounded-3xl glass-strong flex items-center justify-center float-slow">
              {stats.total === 0 ? (
                <MessageSquare className="w-12 h-12 text-primary" />
              ) : (
                <Search className="w-12 h-12 text-primary" />
              )}
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {stats.total === 0
              ? 'No comments yet'
              : 'No comments match your filters'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            {stats.total === 0
              ? 'Connect a channel and sync comments to start moderating your community.'
              : 'Try adjusting your search or filters to find what you need.'}
          </p>
          {stats.total === 0 ? (
            <Button
              onClick={() => navigate('channels')}
              className="grad-primary text-white rounded-xl glow-primary"
            >
              <Tv className="w-4 h-4 mr-2" />
              Connect a channel
            </Button>
          ) : (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Clear filters
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto scroll-styled pr-1 pb-24">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <CommentCard
                key={c.id}
                comment={c}
                index={i}
                selected={selectedIds.has(c.id)}
                onToggleSelect={toggleSelect}
                onAction={applyAction}
                onNavigateToVideo={navigateToVideo}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl"
          >
            <div className="glass-strong rounded-2xl shadow-2xl p-3 flex items-center gap-2 flex-wrap justify-center">
              <div className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 rounded-lg grad-primary flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="h-6 w-px bg-border/60 hidden sm:block" />
              <BulkButton
                icon={CheckCircle2}
                label="Approve"
                color="text-emerald-400 hover:bg-emerald-500/15"
                pending={bulkPending === 'approve'}
                disabled={bulkPending !== null}
                onClick={() => applyBulk('approve')}
              />
              <BulkButton
                icon={PauseCircle}
                label="Hold"
                color="text-amber-400 hover:bg-amber-500/15"
                pending={bulkPending === 'hold'}
                disabled={bulkPending !== null}
                onClick={() => applyBulk('hold')}
              />
              <BulkButton
                icon={Ban}
                label="Spam"
                color="text-red-400 hover:bg-red-500/15"
                pending={bulkPending === 'spam'}
                disabled={bulkPending !== null}
                onClick={() => applyBulk('spam')}
              />
              <BulkButton
                icon={Trash2}
                label="Delete"
                color="text-red-400 hover:bg-red-500/15"
                pending={bulkPending === 'delete'}
                disabled={bulkPending !== null}
                onClick={() => applyBulk('delete')}
              />
              <div className="h-6 w-px bg-border/60 hidden sm:block" />
              <BulkButton
                icon={X}
                label="Clear"
                color="text-muted-foreground hover:bg-accent"
                pending={false}
                disabled={bulkPending !== null}
                onClick={clearSelection}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BulkButton({
  icon: Icon,
  label,
  color,
  pending,
  disabled,
  onClick,
}: {
  icon: typeof CheckCircle2
  label: string
  color: string
  pending: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${color}`}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  )
}

// Tv icon is used inside the empty-state CTA.
