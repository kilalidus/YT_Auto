'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, FileText, StickyNote, FolderOpen, KanbanSquare, Tv, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { apiFetch, formatNumber } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SearchResult {
  videos: Array<{ id: string; title: string; viewCount: number }>
  notes: Array<{ id: string; title: string; content: string }>
  projects: Array<{ id: string; name: string; description: string }>
  tasks: Array<{ id: string; title: string; status: string }>
  scripts: Array<{ id: string; title: string; type: string }>
}

const empty: SearchResult = { videos: [], notes: [], projects: [], tasks: [], scripts: [] }

export function SearchModal() {
  const { searchOpen, setSearchOpen, navigate, setViewParams } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>(empty)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  useEffect(() => {
    if (!searchOpen) {
      setQuery('')
      setResults(empty)
    }
  }, [searchOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults(empty)
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const data = await apiFetch<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`)
        if (!cancelled) setResults(data)
      } catch {
        if (!cancelled) setResults(empty)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const totalResults =
    results.videos.length +
    results.notes.length +
    results.projects.length +
    results.tasks.length +
    results.scripts.length

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setSearchOpen(false)}
          />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-2xl glass-strong rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-border/60">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search videos, notes, projects, tasks, scripts…"
                className="border-0 shadow-none focus-visible:ring-0 h-9 px-0 text-base"
              />
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                onClick={() => setSearchOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto scroll-styled p-2">
              {query.trim() === '' ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  Start typing to search across your entire workspace.
                </div>
              ) : totalResults === 0 && !loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  No results for “{query}”.
                </div>
              ) : (
                <div className="space-y-1">
                  {results.videos.length > 0 && (
                    <Group icon={Tv} label="Videos" color="text-fuchsia-400">
                      {results.videos.map((v) => (
                        <Row
                          key={v.id}
                          title={v.title}
                          subtitle={`${formatNumber(v.viewCount)} views`}
                          onClick={() => navigate('channels')}
                        />
                      ))}
                    </Group>
                  )}
                  {results.notes.length > 0 && (
                    <Group icon={StickyNote} label="Notes" color="text-amber-400">
                      {results.notes.map((n) => (
                        <Row
                          key={n.id}
                          title={n.title}
                          subtitle={n.content.slice(0, 80).replace(/[#*`]/g, '')}
                          onClick={() => {
                            setViewParams({ noteId: n.id })
                            navigate('notes')
                          }}
                        />
                      ))}
                    </Group>
                  )}
                  {results.projects.length > 0 && (
                    <Group icon={FolderOpen} label="Projects" color="text-emerald-400">
                      {results.projects.map((p) => (
                        <Row
                          key={p.id}
                          title={p.name}
                          subtitle={p.description}
                          onClick={() => navigate('workflow')}
                        />
                      ))}
                    </Group>
                  )}
                  {results.tasks.length > 0 && (
                    <Group icon={KanbanSquare} label="Tasks" color="text-sky-400">
                      {results.tasks.map((t) => (
                        <Row
                          key={t.id}
                          title={t.title}
                          subtitle={<Badge variant="outline" className="text-[10px] capitalize">{t.status}</Badge>}
                          onClick={() => navigate('workflow')}
                        />
                      ))}
                    </Group>
                  )}
                  {results.scripts.length > 0 && (
                    <Group icon={FileText} label="Scripts" color="text-violet-400">
                      {results.scripts.map((s) => (
                        <Row
                          key={s.id}
                          title={s.title}
                          subtitle={<Badge variant="outline" className="text-[10px] capitalize">{s.type}</Badge>}
                          onClick={() => navigate('script')}
                        />
                      ))}
                    </Group>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Group({
  icon: Icon,
  label,
  color,
  children,
}: {
  icon: typeof Search
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className={`w-3 h-3 ${color}`} />
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({
  title,
  subtitle,
  onClick,
}: {
  title: string
  subtitle: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex flex-col gap-0.5 px-3 py-2 rounded-lg hover:bg-accent/60 transition-colors"
    >
      <span className="text-sm font-medium line-clamp-1">{title}</span>
      <span className="text-xs text-muted-foreground line-clamp-1">{subtitle}</span>
    </button>
  )
}
