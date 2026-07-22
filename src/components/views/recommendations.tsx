'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  FileText,
  AlignLeft,
  Search,
  Hash,
  Key,
  Flame,
  Lightbulb,
  ListMusic,
  Clock,
  MessageCircle,
  TrendingUp,
  CalendarDays,
  Copy,
  Check,
  Loader2,
  RotateCcw,
  Brain,
  Youtube,
  ArrowRight,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { apiFetch } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Channel {
  id: string
  title: string
}

interface RecGroup {
  items: string[]
}

interface RecommendationsResponse {
  recommendations: Record<string, RecGroup>
  niche: string
  channelId: string
}

interface CategoryConfig {
  key: string // data lookup key in response
  label: string
  icon: typeof FileText
  color: string // text color class
  bg: string // background tint class
  border: string
  pill?: boolean // show as pill badges instead of list
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'title', label: 'Video Titles', icon: FileText, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30' },
  { key: 'description', label: 'Descriptions', icon: AlignLeft, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  { key: 'seo', label: 'SEO Tips', icon: Search, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { key: 'tags', label: 'Tags', icon: Hash, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', pill: true },
  { key: 'keywords', label: 'Keywords', icon: Key, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', pill: true },
  { key: 'trending', label: 'Trending', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { key: 'videoIdeas', label: 'Video Ideas', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  { key: 'playlist', label: 'Playlists', icon: ListMusic, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  { key: 'uploadTimes', label: 'Upload Times', icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { key: 'engagement', label: 'Engagement', icon: MessageCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { key: 'growth', label: 'Growth', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { key: 'calendar', label: 'Content Calendar', icon: CalendarDays, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
]

export function RecommendationsView() {
  const { viewParams, navigate } = useAppStore()
  const initialId = (viewParams.channelId as string) || ''

  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedId, setSelectedId] = useState<string>(initialId)
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<RecommendationsResponse | null>(null)

  useEffect(() => {
    apiFetch<{ channels: Channel[] }>('/api/channels')
      .then((r) => {
        setChannels(r.channels)
        const preset = initialId && r.channels.some((c) => c.id === initialId)
        if (!preset && r.channels[0]) setSelectedId(r.channels[0].id)
      })
      .catch(() => toast.error('Failed to load channels'))
      .finally(() => setLoadingChannels(false))
  }, [initialId])

  const generate = async () => {
    if (!selectedId) {
      toast.error('Select a channel first')
      return
    }
    setGenerating(true)
    setResult(null)
    try {
      const res = await apiFetch<RecommendationsResponse>('/api/ai/recommendations', {
        method: 'POST',
        body: JSON.stringify({ channelId: selectedId }),
      })
      setResult(res)
      toast.success('Recommendations ready!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const copyCard = async (cfg: CategoryConfig) => {
    const items = result?.recommendations?.[cfg.key]?.items ?? []
    if (items.length === 0) return
    try {
      await navigator.clipboard.writeText(items.join('\n'))
      toast.success(`${cfg.label} copied to clipboard`)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const selectedChannel = channels.find((c) => c.id === selectedId)

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
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Gemini Growth Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            AI Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tailored content, SEO, and growth recommendations generated by Gemini for
            your channel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loadingChannels ? (
            <div className="h-9 w-48 rounded-md glass shimmer" />
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-56 rounded-xl">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={generate}
            disabled={generating || !selectedId}
            className="rounded-xl grad-primary text-white glow-primary"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            {generating
              ? 'Generating…'
              : result
                ? 'Generate Again'
                : 'Generate Recommendations'}
          </Button>
        </div>
      </motion.div>

      {/* Empty channels — no YouTube account connected */}
      {!loadingChannels && channels.length === 0 && (
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
            No channels available
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Connect your YouTube channel so Gemini can generate personalized
            titles, SEO strategies, video ideas, and a content calendar for your
            real audience.
          </p>
          <Button
            onClick={() => navigate('settings')}
            className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
          >
            <Youtube className="w-4 h-4 mr-2" /> Connect YouTube Channel
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Generating state */}
      {generating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-12 text-center"
        >
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{
              rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
              scale: { duration: 2, repeat: Infinity },
            }}
            className="mx-auto w-24 h-24 rounded-3xl grad-primary flex items-center justify-center mb-6 glow-primary"
          >
            <Brain className="w-12 h-12 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold">
            Generating recommendations with Gemini…
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Crafting titles, SEO strategies, video ideas, and a content calendar tailored
            to your channel. This typically takes 20–40 seconds.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-8 max-w-2xl mx-auto">
            {CATEGORIES.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.1 }}
                className={`rounded-xl ${c.bg} p-3 flex flex-col items-center gap-1`}
              >
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-[10px] text-muted-foreground">{c.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Initial empty state */}
      {!generating && !result && channels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-12 text-center"
        >
          <div className="mx-auto w-20 h-20 rounded-2xl grad-primary flex items-center justify-center mb-4 float-slow glow-primary">
            <Lightbulb className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold">Ready to grow your channel</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {selectedChannel
              ? `Click "Generate Recommendations" and Gemini will produce a full content strategy for "${selectedChannel.title}".`
              : 'Select a channel above, then generate.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl mx-auto">
            {CATEGORIES.map((c) => (
              <Badge
                key={c.key}
                variant="outline"
                className={`${c.bg} ${c.color} ${c.border} border`}
              >
                <c.icon className="w-3 h-3 mr-1" />
                {c.label}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      {!generating && result && (
        <div className="space-y-4">
          {/* niche banner */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between flex-wrap gap-2"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Niche detected: {result.niche}
              </Badge>
              {selectedChannel && <span>· {selectedChannel.title}</span>}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={generate}
              disabled={generating}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Generate again
            </Button>
          </motion.div>

          {/* Masonry grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
            {CATEGORIES.map((cfg, idx) => {
              const group = result.recommendations?.[cfg.key]
              const items = group?.items ?? []
              return (
                <motion.div
                  key={cfg.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.4 }}
                  className="break-inside-avoid mb-4"
                >
                  <Card className={`glass ${cfg.border} border`}>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className={`text-sm flex items-center gap-2 ${cfg.color}`}>
                        <span className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                          <cfg.icon className="w-3.5 h-3.5" />
                        </span>
                        {cfg.label}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {items.length}
                        </span>
                      </CardTitle>
                      {items.length > 0 && (
                        <CopyButton onCopy={() => copyCard(cfg)} />
                      )}
                    </CardHeader>
                    <CardContent>
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No items returned.
                        </p>
                      ) : cfg.pill ? (
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((it, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-xs`}
                            >
                              {typeof it === 'string' ? it : String(it)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {items.map((it, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 + i * 0.03 }}
                              className="flex items-start gap-2.5 text-sm group"
                            >
                              <span
                                className={`shrink-0 w-5 h-5 rounded-md ${cfg.bg} ${cfg.color} flex items-center justify-center text-[10px] font-bold mt-0.5`}
                              >
                                {i + 1}
                              </span>
                              <span className="text-foreground/90 leading-snug">
                                {typeof it === 'string' ? it : String(it)}
                              </span>
                            </motion.li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
      onClick={() => {
        onCopy()
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </Button>
  )
}
