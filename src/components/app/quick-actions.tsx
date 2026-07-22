'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  Youtube,
  Brain,
  FileText,
  KanbanSquare,
  Sparkles,
  X,
  Zap,
  ArrowRight,
  TrendingUp,
  Lightbulb,
  Plus,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAppStore, type ViewKey } from '@/lib/store'
import { apiFetch } from '@/lib/api-client'

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: typeof Youtube
  view: 'channels' | 'analysis' | 'script' | 'workflow' | 'recommendations'
  done: boolean
}

interface QuickAction {
  label: string
  icon: typeof Zap
  view: ViewKey
  color: string
  gradient: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Generate Script', icon: FileText, view: 'script', color: 'text-fuchsia-400', gradient: 'grad-primary' },
  { label: 'Run AI Analysis', icon: Brain, view: 'analysis', color: 'text-sky-400', gradient: 'grad-cool' },
  { label: 'Get Recommendations', icon: Lightbulb, view: 'recommendations', color: 'text-amber-400', gradient: 'grad-warm' },
  { label: 'New Task', icon: Plus, view: 'workflow', color: 'text-emerald-400', gradient: 'grad-success' },
  { label: 'Plan Content', icon: KanbanSquare, view: 'planner', color: 'text-violet-400', gradient: 'grad-primary' },
  { label: 'View Analytics', icon: TrendingUp, view: 'analytics', color: 'text-rose-400', gradient: 'grad-warm' },
]

export function QuickActionsBar() {
  const { navigate } = useAppStore()

  return (
    <Card className="glass border-border/60 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Quick Actions
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Jump straight into your most-used tools
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(action.view)}
                className="group relative overflow-hidden rounded-xl p-3 glass hover:bg-accent/40 transition-all text-left lift"
              >
                <div
                  className={`absolute -right-3 -top-3 w-12 h-12 rounded-full ${action.gradient} opacity-15 blur-xl group-hover:opacity-30 transition-opacity`}
                />
                <div
                  className={`w-8 h-8 rounded-lg ${action.gradient} flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-medium leading-tight">{action.label}</p>
              </motion.button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export function OnboardingChecklist() {
  const { navigate } = useAppStore()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [channelsRes, analysisRes, scriptsRes, tasksRes, recsRes] =
          await Promise.all([
            apiFetch<{ channels: unknown[] }>('/api/channels'),
            apiFetch<{ analysis?: unknown[] } | Record<string, never>>('/api/dashboard').catch(() => ({})),
            apiFetch<{ scripts: unknown[] }>('/api/scripts').catch(() => ({ scripts: [] })),
            apiFetch<{ tasks: unknown[] }>('/api/tasks').catch(() => ({ tasks: [] })),
            apiFetch<{ recommendations?: unknown[] } | Record<string, never>>('/api/dashboard').catch(() => ({})),
          ])

        if (!active) return

        const hasChannels = (channelsRes.channels?.length ?? 0) > 0
        const dashData = (analysisRes as { channels?: unknown[]; tasks?: unknown[] }).channels
        const hasAnalysis = false // would need a dedicated endpoint; derive from analysis count
        const hasScripts = (scriptsRes.scripts?.length ?? 0) > 0
        const hasTasks = (tasksRes.tasks?.length ?? 0) > 0
        const hasRecs = false

        setItems([
          {
            id: 'connect',
            label: 'Connect a YouTube channel',
            description: 'Link your channel to sync videos and stats',
            icon: Youtube,
            view: 'channels',
            done: hasChannels,
          },
          {
            id: 'analysis',
            label: 'Run your first AI analysis',
            description: 'Get a Gemini-powered channel health breakdown',
            icon: Brain,
            view: 'analysis',
            done: hasAnalysis,
          },
          {
            id: 'recommendations',
            label: 'Generate AI recommendations',
            description: 'Discover titles, tags, and growth ideas',
            icon: Lightbulb,
            view: 'recommendations',
            done: hasRecs,
          },
          {
            id: 'script',
            label: 'Create a video script',
            description: 'Use the AI script generator',
            icon: FileText,
            view: 'script',
            done: hasScripts,
          },
          {
            id: 'workflow',
            label: 'Add a workflow task',
            description: 'Start organizing your production pipeline',
            icon: KanbanSquare,
            view: 'workflow',
            done: hasTasks,
          },
        ])
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (loading || dismissed) return null

  const completed = items.filter((i) => i.done).length
  const total = items.length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  // Hide if everything is done
  if (completed === total && total > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl grad-success p-5 text-white"
      >
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">You&apos;re all set! 🎉</h3>
            <p className="text-sm text-white/80">
              You&apos;ve completed all onboarding steps. Your studio is ready to roll.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={() => navigate('dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <Card className="glass border-border/60 overflow-hidden">
      <div className="relative p-5">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full grad-primary opacity-10 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl grad-primary flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Get started with TubeFlow AI</h3>
                <p className="text-xs text-muted-foreground">
                  Complete these steps to set up your studio
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss checklist"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                {completed} of {total} completed
              </span>
              <span className="font-semibold text-primary">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2 [&>div]:grad-primary" />
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            {items.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(item.view)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all group ${
                    item.done
                      ? 'opacity-60'
                      : 'hover:bg-accent/40'
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                  )}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.done ? 'bg-muted' : 'grad-primary'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.done ? 'text-muted-foreground' : 'text-white'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-tight ${
                        item.done ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                  {!item.done && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
