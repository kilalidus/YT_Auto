'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  parseISO,
  isAfter,
  differenceInCalendarDays,
} from 'date-fns'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Clock,
  Trash2,
  Pencil,
  Video,
  Clapperboard,
  Eye,
  Users,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'

interface CalEvent {
  id: string
  title: string
  date: string
  type: string
  status: string
  notes?: string
  projectId: string | null
  project: { id: string; name: string; color: string } | null
}

interface Project {
  id: string
  name: string
  color: string
  status: string
}

interface EventsResponse {
  events: CalEvent[]
}
interface ProjectsResponse {
  projects: Project[]
}

const eventTypeConfig: Record<
  string,
  { grad: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  publish: {
    grad: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: Send,
  },
  record: {
    grad: 'from-fuchsia-400 to-pink-500',
    bg: 'bg-fuchsia-500/15',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    icon: Video,
  },
  edit: {
    grad: 'from-sky-400 to-blue-500',
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    icon: Clapperboard,
  },
  review: {
    grad: 'from-amber-400 to-yellow-500',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: Eye,
  },
  meeting: {
    grad: 'from-violet-400 to-purple-500',
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    icon: Users,
  },
}

function getTypeConfig(type: string) {
  return (
    eventTypeConfig[type] || {
      grad: 'from-slate-400 to-slate-500',
      bg: 'bg-slate-500/15',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      icon: CalendarDays,
    }
  )
}

const EVENT_TYPES = ['publish', 'record', 'edit', 'review', 'meeting']
const EVENT_STATUSES = ['planned', 'in-progress', 'done', 'cancelled']

const AI_SUGGESTIONS = [
  {
    title: 'Trending topic: AI tools roundup',
    type: 'record',
    desc: 'Record a short covering 5 trending AI tools this week.',
  },
  {
    title: 'Q&A community livestream',
    type: 'meeting',
    desc: 'Engage your audience with a 1-hour live Q&A session.',
  },
  {
    title: 'Edit backlog: 2 raw clips',
    type: 'edit',
    desc: 'Block 3 hours to edit the two pending raw recordings.',
  },
  {
    title: 'Publish Friday main video',
    type: 'publish',
    desc: 'Schedule your main weekly upload for Friday 5pm.',
  },
]

interface EventFormState {
  title: string
  type: string
  status: string
  projectId: string | null
  notes: string
  date: string
}

const emptyEventForm: EventFormState = {
  title: '',
  type: 'publish',
  status: 'planned',
  projectId: '',
  notes: '',
  date: '',
}

function EventChip({
  event,
  onClick,
  compact,
}: {
  event: CalEvent
  onClick: () => void
  compact?: boolean
}) {
  const cfg = getTypeConfig(event.type)
  const Icon = cfg.icon
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`w-full text-left rounded-lg ${cfg.bg} ${cfg.border} border px-2 py-1 flex items-center gap-1.5 hover:brightness-125 transition-all ${
        compact ? 'text-[10px]' : 'text-xs'
      }`}
    >
      <Icon className={`w-3 h-3 ${cfg.text} shrink-0`} />
      <span className="truncate text-foreground/90 font-medium">
        {event.title}
      </span>
    </motion.button>
  )
}

