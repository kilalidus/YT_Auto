'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Heart,
  Calendar,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Loader2,
  RotateCcw,
  Youtube,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch, timeAgo } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Channel {
  id: string
  title: string
  healthScore: number
  subscriberCount: number
  videoCount: number
}

interface AnalysisResult {
  healthScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  performance: { rating: string; note: string }
  engagement: { rating: string; avgEngagementRate: string; note: string }
  consistency: { rating: string; uploadFrequency: string; note: string }
  seo: { rating: string; score: number; note: string }
  retention: { trend: string; note: string }
  ctrOpportunities: string[]
}

interface AnalysisResponse {
  analysis: {
    id: string
    channelId: string
    type: string
    score: number
    result: AnalysisResult
    createdAt: string
  }
}

function ratingColor(rating: string) {
  const r = rating.toLowerCase()
  if (r.includes('excellent') || r.includes('strong') || r.includes('great'))
    return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
  if (r.includes('good') || r.includes('improving') || r.includes('stable'))
    return 'text-sky-400 bg-sky-500/15 border-sky-500/30'
  if (r.includes('average') || r.includes('fair'))
    return 'text-amber-400 bg-amber-500/15 border-amber-500/30'
  if (r.includes('poor') || r.includes('declin') || r.includes('weak') || r.includes('needs'))
    return 'text-red-400 bg-red-500/15 border-red-500/30'
  return 'text-muted-foreground bg-muted/40 border-border'
}

function trendIcon(trend: string) {
  const t = trend.toLowerCase()
  if (t.includes('improv') || t.includes('up')) return { Icon: TrendingUp, color: 'text-emerald-400' }
  if (t.includes('declin') || t.includes('down')) return { Icon: TrendingDown, color: 'text-red-400' }
  return { Icon: Minus, color: 'text-amber-400' }
}

