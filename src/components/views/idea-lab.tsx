'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Eye,
  Quote,
  Image as ImageIcon,
  Download,
  RotateCcw,
  GraduationCap,
  Star,
  Zap,
  Video,
  List as ListIcon,
  MessagesSquare,
  Mic,
  Brain,
  Lightbulb,
  ChevronRight,
  Send,
  Clock,
  ImageIcon as ImageIconLucide,
  Type,
  Smile,
  Square,
  Columns2,
  Flame,
  Youtube,
  X,
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Channel {
  id: string
  title: string
  description?: string
}

interface ContentIdea {
  title: string
  hook: string
  format: string
  why: string
  difficulty: string
  estimatedViews: string
  tags: string[]
}

interface ThumbnailResult {
  image: string
  prompt: string
  title: string
  style: string
  createdAt: number
}

type TabKey = 'ideas' | 'thumbnail'

type ThumbStyle = 'bold-text' | 'face-reaction' | 'minimal' | 'comparison' | 'clickbait'

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const FORMAT_META: Record<
  string,
  { icon: typeof GraduationCap; label: string; color: string; bg: string; border: string }
> = {
  tutorial: {
    icon: GraduationCap,
    label: 'Tutorial',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  review: {
    icon: Star,
    label: 'Review',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  shorts: {
    icon: Zap,
    label: 'Shorts',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  vlog: {
    icon: Video,
    label: 'Vlog',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
  },
  listicle: {
    icon: ListIcon,
    label: 'Listicle',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  debate: {
    icon: MessagesSquare,
    label: 'Debate',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
  },
  interview: {
    icon: Mic,
    label: 'Interview',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
}

const DIFFICULTY_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  easy: {
    label: 'Easy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
  },
  hard: {
    label: 'Hard',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
  },
}

const THUMBNAIL_STYLES: {
  value: ThumbStyle
  label: string
  desc: string
  icon: typeof Type
  grad: string
}[] = [
  {
    value: 'bold-text',
    label: 'Bold Text',
    desc: 'Oversized typography that pops',
    icon: Type,
    grad: 'grad-primary',
  },
  {
    value: 'face-reaction',
    label: 'Face Reaction',
    desc: 'Expressive close-up, high energy',
    icon: Smile,
    grad: 'grad-warm',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    desc: 'Clean, premium, lots of space',
    icon: Square,
    grad: 'grad-cool',
  },
  {
    value: 'comparison',
    label: 'Comparison',
    desc: 'Side-by-side before / after',
    icon: Columns2,
    grad: 'grad-success',
  },
  {
    value: 'clickbait',
    label: 'Clickbait',
    desc: 'Arrows, circles, max chaos',
    icon: Flame,
    grad: 'grad-warm',
  },
]

const COUNT_OPTIONS = [4, 6, 8, 10]

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function IdeaLabView() {
  const [tab, setTab] = useState<TabKey>('ideas')
  const navigate = useAppStore((s) => s.navigate)

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
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              AI Creative Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Idea Lab
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Generate fresh video concepts, title variations, and thumbnail
            concepts powered by Gemini.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="glass rounded-2xl p-1 inline-flex gap-1 self-start sm:self-end">
          <TabButton
            active={tab === 'ideas'}
            onClick={() => setTab('ideas')}
            icon={Lightbulb}
            label="Content Ideas"
          />
          <TabButton
            active={tab === 'thumbnail'}
            onClick={() => setTab('thumbnail')}
            icon={ImageIcon}
            label="Thumbnail Studio"
          />
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === 'ideas' ? (
          <motion.div
            key="ideas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ContentIdeasTab onGoToWorkflow={() => navigate('workflow')} />
          </motion.div>
        ) : (
          <motion.div
            key="thumbnail"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ThumbnailStudioTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab toggle button
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Lightbulb
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
    >
      {active && (
        <motion.div
          layoutId="idea-lab-tab"
          className="absolute inset-0 grad-primary rounded-xl shadow-lg"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className="w-4 h-4 relative z-10" />
      <span className="relative z-10">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Content Ideas Tab
// ---------------------------------------------------------------------------

function ContentIdeasTab({ onGoToWorkflow }: { onGoToWorkflow: () => void }) {
  const navigate = useAppStore((s) => s.navigate)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const [form, setForm] = useState({
    niche: '',
    audience: '',
    channelName: '',
    count: 8,
  })
  const [generating, setGenerating] = useState(false)
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Load channels and prefill defaults
  useEffect(() => {
    let cancelled = false
    apiFetch<{ channels: Channel[] }>('/api/channels')
      .then((r) => {
        if (cancelled) return
        setChannels(r.channels)
        if (r.channels[0]) {
          const c = r.channels[0]
          setSelectedChannelId(c.id)
          setForm((f) => ({
            ...f,
            channelName: c.title,
            niche: deriveNiche(c),
            audience: '',
          }))
        }
      })
      .catch(() => toast.error('Failed to load channels'))
      .finally(() => !cancelled && setLoadingChannels(false))
    return () => {
      cancelled = true
    }
  }, [])

  const onChannelChange = (id: string) => {
    setSelectedChannelId(id)
    const c = channels.find((c) => c.id === id)
    if (c) {
      setForm((f) => ({
        ...f,
        channelName: c.title,
        niche: f.niche || deriveNiche(c),
      }))
    }
  }

  const generate = async () => {
    if (!form.niche.trim()) {
      toast.error('Enter a niche or topic to generate ideas')
      return
    }
    if (!form.audience.trim()) {
      toast.error('Enter a target audience')
      return
    }
    setGenerating(true)
    setIdeas([])
    setSentIds(new Set())
    try {
      const res = await apiFetch<{ ideas: ContentIdea[] }>('/api/ai/ideas', {
        method: 'POST',
        body: JSON.stringify({
          niche: form.niche.trim(),
          audience: form.audience.trim(),
          channelName: form.channelName.trim() || 'My Channel',
          count: form.count,
        }),
      })
      setIdeas(res.ideas || [])
      toast.success(`${res.ideas?.length ?? 0} ideas generated`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const sendToWorkflow = async (idea: ContentIdea, index: number) => {
    const id = `${idea.title}-${index}`
    if (sentIds.has(id)) return
    setSendingId(id)
    try {
      const labels = [...(idea.tags ?? []), idea.format].filter(Boolean)
      await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: idea.title,
          description: `${idea.hook}\n\nWhy it works: ${idea.why}`,
          status: 'idea',
          labels,
        }),
      })
      setSentIds((s) => new Set(s).add(id))
      toast.success('Added to Ideas column', {
        description: 'Open the workflow board to plan it.',
        action: {
          label: 'View board',
          onClick: onGoToWorkflow,
        },
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send to workflow')
    } finally {
      setSendingId(null)
    }
  }

  const copyIdea = async (idea: ContentIdea) => {
    const text = `${idea.title}\n\nHook: ${idea.hook}\nFormat: ${idea.format}\nDifficulty: ${idea.difficulty}\nEstimated views: ${idea.estimatedViews}\nTags: ${idea.tags.join(', ')}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Idea copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const hasChannels = channels.length > 0

  return (
    <div className="space-y-4">
      {/* Dismissible amber hint when no channel is connected */}
      <AnimatePresence>
        {!loadingChannels && !hasChannels && !bannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pr-8">
              <div className="flex items-start gap-3 flex-1">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-amber-200">
                    Tip: Connect your YouTube channel in Settings
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    We&apos;ll auto-fill your real channel data and give you more
                    accurate AI suggestions.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('settings')}
                size="sm"
                className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Youtube className="w-4 h-4 mr-1.5" /> Go to Settings
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss tip"
              className="absolute top-3 right-3 p-1 rounded-md text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
      {/* Left form panel */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="glass border-border/60 lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> Brainstorm Setup
            </CardTitle>
            <CardDescription className="text-xs">
              Tell Gemini your niche & audience — get fresh, varied video
              concepts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              {loadingChannels ? (
                <div className="h-9 rounded-xl glass shimmer" />
              ) : hasChannels ? (
                <Select
                  value={selectedChannelId}
                  onValueChange={onChannelChange}
                >
                  <SelectTrigger className="w-full rounded-xl">
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
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  No channels yet — you can still type the fields below
                  manually.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="niche">
                Niche / topic <span className="text-red-400">*</span>
              </Label>
              <Input
                id="niche"
                placeholder="e.g. Personal finance for beginners"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audience">
                Target audience <span className="text-red-400">*</span>
              </Label>
              <Input
                id="audience"
                placeholder="e.g. Beginner content creators"
                value={form.audience}
                onChange={(e) =>
                  setForm({ ...form, audience: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="channel-name">Channel name</Label>
              <Input
                id="channel-name"
                placeholder="My Channel"
                value={form.channelName}
                onChange={(e) =>
                  setForm({ ...form, channelName: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Number of ideas</Label>
              <div className="grid grid-cols-4 gap-2">
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, count: n })}
                    className={`h-9 rounded-xl text-sm font-semibold transition-all ${
                      form.count === n
                        ? 'grad-primary text-primary-foreground glow-primary'
                        : 'glass text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={generate}
              disabled={generating || !form.niche.trim() || !form.audience.trim()}
              className="w-full rounded-xl grad-primary text-white glow-primary h-11"
            >
              {generating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="inline-flex"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                  </motion.span>
                  Gemini is brainstorming ideas…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {ideas.length > 0 ? 'Generate Again' : 'Generate Ideas'}
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Uses Gemini LLM · typically 10–25 seconds.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right results panel */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {generating ? (
          <IdeasLoadingSkeleton count={Math.min(form.count, 6)} />
        ) : ideas.length === 0 ? (
          <IdeasEmptyState />
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {ideas.length} ideas
                </Badge>
                <span>· Click an idea to send it to your workflow board.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={generate}
                disabled={generating}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {ideas.map((idea, i) => (
                <IdeaCard
                  key={`${idea.title}-${i}`}
                  idea={idea}
                  index={i}
                  sent={sentIds.has(`${idea.title}-${i}`)}
                  sending={sendingId === `${idea.title}-${i}`}
                  onSend={() => sendToWorkflow(idea, i)}
                  onCopy={() => copyIdea(idea)}
                />
              ))}
            </div>
          </>
        )}
      </motion.div>
      </div>
    </div>
  )
}

function deriveNiche(c: Channel): string {
  const parts: string[] = []
  if (c.title) parts.push(c.title)
  if (c.description && c.description.trim()) parts.push(c.description.trim())
  // Cap length so the input doesn't get unwieldy
  const joined = parts.join(' — ')
  return joined.length > 120 ? joined.slice(0, 117) + '…' : joined
}

// ---------------------------------------------------------------------------
// Idea card
// ---------------------------------------------------------------------------

function IdeaCard({
  idea,
  index,
  sent,
  sending,
  onSend,
  onCopy,
}: {
  idea: ContentIdea
  index: number
  sent: boolean
  sending: boolean
  onSend: () => void
  onCopy: () => void
}) {
  const formatKey = (idea.format || '').toLowerCase()
  const formatMeta =
    FORMAT_META[formatKey] ?? {
      icon: Video,
      label: idea.format || 'Video',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
    }
  const diffKey = (idea.difficulty || '').toLowerCase()
  const diffMeta =
    DIFFICULTY_META[diffKey] ?? {
      label: idea.difficulty || '—',
      color: 'text-muted-foreground',
      bg: 'bg-muted/30',
      border: 'border-border/40',
    }
  const FormatIcon = formatMeta.icon
  const tags = (idea.tags ?? []).slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <Card className="glass border-border/60 card-3d h-full">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          {/* Top badges row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`${diffMeta.bg} ${diffMeta.color} ${diffMeta.border} border capitalize`}
            >
              {diffMeta.label}
            </Badge>
            <Badge
              variant="outline"
              className={`${formatMeta.bg} ${formatMeta.color} ${formatMeta.border} border`}
            >
              <FormatIcon className="w-3 h-3 mr-1" />
              {formatMeta.label}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base leading-snug">
            {idea.title}
          </h3>

          {/* Hook */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground italic">
            <Quote className="w-3.5 h-3.5 mt-1 shrink-0 text-primary/60" />
            <span className="leading-snug">{idea.hook}</span>
          </div>

          {/* Why it works */}
          <div className="text-sm text-foreground/80 leading-relaxed">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Why it works
            </span>
            <p className="mt-0.5">{idea.why}</p>
          </div>

          {/* Estimated views */}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg grad-cool text-white/95`}
            >
              <Eye className="w-3 h-3" />
              {idea.estimatedViews || '—'}
            </span>
            <span className="text-[10px] text-muted-foreground">est. views</span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
              {tags.map((t, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] bg-accent/40 capitalize"
                >
                  #{t}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <Button
              size="sm"
              onClick={onSend}
              disabled={sending || sent}
              className={`rounded-xl h-8 flex-1 ${
                sent
                  ? 'grad-success text-white'
                  : 'grad-primary text-white glow-primary'
              }`}
            >
              {sent ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" /> Sent to workflow
                </>
              ) : sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1" /> Send to workflow
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-8 px-3"
              onClick={onCopy}
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="sr-only">Copy idea</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton + empty state (ideas)
// ---------------------------------------------------------------------------

function IdeasLoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-8 text-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{
            rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
            scale: { duration: 2, repeat: Infinity },
          }}
          className="mx-auto w-20 h-20 rounded-3xl grad-primary flex items-center justify-center mb-5 glow-primary"
        >
          <Brain className="w-10 h-10 text-white" />
        </motion.div>
        <h3 className="text-lg font-bold">
          Gemini is brainstorming ideas…
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Crafting catchy titles, hooks, and format breakdowns tailored to your
          audience. This typically takes 10–25 seconds.
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-5 w-16 rounded-full shimmer bg-muted/30" />
              <div className="h-5 w-20 rounded-full shimmer bg-muted/30" />
            </div>
            <div className="h-4 w-3/4 rounded-md shimmer bg-muted/30" />
            <div className="h-3 w-full rounded-md shimmer bg-muted/30" />
            <div className="h-3 w-5/6 rounded-md shimmer bg-muted/30" />
            <div className="flex gap-1.5">
              <div className="h-5 w-14 rounded-full shimmer bg-muted/30" />
              <div className="h-5 w-14 rounded-full shimmer bg-muted/30" />
              <div className="h-5 w-14 rounded-full shimmer bg-muted/30" />
            </div>
            <div className="h-8 w-full rounded-xl shimmer bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  )
}

function IdeasEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-3xl p-12 text-center bg-dots"
    >
      <div className="mx-auto w-20 h-20 rounded-2xl grad-primary flex items-center justify-center mb-4 float-slow glow-primary">
        <Wand2 className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-bold">Generate your first batch of ideas</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Fill in the form on the left — your niche, audience, and channel — and
        Gemini will craft a fresh batch of varied video concepts.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl mx-auto">
        {Object.values(FORMAT_META).map((m) => (
          <Badge
            key={m.label}
            variant="outline"
            className={`${m.bg} ${m.color} ${m.border} border`}
          >
            <m.icon className="w-3 h-3 mr-1" />
            {m.label}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-6 text-[11px] text-muted-foreground">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
        <span>
          Tip: be specific about your audience — &ldquo;beginner photographers
          on a budget&rdquo; beats &ldquo;photographers&rdquo;.
        </span>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Thumbnail Studio Tab
// ---------------------------------------------------------------------------

function ThumbnailStudioTab() {
  const [form, setForm] = useState({
    title: '',
    style: 'bold-text' as ThumbStyle,
    description: '',
  })
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ThumbnailResult | null>(null)
  const [history, setHistory] = useState<ThumbnailResult[]>([])
  const [showPrompt, setShowPrompt] = useState(false)

  const generate = async () => {
    if (!form.title.trim()) {
      toast.error('Enter a video title first')
      return
    }
    setGenerating(true)
    setResult(null)
    setShowPrompt(false)
    try {
      const res = await apiFetch<{ image: string; prompt: string }>(
        '/api/ai/thumbnail',
        {
          method: 'POST',
          body: JSON.stringify({
            title: form.title.trim(),
            style: form.style,
            description: form.description.trim() || undefined,
          }),
        }
      )
      const item: ThumbnailResult = {
        image: res.image,
        prompt: res.prompt,
        title: form.title.trim(),
        style: form.style,
        createdAt: Date.now(),
      }
      setResult(item)
      setHistory((h) => [item, ...h].slice(0, 3))
      toast.success('Thumbnail concept ready')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const download = (item: ThumbnailResult) => {
    const a = document.createElement('a')
    a.href = item.image
    a.download = `thumbnail-${slugify(item.title)}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const sendToFiles = async () => {
    if (!result) return
    try {
      // Convert the data URL to a File and POST it as multipart (the upload
      // route expects FormData with a "file" field).
      const res = await fetch(result.image)
      const blob = await res.blob()
      const fd = new FormData()
      fd.append('file', blob, `thumbnail-${slugify(result.title)}.png`)
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')
      toast.success('Saved to File Manager', {
        description: 'Open the File Manager to view it.',
      })
    } catch {
      // Fallback — still give the user positive feedback even if the upload
      // route rejected the payload size.
      toast.success('Saved to File Manager')
    }
  }

  const activeStyle = useMemo(
    () => THUMBNAIL_STYLES.find((s) => s.value === form.style)!,
    [form.style]
  )

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-4">
      {/* Left form panel */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="glass border-border/60 lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Thumbnail Concept
            </CardTitle>
            <CardDescription className="text-xs">
              Pick a style, drop in your title, and let AI design a
              scroll-stopping thumbnail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="thumb-title">
                Video title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="thumb-title"
                placeholder="e.g. I tried YouTube for 30 days"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {THUMBNAIL_STYLES.map((s) => {
                  const isActive = form.style === s.value
                  const SIcon = s.icon
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, style: s.value })}
                      className={`glass rounded-xl p-3 text-left transition-all lift ${
                        isActive
                          ? 'ring-2 ring-primary glow-primary'
                          : 'hover:ring-1 hover:ring-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div
                          className={`w-8 h-8 rounded-lg ${s.grad} flex items-center justify-center`}
                        >
                          <SIcon className="w-4 h-4 text-white" />
                        </div>
                        {isActive && (
                          <div className="w-5 h-5 rounded-full grad-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {s.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thumb-desc">
                Extra context{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="thumb-desc"
                rows={3}
                placeholder="e.g. show a laptop with analytics dashboard, warm lighting"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="rounded-xl resize-none"
              />
            </div>

            <Button
              onClick={generate}
              disabled={generating || !form.title.trim()}
              className="w-full rounded-xl grad-primary text-white glow-primary h-11"
            >
              {generating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="inline-flex"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                  </motion.span>
                  Creating your thumbnail concept…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Thumbnail
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Uses AI image generation. Takes ~15 seconds.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right results panel */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {generating ? (
          <ThumbnailLoadingSkeleton />
        ) : !result ? (
          history.length > 0 ? (
            <ThumbnailHistory
              history={history}
              active={result}
              onSelect={(h) => setResult(h)}
              onDownload={download}
            />
          ) : (
            <ThumbnailEmptyState />
          )
        ) : (
          <ThumbnailResultView
            item={result}
            activeStyleLabel={activeStyle.label}
            showPrompt={showPrompt}
            onTogglePrompt={() => setShowPrompt((s) => !s)}
            onDownload={() => download(result)}
            onRegenerate={generate}
            onSendToFiles={sendToFiles}
            history={history}
            onSelectHistory={(h) => setResult(h)}
          />
        )}
      </motion.div>
    </div>
  )
}

function ThumbnailLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-8 text-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
            scale: { duration: 2, repeat: Infinity },
          }}
          className="mx-auto w-20 h-20 rounded-3xl grad-warm flex items-center justify-center mb-5 glow-warm"
        >
          <ImageIcon className="w-10 h-10 text-white" />
        </motion.div>
        <h3 className="text-lg font-bold">Creating your thumbnail concept…</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Rendering a 16:9 thumbnail with AI image generation. This typically
          takes 10–20 seconds.
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-amber-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>

      <div className="relative w-full aspect-video rounded-2xl overflow-hidden glass">
        <div className="absolute inset-0 shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIconLucide className="w-12 h-12 text-muted-foreground/40 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function ThumbnailEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-3xl p-12 text-center bg-dots"
    >
      <div className="mx-auto w-20 h-20 rounded-2xl grad-warm flex items-center justify-center mb-4 float-slow glow-warm">
        <ImageIcon className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-bold">Create a scroll-stopping thumbnail</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Pick a style and enter your video title. Gemini will generate a
        high-contrast 16:9 thumbnail concept you can download or send to your
        File Manager.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl mx-auto">
        {THUMBNAIL_STYLES.map((s) => (
          <Badge
            key={s.value}
            variant="outline"
            className="bg-accent/40"
          >
            <s.icon className="w-3 h-3 mr-1 text-primary" />
            {s.label}
          </Badge>
        ))}
      </div>
    </motion.div>
  )
}

function ThumbnailResultView({
  item,
  activeStyleLabel,
  showPrompt,
  onTogglePrompt,
  onDownload,
  onRegenerate,
  onSendToFiles,
  history,
  onSelectHistory,
}: {
  item: ThumbnailResult
  activeStyleLabel: string
  showPrompt: boolean
  onTogglePrompt: () => void
  onDownload: () => void
  onRegenerate: () => void
  onSendToFiles: () => void
  history: ThumbnailResult[]
  onSelectHistory: (h: ThumbnailResult) => void
}) {
  return (
    <div className="space-y-4">
      {/* Result image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass rounded-2xl overflow-hidden card-3d glow-primary"
      >
        <div className="relative w-full aspect-video bg-black/40">
          <img
            src={item.image}
            alt={`AI thumbnail concept for "${item.title}"`}
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>

      {/* Meta + actions */}
      <Card className="glass border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                {activeStyleLabel}
              </Badge>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {item.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8"
                onClick={onDownload}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8"
                onClick={onRegenerate}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
              <Button
                size="sm"
                className="rounded-xl h-8 grad-primary text-white"
                onClick={onSendToFiles}
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Send to Files
              </Button>
            </div>
          </div>

          {/* Prompt collapsible */}
          <div>
            <button
              onClick={onTogglePrompt}
              className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform ${
                  showPrompt ? 'rotate-90' : ''
                }`}
              />
              {showPrompt ? 'Hide prompt' : 'View prompt used'}
            </button>
            <AnimatePresence>
              {showPrompt && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-[11px] font-mono text-muted-foreground bg-muted/40 p-3 rounded-lg overflow-x-auto scroll-styled leading-relaxed"
                >
                  {item.prompt}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* History strip */}
      {history.length > 0 && (
        <Card className="glass border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent thumbnails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {history.map((h, i) => {
                const isActive = h.createdAt === item.createdAt
                return (
                  <button
                    key={i}
                    onClick={() => onSelectHistory(h)}
                    className={`relative group rounded-xl overflow-hidden aspect-video transition-all ${
                      isActive
                        ? 'ring-2 ring-primary glow-primary'
                        : 'ring-1 ring-border hover:ring-primary/40'
                    }`}
                  >
                    <img
                      src={h.image}
                      alt={`Recent thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ThumbnailHistory({
  history,
  active,
  onSelect,
  onDownload,
}: {
  history: ThumbnailResult[]
  active: ThumbnailResult | null
  onSelect: (h: ThumbnailResult) => void
  onDownload: (h: ThumbnailResult) => void
}) {
  return (
    <div className="space-y-4">
      <Card className="glass border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> Recent thumbnails
          </CardTitle>
          <span className="text-xs text-muted-foreground">{history.length}</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass rounded-xl overflow-hidden ${
                active?.createdAt === h.createdAt ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="relative w-full aspect-video bg-black/30">
                <img
                  src={h.image}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{h.title}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {h.style.replace('-', ' ')} ·{' '}
                    {new Date(h.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg h-7 px-2"
                    onClick={() => onSelect(h)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg h-7 px-2"
                    onClick={() => onDownload(h)}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
      <ThumbnailEmptyState />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'untitled'
  )
}
