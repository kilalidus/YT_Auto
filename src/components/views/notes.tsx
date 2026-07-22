'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Plus,
  Search,
  Pin,
  Star,
  Archive,
  Trash2,
  FolderPlus,
  FileText,
  Eye,
  Pencil,
  X,
  HelpCircle,
  ChevronLeft,
  NotebookPen,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { apiFetch, timeAgo } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  favorited: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
  folderId: string | null
  projectId: string | null
  folder: { id: string; name: string; color: string } | null
  project: { id: string; name: string; color: string } | null
}

interface Folder {
  id: string
  name: string
  color: string
  _count?: { notes: number }
}

interface Project {
  id: string
  name: string
  color: string
}

interface NotesResponse {
  notes: Note[]
}
interface FoldersResponse {
  folders: Folder[]
}
interface ProjectsResponse {
  projects: Project[]
}
interface NoteResponse {
  note: Note
}

type FilterKey = 'all' | 'pinned' | 'favorites' | 'archived'

const FILTERS: { key: FilterKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'all', label: 'All Notes', icon: FileText },
  { key: 'pinned', label: 'Pinned', icon: Pin },
  { key: 'favorites', label: 'Favorites', icon: Star },
  { key: 'archived', label: 'Archived', icon: Archive },
]

const FOLDER_COLORS = [
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

// Strip markdown for preview
function stripMarkdown(md: string): string {
  if (!md) return ''
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/[#*`>_~]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-4 mb-2 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-3 mb-2 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-3 mb-1 text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-2 mb-1 text-foreground">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-2 text-foreground/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1 text-sm text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1 text-sm text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-sm">{children}</li>,
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre className="p-3 rounded-lg bg-black/40 border border-border/50 overflow-x-auto scroll-styled mb-2">
                <code className="text-xs font-mono text-emerald-300" {...props}>
                  {children}
                </code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground mb-2 my-3">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {children}
            </a>
          ),
          input: ({ checked, ...props }) => (
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mr-2 accent-primary align-middle"
              {...props}
            />
          ),
          hr: () => <hr className="border-border/60 my-4" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content || '*Nothing to preview yet.*'}
      </ReactMarkdown>
    </div>
  )
}

const CHEATSHEET = `# Markdown Cheatsheet

## Headings
\`# H1\`  \`## H2\`  \`### H3\`

## Emphasis
\`**bold**\`  \`*italic*\`

## Lists
- bullet item
1. numbered item

## Checkboxes
- [ ] todo
- [x] done

## Code
\`inline code\`

\`\`\`
code block
\`\`\`

## Links
\`[text](url)\`

## Blockquote
\`> quote\`

## Divider
\`---\``

