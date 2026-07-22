'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Video as VideoIcon,
  Eye,
  Youtube,
  Trash2,
  Sparkles,
  Loader2,
  ArrowLeft,
  Globe,
  ThumbsUp,
  MessageCircle,
  Clock,
  Hash,
  ShieldCheck,
  RefreshCw,
  Plug,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch, formatNumber, timeAgo } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Channel {
  id: string
  title: string
  description: string
  thumbnail: string | null
  banner?: string | null
  customUrl: string | null
  subscriberCount: number
  videoCount: number
  viewCount: number
  country: string | null
  publishedAt: string | null
  connected: boolean
  healthScore: number
  lastSyncedAt?: string | null
  youtubeChannelId?: string | null
  _count: { videos: number }
}

interface Video {
  id: string
  title: string
  description: string
  thumbnail: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
  tags: string[]
  isShort: boolean
  publishedAt: string
  status: string
}

interface ChannelDetail extends Channel {
  videos: Video[]
}

interface YouTubeStatus {
  connected: boolean
  tokenExpiresAt: string | null
  channels: Channel[]
  lastSyncedAt: string | null
}

const avatarGradients = [
  'grad-primary',
  'grad-cool',
  'grad-warm',
  'grad-success',
]

function healthColor(score: number) {
  if (score >= 75) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
  if (score >= 50) return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
  return 'text-red-400 bg-red-500/15 border-red-500/30'
}

function healthLabel(score: number) {
  if (score >= 75) return 'Healthy'
  if (score >= 50) return 'Fair'
  return 'Needs Work'
}

