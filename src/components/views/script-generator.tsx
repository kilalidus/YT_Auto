'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  PenLine,
  Sparkles,
  Loader2,
  Copy,
  Check,
  FileText,
  Trash2,
  Brain,
  Wand2,
  Lightbulb,
  Clock,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch, timeAgo } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Channel {
  id: string
  title: string
}

interface Project {
  id: string
  name: string
  color: string
}

interface Script {
  id: string
  title: string
  type: string
  content: string
  createdAt: string
  projectId: string | null
  metadata?: Record<string, unknown>
}

interface ScriptResponse {
  script: string
  saved: Script
}

const SCRIPT_TYPES: { value: string; label: string; desc: string }[] = [
  { value: 'full', label: 'Complete Script', desc: 'Hook → Intro → Main → CTA' },
  { value: 'hook', label: 'Hooks', desc: '3 powerful openers' },
  { value: 'intro', label: 'Intro', desc: 'Channel intro (<30s)' },
  { value: 'shorts', label: 'Shorts Script', desc: 'Fast-paced, <60s' },
  { value: 'podcast', label: 'Podcast', desc: 'Segmented episode' },
  { value: 'outline', label: 'Outline', desc: 'Timestamped structure' },
  { value: 'thumbnail', label: 'Thumbnail Ideas', desc: '5 high-CTR concepts' },
]

const TONES = ['conversational', 'professional', 'energetic', 'educational', 'humorous', 'inspirational']
const DURATIONS = ['Under 5 min', '5-10 min', '10-15 min', '15+ min', 'Shorts (<60s)']

