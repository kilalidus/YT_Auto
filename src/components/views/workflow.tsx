'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Search,
  Lightbulb,
  FlaskConical,
  PenLine,
  Video,
  Clapperboard,
  Image as ImageIcon,
  Eye,
  CalendarClock,
  Send,
  MoreVertical,
  Pencil,
  Trash2,
  GripVertical,
  CheckCircle2,
  ListTodo,
  Flag,
  CalendarDays,
  AlertTriangle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  deadline: string | null
  labels: string[]
  order: number
  completed: boolean
  createdAt: string
  updatedAt: string
  projectId: string | null
  project: { id: string; name: string; color: string } | null
}

interface Project {
  id: string
  name: string
  color: string
  status: string
  _count: { tasks: number; notes: number; files: number }
}

interface TaskResponse {
  tasks: Task[]
}
interface ProjectsResponse {
  projects: Project[]
}

const COLUMNS = [
  {
    id: 'idea',
    title: 'Ideas',
    icon: Lightbulb,
    grad: 'from-amber-400 to-orange-500',
    text: 'text-amber-400',
    ring: 'ring-amber-500/20',
  },
  {
    id: 'research',
    title: 'Research',
    icon: FlaskConical,
    grad: 'from-sky-400 to-cyan-500',
    text: 'text-sky-400',
    ring: 'ring-sky-500/20',
  },
  {
    id: 'script',
    title: 'Script Writing',
    icon: PenLine,
    grad: 'from-violet-400 to-purple-500',
    text: 'text-violet-400',
    ring: 'ring-violet-500/20',
  },
  {
    id: 'recording',
    title: 'Recording',
    icon: Video,
    grad: 'from-rose-400 to-red-500',
    text: 'text-rose-400',
    ring: 'ring-rose-500/20',
  },
  {
    id: 'editing',
    title: 'Editing',
    icon: Clapperboard,
    grad: 'from-fuchsia-400 to-pink-500',
    text: 'text-fuchsia-400',
    ring: 'ring-fuchsia-500/20',
  },
  {
    id: 'thumbnail',
    title: 'Thumbnail',
    icon: ImageIcon,
    grad: 'from-emerald-400 to-teal-500',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/20',
  },
  {
    id: 'review',
    title: 'Review',
    icon: Eye,
    grad: 'from-yellow-400 to-amber-500',
    text: 'text-yellow-400',
    ring: 'ring-yellow-500/20',
  },
  {
    id: 'scheduled',
    title: 'Scheduled',
    icon: CalendarClock,
    grad: 'from-indigo-400 to-blue-500',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/20',
  },
  {
    id: 'published',
    title: 'Published',
    icon: Send,
    grad: 'from-green-400 to-emerald-500',
    text: 'text-green-400',
    ring: 'ring-green-500/20',
  },
] as const

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
}

const priorityDot: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-sky-500',
}

function isOverdue(deadline: string | null, completed: boolean) {
  if (!deadline || completed) return false
  return new Date(deadline).getTime() < Date.now()
}

function isDueThisWeek(deadline: string | null, completed: boolean) {
  if (!deadline || completed) return false
  const d = new Date(deadline).getTime()
  const now = Date.now()
  const week = now + 7 * 24 * 60 * 60 * 1000
  return d >= now && d <= week
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

interface TaskFormState {
  title: string
  description: string
  status: string
  priority: string
  deadline: string
  labels: string
  projectId: string | null
}

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  status: 'idea',
  priority: 'medium',
  deadline: '',
  labels: '',
  projectId: '',
}

function TaskForm({
  state,
  setState,
  projects,
}: {
  state: TaskFormState
  setState: (s: TaskFormState) => void
  projects: Project[]
}) {
  const set = <K extends keyof TaskFormState>(k: K, v: TaskFormState[K]) =>
    setState({ ...state, [k]: v })
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={state.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="What needs to be done?"
          className="rounded-xl"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="task-desc">Description</Label>
        <Textarea
          id="task-desc"
          value={state.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Add details, links, notes…"
          className="rounded-xl min-h-[80px] resize-y"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={state.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={state.priority} onValueChange={(v) => set('priority', v)}>
            <SelectTrigger className="rounded-xl capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['urgent', 'high', 'medium', 'low'].map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-deadline">Deadline</Label>
          <Input
            id="task-deadline"
            type="date"
            value={state.deadline}
            onChange={(e) => set('deadline', e.target.value)}
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
        <Label htmlFor="task-labels">Labels</Label>
        <Input
          id="task-labels"
          value={state.labels}
          onChange={(e) => set('labels', e.target.value)}
          placeholder="comma, separated, tags"
          className="rounded-xl"
        />
        {state.labels.trim() && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {state.labels
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((l, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30"
                >
                  {l}
                </Badge>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  dragging,
}: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onToggleComplete: () => void
  dragging?: boolean
}) {
  const overdue = isOverdue(task.deadline, task.completed)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`group relative rounded-xl border border-border/60 bg-card/80 backdrop-blur p-3 lift cursor-grab active:cursor-grabbing ${
        dragging ? 'ring-2 ring-primary/40 shadow-lg' : ''
      } ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete()
          }}
          className="mt-0.5 shrink-0"
          aria-label="Toggle complete"
        >
          {task.completed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 group-hover:border-primary transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium leading-snug line-clamp-2 ${
              task.completed ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {task.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 capitalize ${priorityColors[task.priority] || ''}`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityDot[task.priority] || ''}`}
          />
          {task.priority}
        </Badge>
        {task.project && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: task.project.color }}
            />
            {task.project.name}
          </span>
        )}
        {task.deadline && (
          <span
            className={`text-[10px] flex items-center gap-0.5 ${
              overdue ? 'text-red-400 font-medium' : 'text-muted-foreground'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            {fmtDate(task.deadline)}
            {overdue && <AlertTriangle className="w-2.5 h-2.5" />}
          </span>
        )}
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.slice(0, 4).map((l, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
            >
              {l}
            </span>
          ))}
          {task.labels.length > 4 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              +{task.labels.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
        <GripVertical className="w-3 h-3" />
      </div>
    </motion.div>
  )
}

function SortableCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  onToggleComplete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'opacity-30' : ''}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
      />
    </div>
  )
}