export function ChannelsView() {
  const { navigate } = useAppStore()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ChannelDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [ytStatus, setYtStatus] = useState<YouTubeStatus | null>(null)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiFetch<{ channels: Channel[] }>('/api/channels'),
      apiFetch<YouTubeStatus>('/api/youtube/status'),
    ])
      .then(([cRes, ytRes]) => {
        setChannels(cRes.channels)
        setYtStatus(ytRes)
      })
      .catch(() => toast.error('Failed to load channels'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetail(null)
    setDetailLoading(true)
    apiFetch<{ channel: ChannelDetail }>(`/api/channels/${id}`)
      .then((r) => setDetail(r.channel))
      .catch(() => toast.error('Failed to load channel detail'))
      .finally(() => setDetailLoading(false))
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
  }

  const connectYouTube = useCallback(() => {
    // Real OAuth: redirect the browser to /api/youtube/connect, which 302s
    // to Google's consent screen requesting YouTube Data API + Analytics scopes.
    window.location.href = '/api/youtube/connect'
  }, [])

  const syncNow = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await apiFetch<{
        ok: boolean
        channels: number
        videos: number
        playlists: number
        comments: number
        errors: string[]
        syncedAt: string
      }>('/api/youtube/sync', { method: 'POST' })
      toast.success('Sync complete', {
        description: `${res.channels} channel(s), ${res.videos} video(s), ${res.playlists} playlist(s), ${res.comments} comment(s).`,
      })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this channel from your workspace? Your YouTube OAuth connection will be kept — you can re-sync anytime.')) return
    try {
      await apiFetch(`/api/channels/${id}`, { method: 'DELETE' })
      toast.success('Channel removed')
      setChannels((c) => c.filter((ch) => ch.id !== id))
      if (detailId === id) closeDetail()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete channel')
    }
  }

  const ytConnected = Boolean(ytStatus?.connected)

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-20 rounded-2xl glass shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl glass shimmer" />
          ))}
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
            <Youtube className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Channel Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            YouTube Channels
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your real YouTube account via OAuth. Channels are discovered automatically — no manual entry needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ytConnected && (
            <Button
              onClick={syncNow}
              disabled={syncing}
              variant="outline"
              className="rounded-xl"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          )}
          {!ytConnected && (
            <Button
              onClick={connectYouTube}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              <Youtube className="w-4 h-4 mr-1" /> Connect YouTube
            </Button>
          )}
        </div>
      </motion.div>

      {/* Connection status banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`relative overflow-hidden rounded-2xl glass border-border/60 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
          ytConnected ? '' : ''
        }`}
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full grad-warm opacity-20 blur-3xl" />
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
            ytConnected ? 'grad-success' : 'grad-warm'
          }`}
        >
          {ytConnected ? (
            <CheckCircle2 className="w-6 h-6 text-white" />
          ) : (
            <Youtube className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">
            {ytConnected
              ? 'YouTube account connected'
              : 'Connect your YouTube account'}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ytConnected ? (
              <>
                {ytStatus?.channels.length
                  ? `${ytStatus.channels.length} channel(s) discovered. `
                  : 'No channels found yet — click Sync Now. '}
                {ytStatus?.lastSyncedAt && (
                  <span className="text-xs">
                    Last synced {timeAgo(ytStatus.lastSyncedAt)}.
                  </span>
                )}
              </>
            ) : (
              'Securely link your YouTube account via Google OAuth. We will discover every channel you own and sync videos, analytics, and comments automatically.'
            )}
          </p>
        </div>
        {ytConnected ? (
          <Button
            onClick={syncNow}
            disabled={syncing}
            className="rounded-xl grad-primary text-white glow-primary"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Sync Now
          </Button>
        ) : (
          <Button
            onClick={connectYouTube}
            className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
          >
            <Plug className="w-4 h-4 mr-1" /> Connect with Google
          </Button>
        )}
      </motion.div>

      {/* Channel grid / empty state */}
      {channels.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-12 text-center"
        >
          <div className="mx-auto w-24 h-24 rounded-3xl grad-primary flex items-center justify-center mb-6 float-slow glow-primary">
            <Youtube className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-xl font-bold">
            {ytConnected
              ? 'No channels discovered yet'
              : 'No YouTube account connected'}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {ytConnected
              ? 'We could not find any YouTube channels on your connected Google account. Make sure you have a YouTube channel, then click Sync Now.'
              : 'Connect your YouTube account via Google OAuth. We will automatically discover every channel you own and sync your real data — subscribers, videos, views, comments, and analytics.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            {ytConnected ? (
              <Button
                onClick={syncNow}
                disabled={syncing}
                className="rounded-xl grad-primary text-white glow-primary"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Sync Now
              </Button>
            ) : (
              <Button
                onClick={connectYouTube}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              >
                <Youtube className="w-4 h-4 mr-1" /> Connect YouTube Account
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate('settings')}
            >
              Go to Settings
            </Button>
          </div>
          {!ytConnected && (
            <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              You will be redirected to Google to authorize YouTube access.
            </p>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channels.map((c, i) => (
            <ChannelCard
              key={c.id}
              channel={c}
              index={i}
              onView={() => openDetail(c.id)}
              onDelete={() => handleDelete(c.id)}
              onAnalyze={() => navigate('analysis', { channelId: c.id })}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft
                className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={closeDetail}
              />
              {detail?.title ?? 'Channel details'}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `${formatNumber(detail.subscriberCount)} subscribers · ${detail.videos.length} videos · ${formatNumber(detail.viewCount)} total views`
                : 'Loading channel…'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl glass shimmer" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Channel summary */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/30">
                <div
                  className="w-14 h-14 rounded-2xl grad-primary flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden"
                >
                  {detail.thumbnail ? (
                     
                    <img
                      src={detail.thumbnail}
                      alt={detail.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    detail.title.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold line-clamp-1">{detail.title}</p>
                  {detail.customUrl && (
                    <a
                      href={`https://youtube.com/${detail.customUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-0.5 hover:underline"
                    >
                      {detail.customUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {detail.description || 'No description yet.'}
                  </p>
                  {detail.lastSyncedAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last synced {timeAgo(detail.lastSyncedAt)}
                    </p>
                  )}
                </div>
                <Badge className={healthColor(detail.healthScore)}>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {healthLabel(detail.healthScore)} · {detail.healthScore}
                </Badge>
              </div>

              {/* Action row */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-xl grad-primary text-white glow-primary flex-1"
                  onClick={() => {
                    closeDetail()
                    navigate('analysis', { channelId: detail.id })
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Run AI Analysis
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl flex-1"
                  onClick={() => {
                    closeDetail()
                    navigate('analytics', { channelId: detail.id })
                  }}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View Analytics
                </Button>
              </div>

              {/* Videos list */}
              <div className="flex-1 min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Recent videos</p>
                  <span className="text-xs text-muted-foreground">
                    {detail.videos.length} total
                  </span>
                </div>
                <ScrollArea className="h-[40vh] pr-2">
                  <div className="space-y-2">
                    {detail.videos.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No videos synced for this channel yet. Click Sync Now to fetch them.
                      </p>
                    ) : (
                      detail.videos.map((v) => <VideoRow key={v.id} video={v} />)
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChannelCard({
  channel,
  index,
  onView,
  onDelete,
  onAnalyze,
}: {
  channel: Channel
  index: number
  onView: () => void
  onDelete: () => void
  onAnalyze: () => void
}) {
  const grad = avatarGradients[index % avatarGradients.length]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="relative glass rounded-2xl p-5 card-3d border-border/60 group"
    >
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${grad} opacity-20 blur-2xl`} />
      <div className="flex items-start gap-4">
        <div
          className={`relative w-14 h-14 rounded-2xl ${grad} flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg overflow-hidden`}
        >
          {channel.thumbnail ? (
             
            <img
              src={channel.thumbnail}
              alt={channel.title}
              className="w-full h-full object-cover"
            />
          ) : (
            channel.title.charAt(0).toUpperCase()
          )}
          {channel.connected && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <ShieldCheck className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold line-clamp-1">{channel.title}</p>
              {channel.customUrl && (
                <a
                  href={`https://youtube.com/${channel.customUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary line-clamp-1 inline-flex items-center gap-0.5 hover:underline"
                >
                  {channel.customUrl} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <Badge className={healthColor(channel.healthScore)} variant="outline">
              {channel.healthScore}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {channel.description || 'No description yet.'}
          </p>
          {channel.lastSyncedAt && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Synced {timeAgo(channel.lastSyncedAt)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Stat icon={Users} value={formatNumber(channel.subscriberCount)} label="Subs" />
        <Stat icon={VideoIcon} value={formatNumber(channel.videoCount)} label="Videos" />
        <Stat icon={Eye} value={formatNumber(channel.viewCount)} label="Views" />
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {channel.country && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" /> {channel.country}
            </span>
          )}
          {channel.publishedAt && (
            <span>· since {new Date(channel.publishedAt).getFullYear()}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            onClick={onAnalyze}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={onView}
            className="rounded-xl grad-primary text-white h-8"
          >
            View
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: string
  label: string
}) {
  return (
    <div className="rounded-xl bg-accent/30 p-2.5 text-center">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
      <p className="text-sm font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function VideoRow({ video }: { video: Video }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3 p-2 rounded-xl hover:bg-accent/40 transition-colors group"
    >
      <div className="relative w-24 h-14 rounded-lg grad-cool flex items-center justify-center shrink-0 overflow-hidden">
        {video.thumbnail ? (
           
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <VideoIcon className="w-4 h-4 text-white/80" />
        )}
        {video.isShort && (
          <Badge className="absolute top-1 right-1 h-3.5 px-1 text-[8px] bg-red-500">
            SHORT
          </Badge>
        )}
        {video.duration && (
          <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded">
            {video.duration}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {formatNumber(video.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" /> {formatNumber(video.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> {formatNumber(video.commentCount)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(video.publishedAt)}
          </span>
        </div>
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {video.tags.slice(0, 4).map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20"
              >
                <Hash className="w-2.5 h-2.5 mr-0.5" />
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