export function ScriptGeneratorView() {
  const navigate = useAppStore((s) => s.navigate)
  const [channels, setChannels] = useState<Channel[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [scripts, setScripts] = useState<Script[]>([])

  const [form, setForm] = useState({
    type: 'full',
    topic: '',
    audience: '',
    tone: 'conversational',
    duration: '5-10 min',
    channelName: '',
    extra: '',
    projectId: '',
  })

  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState<string>('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Load channels, projects, scripts in parallel on mount
  useEffect(() => {
    Promise.all([
      apiFetch<{ channels: Channel[] }>('/api/channels'),
      apiFetch<{ projects: Project[] }>('/api/projects'),
      apiFetch<{ scripts: Script[] }>('/api/scripts'),
    ])
      .then(([c, p, s]) => {
        setChannels(c.channels)
        setProjects(p.projects)
        setScripts(s.scripts)
        if (c.channels[0] && !form.channelName) {
          setForm((f) => ({ ...f, channelName: c.channels[0].title }))
        }
      })
      .catch(() => toast.error('Failed to load data'))
     
  }, [])

  const reloadScripts = () => {
    apiFetch<{ scripts: Script[] }>('/api/scripts')
      .then((r) => setScripts(r.scripts))
      .catch(() => {})
  }

  const generate = async () => {
    if (!form.topic.trim()) {
      toast.error('Topic is required')
      return
    }
    setGenerating(true)
    setOutput('')
    setSavedId(null)
    try {
      const res = await apiFetch<ScriptResponse>('/api/ai/script', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          topic: form.topic.trim(),
          audience: form.audience.trim() || 'general audience',
          tone: form.tone,
          duration: form.duration,
          channelName: form.channelName.trim() || 'My Channel',
          extra: form.extra.trim() || undefined,
          projectId: form.projectId || undefined,
        }),
      })
      setOutput(res.script)
      setSavedId(res.saved.id)
      reloadScripts()
      toast.success('Script generated and saved!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate script')
    } finally {
      setGenerating(false)
    }
  }

  const copyOutput = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success('Script copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const loadScript = (s: Script) => {
    setOutput(s.content)
    setSavedId(s.id)
    setForm((f) => ({
      ...f,
      type: s.type || f.type,
      topic: s.title || f.topic,
    }))
    toast.success(`Loaded "${s.title}"`)
  }

  const deleteScript = async (id: string) => {
    if (!confirm('Delete this script?')) return
    try {
      await apiFetch(`/api/scripts/${id}`, { method: 'DELETE' })
      setScripts((s) => s.filter((x) => x.id !== id))
      if (savedId === id) {
        setOutput('')
        setSavedId(null)
      }
      toast.success('Script deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <PenLine className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Gemini Scriptwriter
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          AI Script Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate retention-optimized YouTube scripts, hooks, outlines, and more in
          seconds.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="glass border-border/60 sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" /> Script Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Tell Gemini what to write — the more specific, the better.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {channels.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-xs">
                      <p className="font-medium text-amber-200">
                        No channel connected
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Connect YouTube in Settings to auto-fill your channel
                        name and get more accurate scripts.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigate('settings')}
                    size="sm"
                    className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white h-8"
                  >
                    <Youtube className="w-3.5 h-3.5 mr-1.5" /> Go to Settings
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <Label>Script type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCRIPT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex flex-col">
                          <span>{t.label}</span>
                          <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topic">
                  Topic <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="topic"
                  placeholder="e.g. How to start a YouTube channel in 2025"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="audience">Target audience</Label>
                  <Input
                    id="audience"
                    placeholder="Beginner creators"
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tone</Label>
                  <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="channel">Channel name</Label>
                  <Input
                    id="channel"
                    placeholder="My Channel"
                    value={form.channelName}
                    onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Project (optional)</Label>
                  <Select
                    value={form.projectId || 'none'}
                    onValueChange={(v) => setForm({ ...form, projectId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: p.color }}
                            />
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="extra">Extra notes</Label>
                <Textarea
                  id="extra"
                  rows={3}
                  placeholder="Mention key points, brand voice, links to include, etc."
                  value={form.extra}
                  onChange={(e) => setForm({ ...form, extra: e.target.value })}
                  className="rounded-xl resize-none"
                />
              </div>

              <Button
                onClick={generate}
                disabled={generating || !form.topic.trim()}
                className="w-full rounded-xl grad-primary text-white glow-primary h-11"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gemini is writing your script…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Script
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Output */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <Card className="glass border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Generated Script
                </CardTitle>
                <CardDescription className="text-xs">
                  {output ? 'Markdown output — ready to copy or refine.' : 'Your script will appear here.'}
                </CardDescription>
              </div>
              {output && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-8"
                    onClick={copyOutput}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  {savedId && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                      <Check className="w-3 h-3 mr-1" /> Saved
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {generating ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{
                      rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 2, repeat: Infinity },
                    }}
                    className="w-20 h-20 rounded-3xl grad-primary flex items-center justify-center mb-5 glow-primary"
                  >
                    <Brain className="w-10 h-10 text-white" />
                  </motion.div>
                  <p className="font-semibold text-center">
                    Gemini is writing your script…
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
                    Crafting an engaging, retention-optimized script in your chosen tone.
                    This typically takes 15–30 seconds.
                  </p>
                  <div className="flex items-center gap-1.5 mt-5">
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
              ) : output ? (
                <div className="prose-script max-h-[60vh] overflow-y-auto scroll-styled pr-2">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-5 mb-3 text-gradient">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-bold mt-5 mb-2 text-foreground">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mt-4 mb-1.5 text-foreground">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm leading-relaxed mb-3 text-foreground/90">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 space-y-1 mb-3 text-sm">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 space-y-1 mb-3 text-sm">{children}</ol>
                      ),
                      li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-bold text-foreground">{children}</strong>
                      ),
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto mb-3 scroll-styled">
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground my-3">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {children}
                        </a>
                      ),
                      hr: () => <hr className="my-4 border-border" />,
                      table: ({ children }) => (
                        <table className="w-full text-xs border-collapse mb-3">{children}</table>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border p-2 bg-muted/50 font-semibold text-left">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border p-2">{children}</td>
                      ),
                    }}
                  >
                    {output}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl grad-primary flex items-center justify-center mb-4 float-slow glow-primary">
                    <Lightbulb className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-semibold text-center">No script yet</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
                    Fill in the form on the left and click <span className="text-primary font-medium">Generate Script</span> to see Gemini&apos;s output here.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-sm">
                    {[
                      'Be specific with your topic',
                      'Mention your audience',
                      'Add brand voice notes',
                      'Pick the right tone',
                    ].map((tip) => (
                      <Badge
                        key={tip}
                        variant="outline"
                        className="text-[10px] bg-accent/40"
                      >
                        <Lightbulb className="w-2.5 h-2.5 mr-1 text-amber-400" />
                        {tip}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent scripts */}
          <Card className="glass border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recent Scripts
              </CardTitle>
              <span className="text-xs text-muted-foreground">{scripts.length}</span>
            </CardHeader>
            <CardContent>
              {scripts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No saved scripts yet. Generate your first one above.
                </p>
              ) : (
                <ScrollArea className="h-56 pr-2">
                  <div className="space-y-2">
                    {scripts.map((s) => {
                      const isActive = savedId === s.id
                      return (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${
                            isActive
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-accent/40'
                          }`}
                          onClick={() => loadScript(s)}
                        >
                          <div className="w-9 h-9 rounded-lg grad-primary flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                              {s.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">
                                {SCRIPT_TYPES.find((t) => t.value === s.type)?.label ?? s.type}
                              </Badge>
                              <span>{timeAgo(s.createdAt)}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteScript(s.id)
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