export function NotesView() {
  const { viewParams } = useAppStore()
  const noteIdParam = (viewParams.noteId as string | undefined) || null

  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [filter, setFilter] = useState<FilterKey>('all')
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [pinned, setPinned] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [archived, setArchived] = useState(false)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[4])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)
  const selectedNoteIdRef = useRef<string | null>(null)
  selectedNoteIdRef.current = selectedNoteId

  const refreshNotes = useCallback(async () => {
    try {
      const data = await apiFetch<NotesResponse>('/api/notes')
      setNotes(data.notes)
    } catch {
      toast.error('Failed to load notes')
    }
  }, [])

  const refreshFolders = useCallback(async () => {
    try {
      const data = await apiFetch<FoldersResponse>('/api/folders')
      setFolders(data.folders)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    apiFetch<ProjectsResponse>('/api/projects')
      .then((p) => setProjects(p.projects))
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([refreshNotes(), refreshFolders()]).finally(() =>
      setLoading(false)
    )
  }, [refreshNotes, refreshFolders])

  // Load a specific note from viewParams
  useEffect(() => {
    if (noteIdParam && notes.length > 0) {
      const note = notes.find((n) => n.id === noteIdParam)
      if (note) selectNote(note)
    }
     
  }, [noteIdParam, notes.length])

  const selectNote = useCallback((note: Note) => {
    setSelectedNoteId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags || [])
    setTagInput('')
    setPinned(note.pinned)
    setFavorited(note.favorited)
    setArchived(note.archived)
    setFolderId(note.folderId)
    setShowPreview(false)
    dirtyRef.current = false
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
  }, [])

  const filteredNotes = (() => {
    const byFilter =
      filter === 'pinned'
        ? notes.filter((n) => n.pinned)
        : filter === 'favorites'
          ? notes.filter((n) => n.favorited)
          : filter === 'archived'
            ? notes.filter((n) => n.archived)
            : notes.filter((n) => !n.archived)

    const byFolder = activeFolderId
      ? byFilter.filter((n) => n.folderId === activeFolderId)
      : byFilter

    const bySearch = search.trim()
      ? (() => {
          const q = search.toLowerCase()
          return byFolder.filter(
            (n) =>
              n.title.toLowerCase().includes(q) ||
              n.content.toLowerCase().includes(q) ||
              n.tags.some((t) => t.toLowerCase().includes(q))
          )
        })()
      : byFolder

    // pinned first, then updatedAt desc
    return [...bySearch].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  })()

  const counts = useMemo(() => {
    const active = notes.filter((n) => !n.archived)
    return {
      all: active.length,
      pinned: active.filter((n) => n.pinned).length,
      favorites: active.filter((n) => n.favorited).length,
      archived: notes.filter((n) => n.archived).length,
    }
  }, [notes])

  // Auto-save
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const id = selectedNoteIdRef.current
      if (!id) return
      dirtyRef.current = false
      try {
        const body = {
          title,
          content,
          tags,
          pinned,
          favorited,
          archived,
          folderId,
        }
        const { note } = await apiFetch<NoteResponse>(`/api/notes/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)))
        toast.success('Saved', { duration: 1200 })
      } catch {
        toast.error('Failed to save')
      }
    }, 1500)
    dirtyRef.current = true
  }, [title, content, tags, pinned, favorited, archived, folderId])

  // Trigger save on editor field changes (skip initial select)
  useEffect(() => {
    if (!selectedNoteId) return
    scheduleSave()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
     
  }, [title, content, tags, pinned, favorited, archived, folderId])

  const createNote = async () => {
    try {
      const body = {
        title: 'Untitled note',
        content: '',
        tags: [],
        pinned: false,
        favorited: false,
        folderId: activeFolderId,
      }
      const { note } = await apiFetch<NoteResponse>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setNotes((prev) => [note, ...prev])
      selectNote(note)
      toast.success('Note created')
    } catch {
      toast.error('Failed to create note')
    }
  }

  const deleteNote = async () => {
    if (!selectedNoteId) return
    const id = selectedNoteId
    const prev = notes
    setNotes((p) => p.filter((n) => n.id !== id))
    setSelectedNoteId(null)
    setTitle('')
    setContent('')
    setTags([])
    setPinned(false)
    setFavorited(false)
    setArchived(false)
    setFolderId(null)
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' })
      toast.success('Note deleted')
    } catch {
      setNotes(prev)
      toast.error('Failed to delete')
    }
  }

  const togglePinned = () => setPinned((p) => !p)
  const toggleFavorite = () => setFavorited((f) => !f)
  const toggleArchived = () => setArchived((a) => !a)

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const { folder } = await apiFetch<{ folder: Folder }>('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor }),
      })
      setFolders((prev) => [...prev, folder])
      setNewFolderOpen(false)
      setNewFolderName('')
      setNewFolderColor(FOLDER_COLORS[4])
      toast.success('Folder created')
    } catch {
      toast.error('Failed to create folder')
    }
  }

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-16 rounded-2xl glass shimmer" />
        <div className="grid lg:grid-cols-[220px_320px_1fr] gap-4 h-[calc(100vh-200px)]">
          <div className="rounded-2xl glass shimmer" />
          <div className="rounded-2xl glass shimmer" />
          <div className="rounded-2xl glass shimmer" />
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
        className="flex items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <NotebookPen className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Knowledge Base
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture ideas, scripts, research — all with live markdown.
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[220px_320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left sidebar */}
        <aside className="hidden lg:flex flex-col glass rounded-2xl p-3 gap-1 overflow-y-auto scroll-styled">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
            Filters
          </p>
          {FILTERS.map((f) => {
            const Icon = f.icon
            const active = filter === f.key && !activeFolderId
            return (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key)
                  setActiveFolderId(null)
                }}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'hover:bg-accent/50 text-foreground/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">{f.label}</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                  {counts[f.key]}
                </Badge>
              </button>
            )
          })}

          <div className="flex items-center justify-between px-2 pt-3 pb-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Folders
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNewFolderOpen(true)}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          </div>
          {folders.length === 0 && (
            <p className="text-[11px] text-muted-foreground/60 px-2 py-1">
              No folders yet.
            </p>
          )}
          {folders.map((f) => {
            const active = activeFolderId === f.id
            const count = notes.filter((n) => n.folderId === f.id && !n.archived).length
            return (
              <button
                key={f.id}
                onClick={() => {
                  setActiveFolderId(active ? null : f.id)
                  setFilter('all')
                }}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'hover:bg-accent/50 text-foreground/80'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: f.color }}
                />
                <span className="flex-1 text-left truncate">{f.name}</span>
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </button>
            )
          })}
        </aside>

        {/* Middle: notes list */}
        <div
          className={`glass rounded-2xl p-3 flex flex-col gap-2 overflow-hidden ${
            selectedNoteId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
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
          <Button
            onClick={createNote}
            className="rounded-xl grad-primary text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> New Note
          </Button>
          <div className="flex-1 overflow-y-auto scroll-styled space-y-1.5 pr-1">
            <AnimatePresence>
              {filteredNotes.map((note) => {
                const active = note.id === selectedNoteId
                const preview = stripMarkdown(note.content)
                return (
                  <motion.button
                    key={note.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => selectNote(note)}
                    className={`w-full text-left rounded-xl p-3 border transition-colors ${
                      active
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border/40 bg-card/40 hover:bg-card/70'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {note.pinned && (
                            <Pin className="w-3 h-3 text-primary shrink-0 fill-primary" />
                          )}
                          {note.favorited && (
                            <Star className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400" />
                          )}
                          <p
                            className={`text-sm font-semibold truncate ${
                              active ? 'text-primary' : ''
                            }`}
                          >
                            {note.title || 'Untitled'}
                          </p>
                        </div>
                        {preview && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                            {preview}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {note.folder && (
                            <span className="text-[9px] flex items-center gap-0.5 text-muted-foreground">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: note.folder.color }}
                              />
                              {note.folder.name}
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground">
                            {timeAgo(note.updatedAt)}
                          </span>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {note.tags.slice(0, 3).map((t, i) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                              >
                                {t}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{note.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </AnimatePresence>
            {filteredNotes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No notes found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div
          className={`glass rounded-2xl flex flex-col overflow-hidden ${
            selectedNoteId ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {!selectedNote ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-3xl grad-primary flex items-center justify-center mb-4 glow-primary"
              >
                <NotebookPen className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-lg font-semibold">Select a note or create one</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Your markdown editor with live preview and auto-save lives here.
              </p>
              <Button
                onClick={createNote}
                className="rounded-xl grad-primary text-white mt-4"
              >
                <Plus className="w-4 h-4 mr-1" /> New Note
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile back button */}
              <div className="lg:hidden p-2 border-b border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNoteId(null)}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 border-b border-border/40 flex-wrap">
                <Button
                  variant={pinned ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={togglePinned}
                  title="Pin"
                >
                  <Pin
                    className={`w-4 h-4 ${pinned ? 'text-primary fill-primary' : ''}`}
                  />
                </Button>
                <Button
                  variant={favorited ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={toggleFavorite}
                  title="Favorite"
                >
                  <Star
                    className={`w-4 h-4 ${
                      favorited ? 'text-amber-400 fill-amber-400' : ''
                    }`}
                  />
                </Button>
                <Button
                  variant={archived ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={toggleArchived}
                  title="Archive"
                >
                  <Archive
                    className={`w-4 h-4 ${archived ? 'text-primary' : ''}`}
                  />
                </Button>
                <div className="w-px h-5 bg-border/60 mx-1" />
                <Select
                  value={folderId || '__none__'}
                  onValueChange={(v) => setFolderId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs">
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No folder</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                          style={{ background: f.color }}
                        />
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setShowPreview((p) => !p)}
                  title={showPreview ? 'Edit' : 'Preview'}
                >
                  {showPreview ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      title="Markdown help"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 glass-strong rounded-xl text-xs">
                    <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed">
                      {CHEATSHEET}
                    </pre>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-red-400 hover:text-red-500"
                  onClick={deleteNote}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Title */}
              <div className="px-4 pt-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled note"
                  className="w-full bg-transparent border-0 outline-none text-2xl font-bold tracking-tight placeholder:text-muted-foreground/40"
                />
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span>{timeAgo(selectedNote.updatedAt)}</span>
                  {selectedNote.project && (
                    <span className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: selectedNote.project.color }}
                      />
                      {selectedNote.project.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="px-4 py-2 flex items-center gap-1.5 flex-wrap border-b border-border/40">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1"
                  >
                    {t}
                    <button
                      onClick={() => removeTag(t)}
                      className="hover:text-red-400"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                      setTags(tags.slice(0, -1))
                    }
                  }}
                  onBlur={addTag}
                  placeholder={tags.length ? 'Add…' : 'Add tags…'}
                  className="bg-transparent border-0 outline-none text-xs flex-1 min-w-[80px] placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scroll-styled">
                {showPreview ? (
                  <div className="p-4">
                    <MarkdownPreview content={content} />
                  </div>
                ) : (
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing in markdown…&#10;&#10;# Heading&#10;**bold** *italic*&#10;- [ ] checkbox&#10;- list item&#10;&#10;```js&#10;console.log('hi')&#10;```"
                    className="w-full h-full border-0 rounded-none bg-transparent resize-none focus-visible:ring-0 text-sm leading-relaxed font-mono p-4"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="glass-strong rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-primary" /> New Folder
            </DialogTitle>
            <DialogDescription>Organize your notes into folders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Video Ideas"
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewFolderColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      newFolderColor === c
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                        : 'hover:scale-110'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewFolderOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={createFolder}
              className="rounded-xl grad-primary text-white"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