export function AnalysisView() {
  const { viewParams, navigate } = useAppStore()
  const initialId = (viewParams.channelId as string) || ''

  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedId, setSelectedId] = useState<string>(initialId)
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResponse['analysis'] | null>(null)

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

  const runAnalysis = async () => {
    if (!selectedId) {
      toast.error('Select a channel first')
      return
    }
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const res = await apiFetch<AnalysisResponse>('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ channelId: selectedId }),
      })
      setAnalysis(res.analysis)
      toast.success('Analysis complete!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
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
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Gemini-Powered Insights
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            AI Channel Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep-dive into your channel&apos;s performance, engagement, SEO, and growth
            opportunities.
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
            onClick={runAnalysis}
            disabled={analyzing || !selectedId}
            className="rounded-xl grad-primary text-white glow-primary"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            {analyzing ? 'Analyzing…' : analysis ? 'Re-run Analysis' : 'Run AI Analysis'}
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
            No channels to analyze
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Connect your YouTube channel so Gemini can analyze your real
            performance, engagement, SEO, and growth opportunities.
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

      {/* Analyzing state */}
      {analyzing && (
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
            Analyzing channel performance with Gemini…
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Crunching your channel&apos;s stats, recent videos, engagement metrics, and SEO
            signals. This typically takes 20–40 seconds.
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Initial empty state */}
      {!analyzing && !analysis && channels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-12 text-center"
        >
          <div className="mx-auto w-20 h-20 rounded-2xl grad-primary flex items-center justify-center mb-4 float-slow glow-primary">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold">Ready to analyze your channel</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {selectedChannel
              ? `Click "Run AI Analysis" to get a full Gemini-powered breakdown of "${selectedChannel.title}".`
              : 'Select a channel above, then run the analysis.'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 max-w-2xl mx-auto">
            {[
              { Icon: Gauge, label: 'Performance' },
              { Icon: Heart, label: 'Engagement' },
              { Icon: Calendar, label: 'Consistency' },
              { Icon: Search, label: 'SEO Quality' },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl bg-accent/30 p-3 text-center"
              >
                <m.Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      {!analyzing && analysis && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Timestamp + re-run */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="flex items-center justify-between flex-wrap gap-2"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Last analysis: {timeAgo(analysis.createdAt)}
              </Badge>
              {selectedChannel && (
                <span>· {selectedChannel.title}</span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={runAnalysis}
              disabled={analyzing}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Health ring + summary */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="glass border-border/60 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" /> Health Score
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Overall channel vitality
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HealthRing score={analysis.score || analysis.result.healthScore} />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="glass border-border/60 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" /> AI Summary
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Gemini&apos;s overview of your channel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {analysis.result.summary}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Strengths & weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="glass border-emerald-500/30 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.result.strengths?.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </motion.div>
                  ))}
                  {(!analysis.result.strengths ||
                    analysis.result.strengths.length === 0) && (
                    <p className="text-sm text-muted-foreground">No strengths identified.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass border-red-500/30 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" /> Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.result.weaknesses?.map((w, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </motion.div>
                  ))}
                  {(!analysis.result.weaknesses ||
                    analysis.result.weaknesses.length === 0) && (
                    <p className="text-sm text-muted-foreground">No major weaknesses detected.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Metric cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              delay={0.25}
              icon={Gauge}
              title="Performance"
              rating={analysis.result.performance?.rating}
              note={analysis.result.performance?.note}
              accent="grad-primary"
            />
            <MetricCard
              delay={0.3}
              icon={Heart}
              title="Engagement"
              rating={analysis.result.engagement?.rating}
              note={
                analysis.result.engagement?.avgEngagementRate
                  ? `Avg: ${analysis.result.engagement.avgEngagementRate} · ${analysis.result.engagement.note ?? ''}`
                  : analysis.result.engagement?.note
              }
              accent="grad-warm"
            />
            <MetricCard
              delay={0.35}
              icon={Calendar}
              title="Consistency"
              rating={analysis.result.consistency?.rating}
              note={
                analysis.result.consistency?.uploadFrequency
                  ? `${analysis.result.consistency.uploadFrequency} · ${analysis.result.consistency.note ?? ''}`
                  : analysis.result.consistency?.note
              }
              accent="grad-cool"
            />
            <MetricCard
              delay={0.4}
              icon={Search}
              title="SEO"
              rating={analysis.result.seo?.rating}
              note={analysis.result.seo?.note}
              accent="grad-success"
              score={analysis.result.seo?.score}
              trend={analysis.result.retention?.trend}
              trendNote={analysis.result.retention?.note}
            />
          </div>

          {/* CTR opportunities */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="glass border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> CTR Opportunities
                </CardTitle>
                <CardDescription className="text-xs">
                  Actionable ideas to boost your click-through rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.result.ctrOpportunities &&
                analysis.result.ctrOpportunities.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {analysis.result.ctrOpportunities.map((o, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg grad-warm flex items-center justify-center shrink-0 text-white font-bold text-sm">
                          {i + 1}
                        </div>
                        <p className="text-sm">{o}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No CTR opportunities identified.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

function HealthRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const radius = 60
  const circ = 2 * Math.PI * radius
  const offset = circ - (clamped / 100) * circ
  const color =
    clamped >= 75
      ? 'oklch(0.72 0.18 160)'
      : clamped >= 50
        ? 'oklch(0.78 0.18 70)'
        : 'oklch(0.65 0.25 20)'
  return (
    <div className="relative flex items-center justify-center py-2">
      <svg width="160" height="160" className="-rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="oklch(0.5 0.02 280 / 0.12)"
          strokeWidth="12"
        />
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="text-4xl font-bold"
          style={{ color }}
        >
          {clamped}
        </motion.span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          out of 100
        </span>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  title,
  rating,
  note,
  accent,
  delay,
  score,
  trend,
  trendNote,
}: {
  icon: typeof Gauge
  title: string
  rating?: string
  note?: string
  accent: string
  delay: number
  score?: number
  trend?: string
  trendNote?: string
}) {
  const ratingBadge = rating ? ratingColor(rating) : ''
  const trendInfo = trend ? trendIcon(trend) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-2xl p-4 border-border/60 card-3d relative overflow-hidden"
    >
      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${accent} opacity-20 blur-2xl`} />
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl ${accent} flex items-center justify-center shadow-lg`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        {rating && (
          <Badge variant="outline" className={`text-[10px] capitalize ${ratingBadge}`}>
            {rating}
          </Badge>
        )}
      </div>
      <p className="font-semibold text-sm">{title}</p>
      {typeof score === 'number' && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Score</span>
            <span className="font-semibold">{score}/100</span>
          </div>
          <Progress value={score} className="h-1.5" />
        </div>
      )}
      {trendInfo && trend && (
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <trendInfo.Icon className={`w-3.5 h-3.5 ${trendInfo.color}`} />
          <span className={`capitalize font-medium ${trendInfo.color}`}>{trend}</span>
        </div>
      )}
      {note && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{note}</p>
      )}
      {trendNote && !note && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{trendNote}</p>
      )}
    </motion.div>
  )
}