function Column({
  column,
  tasks,
  children,
}: {
  column: (typeof COLUMNS)[number]
  tasks: Task[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const Icon = column.icon
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[280px] shrink-0 rounded-2xl border border-border/60 bg-card/40 backdrop-blur transition-colors ${
        isOver ? 'ring-2 ring-primary/40 bg-primary/5' : ''
      }`}
    >
      <div className={`h-1 rounded-t-2xl bg-gradient-to-r ${column.grad}`} />
      <div className="p-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${column.grad} flex items-center justify-center shrink-0 shadow-md`}
          >
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{column.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] ${column.text} border-current/30`}
        >
          {tasks.length}
        </Badge>
      </div>
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[120px] overflow-y-auto scroll-styled">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-24 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center text-[11px] text-muted-foreground/60">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  grad,
  delay,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  grad: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-2xl p-3 lift flex items-center gap-3"
    >
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-lg`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="text-xl font-bold leading-none mt-0.5">{value}</p>
      </div>
    </motion.div>
  )
}

export function WorkflowView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskFormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const tasksRef = useRef<Task[]>([])
  tasksRef.current = tasks

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const refreshTasks = useCallback(async () => {
    try {
      const data = await apiFetch<TaskResponse>('/api/tasks')
      setTasks(data.tasks)
    } catch {
      toast.error('Failed to load tasks')
    }
  }, [])

  useEffect(() => {
    Promise.all([
      apiFetch<TaskResponse>('/api/tasks'),
      apiFetch<ProjectsResponse>('/api/projects'),
    ])
      .then(([t, p]) => {
        setTasks(t.tasks)
        setProjects(p.projects)
      })
      .catch(() => toast.error('Failed to load workflow'))
      .finally(() => setLoading(false))
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (projectFilter !== 'all') {
        if (projectFilter === 'none' && t.projectId) return false
        if (projectFilter !== 'none' && t.projectId !== projectFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.description?.toLowerCase().includes(q) &&
          !t.labels.some((l) => l.toLowerCase().includes(q))
        )
          return false
      }
      return true
    })
  }, [tasks, priorityFilter, projectFilter, search])

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const c of COLUMNS) {
      map[c.id] = filteredTasks
        .filter((t) => t.status === c.id)
        .sort((a, b) => a.order - b.order)
    }
    return map
  }, [filteredTasks])

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.completed).length
    const urgent = tasks.filter(
      (t) => t.priority === 'urgent' && !t.completed
    ).length
    const dueWeek = tasks.filter((t) => isDueThisWeek(t.deadline, t.completed)).length
    return { total, completed, urgent, dueWeek }
  }, [tasks])

  const activeTask = activeId
    ? tasksRef.current.find((t) => t.id === activeId)
    : null

  const findContainer = useCallback((id: string): string | undefined => {
    if (COLUMNS.find((c) => c.id === id)) return id
    return tasksRef.current.find((t) => t.id === id)?.status
  }, [])

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const aId = String(active.id)
    const oId = String(over.id)
    const aCont = findContainer(aId)
    const oCont = findContainer(oId)
    if (!aCont || !oCont || aCont === oCont) return
    // Cross-column optimistic move
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === aId)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], status: oCont }
      return updated
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    setActiveId(null)
    if (!over) return
    const aId = String(active.id)
    const oId = String(over.id)
    const current = tasksRef.current
    const task = current.find((t) => t.id === aId)
    if (!task) return
    const aCont = task.status
    const oCont = findContainer(oId) ?? aCont

    if (aCont === oCont) {
      // Same-column reorder
      if (aId === oId) return
      const containerTasks = current
        .filter((t) => t.status === aCont)
        .sort((a, b) => a.order - b.order)
      const oldIdx = containerTasks.findIndex((t) => t.id === aId)
      if (oldIdx === -1) return
      let newIdx: number
      if (COLUMNS.find((c) => c.id === oId)) {
        newIdx = containerTasks.length - 1
      } else {
        const overIdx = containerTasks.findIndex((t) => t.id === oId)
        newIdx = overIdx === -1 ? containerTasks.length - 1 : overIdx
      }
      const reordered = arrayMove(containerTasks, oldIdx, newIdx)
      const orderMap = new Map(reordered.map((t, i) => [t.id, i]))
      setTasks((prev) =>
        prev.map((t) =>
          t.status === aCont && orderMap.has(t.id)
            ? { ...t, order: orderMap.get(t.id)! }
            : t
        )
      )
      apiFetch(`/api/tasks/${aId}`, {
        method: 'PATCH',
        body: JSON.stringify({ order: newIdx }),
      }).catch(() => {
        toast.error('Failed to save order')
        refreshTasks()
      })
    } else {
      // Cross-column: status already updated optimistically in onDragOver
      apiFetch(`/api/tasks/${aId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: oCont }),
      }).catch(() => {
        toast.error('Failed to save move')
        refreshTasks()
      })
    }
  }

  const openNew = () => {
    setEditingTask(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
      labels: task.labels.join(', '),
      projectId: task.projectId || '',
    })
    setDialogOpen(true)
  }

  const saveTask = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    const body = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      deadline: form.deadline || null,
      labels: form.labels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      projectId: form.projectId || null,
    }
    try {
      if (editingTask) {
        const { task } = await apiFetch<{ task: Task }>(
          `/api/tasks/${editingTask.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          }
        )
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
        toast.success('Task updated')
      } else {
        const { task } = await apiFetch<{ task: Task }>('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        setTasks((prev) => [...prev, task])
        toast.success('Task created')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const deleteTask = async (task: Task) => {
    const prev = tasks
    setTasks((p) => p.filter((t) => t.id !== task.id))
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      toast.success('Task deleted')
    } catch {
      setTasks(prev)
      toast.error('Failed to delete task')
    }
  }

  const toggleComplete = async (task: Task) => {
    const newCompleted = !task.completed
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: newCompleted } : t
      )
    )
    try {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: newCompleted }),
      })
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: task.completed } : t
        )
      )
      toast.error('Failed to update task')
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-16 rounded-2xl glass shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl glass shimmer" />
          ))}
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[260px] w-[280px] h-80 rounded-2xl glass shimmer shrink-0"
            />
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
            <ListTodo className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Production Pipeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Workflow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag cards across stages to move your content from idea to publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openNew}
            className="rounded-xl grad-primary text-white glow-primary"
          >
            <Plus className="w-4 h-4 mr-1" /> New Task
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Tasks"
          value={stats.total}
          icon={ListTodo}
          grad="grad-primary"
          delay={0}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          grad="grad-success"
          delay={0.05}
        />
        <StatCard
          label="Urgent"
          value={stats.urgent}
          icon={Flag}
          grad="grad-warm"
          delay={0.1}
        />
        <StatCard
          label="Due This Week"
          value={stats.dueWeek}
          icon={CalendarDays}
          grad="grad-cool"
          delay={0.15}
        />
      </div>

      {/* Filter bar */}
      <div className="glass rounded-2xl p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="rounded-xl pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="rounded-xl w-full sm:w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {['urgent', 'high', 'medium', 'low'].map((p) => (
              <SelectItem key={p} value={p} className="capitalize">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="rounded-xl w-full sm:w-[160px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="none">No project</SelectItem>
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

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto scroll-styled pb-4 -mx-2 px-2">
          {COLUMNS.map((col) => (
            <Column key={col.id} column={col} tasks={tasksByColumn[col.id] || []}>
              <AnimatePresence>
                {(tasksByColumn[col.id] || []).map((task) => (
                  <SortableCard
                    key={task.id}
                    task={task}
                    onEdit={() => openEdit(task)}
                    onDelete={() => deleteTask(task)}
                    onToggleComplete={() => toggleComplete(task)}
                  />
                ))}
              </AnimatePresence>
            </Column>
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22,1,0.36,1)' }}>
          {activeTask ? (
            <div
              style={{ transform: 'rotate(3deg)' }}
              className="shadow-2xl ring-2 ring-primary/40 rounded-xl"
            >
              <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onToggleComplete={() => {}} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTask ? 'Edit Task' : 'New Task'}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Update the details of your task.'
                : 'Create a new task in your workflow.'}
            </DialogDescription>
          </DialogHeader>
          <TaskForm state={form} setState={setForm} projects={projects} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveTask}
              disabled={saving}
              className="rounded-xl grad-primary text-white"
            >
              {saving ? 'Saving…' : editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