function EventForm({
  state,
  setState,
  projects,
}: {
  state: EventFormState
  setState: (s: EventFormState) => void
  projects: Project[]
}) {
  const set = <K extends keyof EventFormState>(k: K, v: EventFormState[K]) =>
    setState({ ...state, [k]: v })
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={state.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Event title"
          className="rounded-xl"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={state.type} onValueChange={(v) => set('type', v)}>
            <SelectTrigger className="rounded-xl capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={state.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger className="rounded-xl capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="event-date">Date</Label>
          <Input
            id="event-date"
            type="date"
            value={state.date}
            onChange={(e) => set('date', e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Project</Label>
          <Select
            value={state.projectId || '__none__'}
            onValueChange={(v) => set('projectId', v === '__none__' ? null : v)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                    style={{ background: p.color }}
                  />
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-notes">Notes</Label>
        <Textarea
          id="event-notes"
          value={state.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Add notes, links, prep checklist…"
          className="rounded-xl min-h-[80px] resize-y"
        />
      </div>
    </div>
  )
}

export function PlannerView() {
  const [tab, setTab] = useState<'month' | 'week'>('month')
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [form, setForm] = useState<EventFormState>(emptyEventForm)
  const [saving, setSaving] = useState(false)

  // Compute date range based on tab
  const range = useMemo(() => {
    if (tab === 'month') {
      const ms = startOfMonth(current)
      const me = endOfMonth(current)
      return {
        start: startOfWeek(ms, { weekStartsOn: 1 }),
        end: endOfWeek(me, { weekStartsOn: 1 }),
      }
    }
    const ws = startOfWeek(current, { weekStartsOn: 1 })
    return { start: ws, end: addDays(ws, 6) }
  }, [tab, current])

  const refresh = useCallback(async () => {
    try {
      const from = range.start.toISOString()
      const to = range.end.toISOString()
      const data = await apiFetch<EventsResponse>(
        `/api/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      )
      setEvents(data.events)
    } catch {
      toast.error('Failed to load events')
    }
  }, [range.start, range.end])

  useEffect(() => {
    apiFetch<ProjectsResponse>('/api/projects')
      .then((p) => setProjects(p.projects))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    refresh().finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [refresh])

  const monthDays = useMemo(() => {
    const ms = startOfMonth(current)
    const me = endOfMonth(current)
    return eachDayOfInterval({
      start: startOfWeek(ms, { weekStartsOn: 1 }),
      end: endOfWeek(me, { weekStartsOn: 1 }),
    })
  }, [current])

  const weekDays = useMemo(() => {
    const ws = startOfWeek(current, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  }, [current])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      const key = format(parseISO(ev.date), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  const upcoming = useMemo(() => {
    const now = new Date()
    return events
      .filter((e) => isAfter(parseISO(e.date), now))
      .sort(
        (a, b) =>
          parseISO(a.date).getTime() - parseISO(b.date).getTime()
      )
      .slice(0, 5)
  }, [events])

  const openNewForDate = (date: Date) => {
    setEditingEvent(null)
    setForm({
      ...emptyEventForm,
      date: format(date, 'yyyy-MM-dd'),
    })
    setDialogOpen(true)
  }

  const openEdit = (event: CalEvent) => {
    setEditingEvent(event)
    setForm({
      title: event.title,
      type: event.type,
      status: event.status,
      projectId: event.projectId || '',
      notes: event.notes || '',
      date: format(parseISO(event.date), 'yyyy-MM-dd'),
    })
    setDialogOpen(true)
  }

  const saveEvent = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.date) {
      toast.error('Date is required')
      return
    }
    setSaving(true)
    const body = {
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      projectId: form.projectId || null,
      notes: form.notes,
      date: new Date(form.date).toISOString(),
    }
    try {
      if (editingEvent) {
        const { event } = await apiFetch<{ event: CalEvent }>(
          `/api/events/${editingEvent.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          }
        )
        setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
        toast.success('Event updated')
      } else {
        const { event } = await apiFetch<{ event: CalEvent }>('/api/events', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        setEvents((prev) => [...prev, event])
        toast.success('Event created')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async (event: CalEvent) => {
    const prev = events
    setEvents((p) => p.filter((e) => e.id !== event.id))
    setDialogOpen(false)
    try {
      await apiFetch(`/api/events/${event.id}`, { method: 'DELETE' })
      toast.success('Event deleted')
    } catch {
      setEvents(prev)
      toast.error('Failed to delete event')
    }
  }

  const createFromSuggestion = async (suggestion: (typeof AI_SUGGESTIONS)[number]) => {
    // schedule for 3 days from now as a draft
    const date = addDays(new Date(), 3)
    const body = {
      title: suggestion.title,
      type: suggestion.type,
      status: 'planned',
      projectId: null,
      notes: suggestion.desc,
      date: date.toISOString(),
    }
    try {
      const { event } = await apiFetch<{ event: CalEvent }>('/api/events', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setEvents((prev) => [...prev, event])
      setCurrent(parseISO(event.date))
      setTab('month')
      toast.success(`Draft event added for ${format(date, 'MMM d')}`)
    } catch {
      toast.error('Failed to create suggestion')
    }
  }

  const navigatePrev = () =>
    setCurrent(tab === 'month' ? subMonths(current, 1) : subWeeks(current, 1))
  const navigateNext = () =>
    setCurrent(tab === 'month' ? addMonths(current, 1) : addWeeks(current, 1))
  const goToday = () => setCurrent(new Date())

  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Schedule
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Content Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your publishing cadence and production milestones.
          </p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'month' | 'week')}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="month" className="rounded-lg">
              Month
            </TabsTrigger>
            <TabsTrigger value="week" className="rounded-lg">
              Week
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar */}
        <div className="glass rounded-2xl p-3 sm:p-4">
          {/* Nav */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={navigatePrev} className="rounded-xl h-9 w-9">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext} className="rounded-xl h-9 w-9">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={goToday} className="rounded-xl">
                Today
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {tab === 'month'
                ? format(current, 'MMMM yyyy')
                : `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`}
            </h2>
            <Button
              onClick={() => openNewForDate(new Date())}
              className="rounded-xl grad-primary text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Event
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl glass shimmer" />
              ))}
            </div>
          ) : tab === 'month' ? (
            <>
              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {weekDayLabels.map((d) => (
                  <div
                    key={d}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-center py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {monthDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayEvents = eventsByDay.get(key) || []
                  const inMonth = isSameMonth(day, current)
                  const today = isToday(day)
                  return (
                    <motion.div
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      onClick={() => openNewForDate(day)}
                      className={`min-h-[92px] rounded-xl p-1.5 border cursor-pointer transition-colors flex flex-col gap-1 ${
                        today
                          ? 'border-primary/60 bg-primary/10'
                          : inMonth
                          ? 'border-border/50 bg-card/40 hover:bg-card/70'
                          : 'border-border/30 bg-muted/20 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            today
                              ? 'w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 h-4"
                          >
                            {dayEvents.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 overflow-hidden flex-1">
                        <AnimatePresence>
                          {dayEvents.slice(0, 3).map((ev) => (
                            <EventChip
                              key={ev.id}
                              event={ev}
                              onClick={() => openEdit(ev)}
                              compact
                            />
                          ))}
                        </AnimatePresence>
                        {dayEvents.length > 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openNewForDate(day)
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                          >
                            +{dayEvents.length - 3} more
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </>
          ) : (
            // Week view
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDay.get(key) || []
                const today = isToday(day)
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-2 min-h-[280px] flex flex-col gap-2 ${
                      today
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border/50 bg-card/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {format(day, 'EEE')}
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            today ? 'text-primary' : ''
                          }`}
                        >
                          {format(day, 'd')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openNewForDate(day)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-1.5 flex-1 overflow-y-auto scroll-styled">
                      <AnimatePresence>
                        {dayEvents.map((ev) => (
                          <EventChip
                            key={ev.id}
                            event={ev}
                            onClick={() => openEdit(ev)}
                          />
                        ))}
                      </AnimatePresence>
                      {dayEvents.length === 0 && (
                        <div className="text-[10px] text-muted-foreground/50 text-center py-4">
                          No events
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* AI suggestions */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl p-4 grad-primary text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold">AI Content Suggestions</h3>
              </div>
              <p className="text-[11px] text-white/80 mb-3">
                Click a chip to draft an event.
              </p>
              <div className="space-y-1.5">
                {AI_SUGGESTIONS.map((s, i) => {
                  const Icon = getTypeConfig(s.type).icon
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => createFromSuggestion(s)}
                      className="w-full text-left bg-white/15 hover:bg-white/25 backdrop-blur rounded-lg px-2.5 py-2 flex items-start gap-2 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">
                          {s.title}
                        </p>
                        <p className="text-[10px] text-white/70 line-clamp-2 mt-0.5">
                          {s.desc}
                        </p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Upcoming */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Upcoming</h3>
            </div>
            <div className="space-y-2">
              {upcoming.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No upcoming events in this range.
                </p>
              )}
              <AnimatePresence>
                {upcoming.map((ev) => {
                  const cfg = getTypeConfig(ev.type)
                  const Icon = cfg.icon
                  const days = differenceInCalendarDays(parseISO(ev.date), new Date())
                  return (
                    <motion.button
                      key={ev.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => openEdit(ev)}
                      className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent/40 transition-colors group"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.grad} flex items-center justify-center shrink-0 shadow-md`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(ev.date), 'EEE, MMM d')} ·{' '}
                          {days === 0
                            ? 'today'
                            : days === 1
                            ? 'tomorrow'
                            : `in ${days}d`}
                        </p>
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Legend */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold mb-2">Event Types</h3>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((t) => {
                const cfg = getTypeConfig(t)
                const Icon = cfg.icon
                return (
                  <div
                    key={t}
                    className={`flex items-center gap-1.5 rounded-lg ${cfg.bg} px-2 py-1.5`}
                  >
                    <Icon className={`w-3 h-3 ${cfg.text}`} />
                    <span className="text-[11px] capitalize font-medium">{t}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {editingEvent ? (
                <>
                  <Pencil className="w-4 h-4 text-primary" /> Edit Event
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-primary" /> New Event
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Update or delete this scheduled event.'
                : 'Schedule a new content event.'}
            </DialogDescription>
          </DialogHeader>
          <EventForm state={form} setState={setForm} projects={projects} />
          <DialogFooter className="flex !justify-between">
            {editingEvent ? (
              <Button
                variant="destructive"
                onClick={() => deleteEvent(editingEvent)}
                className="rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={saveEvent}
                disabled={saving}
                className="rounded-xl grad-primary text-white"
              >
                {saving ? 'Saving…' : editingEvent ? 'Save' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
