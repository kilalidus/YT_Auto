'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Keyboard,
  X,
  LayoutDashboard,
  KanbanSquare,
  StickyNote,
  FileText,
  BarChart3,
  Tv,
  Wand2,
  CalendarDays,
  FolderOpen,
  Lightbulb,
  Brain,
  Search,
  Bell,
  Settings,
  Command,
} from 'lucide-react'
import { useAppStore, type ViewKey } from '@/lib/store'

interface ShortcutDef {
  key: string
  label: string
  icon: typeof LayoutDashboard
  view?: ViewKey
  group: 'navigation' | 'actions' | 'general'
}

const SHORTCUTS: ShortcutDef[] = [
  // Navigation (g + key)
  { key: 'g d', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard', group: 'navigation' },
  { key: 'g c', label: 'Channels', icon: Tv, view: 'channels', group: 'navigation' },
  { key: 'g a', label: 'Analytics', icon: BarChart3, view: 'analytics', group: 'navigation' },
  { key: 'g x', label: 'AI Analysis', icon: Brain, view: 'analysis', group: 'navigation' },
  { key: 'g r', label: 'Recommendations', icon: Lightbulb, view: 'recommendations', group: 'navigation' },
  { key: 'g l', label: 'Idea Lab', icon: Wand2, view: 'idea-lab', group: 'navigation' },
  { key: 'g s', label: 'Script Generator', icon: FileText, view: 'script', group: 'navigation' },
  { key: 'g w', label: 'Workflow', icon: KanbanSquare, view: 'workflow', group: 'navigation' },
  { key: 'g p', label: 'Content Planner', icon: CalendarDays, view: 'planner', group: 'navigation' },
  { key: 'g n', label: 'Notes', icon: StickyNote, view: 'notes', group: 'navigation' },
  { key: 'g f', label: 'File Manager', icon: FolderOpen, view: 'files', group: 'navigation' },
  { key: 'g b', label: 'Notifications', icon: Bell, view: 'notifications', group: 'navigation' },
  { key: 'g ,', label: 'Settings', icon: Settings, view: 'settings', group: 'navigation' },
  // General
  { key: '⌘ K', label: 'Search everything', icon: Search, group: 'general' },
  { key: '?', label: 'Show this help', icon: Keyboard, group: 'general' },
  { key: 'esc', label: 'Close dialog / panel', icon: X, group: 'general' },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md glass-strong border border-border/60 text-xs font-semibold font-mono shadow-sm">
      {children}
    </kbd>
  )
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutDef }) {
  const Icon = shortcut.icon
  const keys = shortcut.key.split(' ')
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium truncate">{shortcut.label}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/50 text-xs">then</span>}
            <Kbd>{k === '⌘' ? '⌘' : k.toUpperCase()}</Kbd>
          </span>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcuts() {
  const { navigate } = useAppStore()
  const [open, setOpen] = useState(false)
  const [gPressed, setGPressed] = useState(false)
  // Refs to avoid stale closures in the keydown handler
  const gPressedRef = useRef(false)
  const openRef = useRef(false)
  const navigateRef = useRef(navigate)
  const gTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        !!target &&
        typeof target.getAttribute === 'function' &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'combobox')

      // Escape always works
      if (e.key === 'Escape') {
        setOpen(false)
        gPressedRef.current = false
        setGPressed(false)
        return
      }

      // Don't intercept shortcuts while typing (except Escape)
      if (isTyping) return

      // Cmd/Ctrl + K is handled by the search modal itself
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        return
      }

      // Help modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setOpen((v) => !v)
        gPressedRef.current = false
        setGPressed(false)
        return
      }

      if (openRef.current) return

      // g-prefix navigation
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        gPressedRef.current = true
        setGPressed(true)
        if (gTimeoutRef.current) clearTimeout(gTimeoutRef.current)
        gTimeoutRef.current = setTimeout(() => {
          gPressedRef.current = false
          setGPressed(false)
        }, 1000)
        return
      }

      if (gPressedRef.current) {
        const map: Record<string, ViewKey> = {
          d: 'dashboard',
          c: 'channels',
          a: 'analytics',
          x: 'analysis',
          r: 'recommendations',
          l: 'idea-lab',
          s: 'script',
          w: 'workflow',
          p: 'planner',
          n: 'notes',
          f: 'files',
          b: 'notifications',
          ',': 'settings',
        }
        const view = map[e.key.toLowerCase()]
        if (view) {
          e.preventDefault()
          gPressedRef.current = false
          setGPressed(false)
          if (gTimeoutRef.current) clearTimeout(gTimeoutRef.current)
          navigateRef.current(view)
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    const onOpen = () => {
      setOpen(true)
      gPressedRef.current = false
      setGPressed(false)
    }
    window.addEventListener('tf:open-shortcuts', onOpen as EventListener)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('tf:open-shortcuts', onOpen as EventListener)
      if (gTimeoutRef.current) clearTimeout(gTimeoutRef.current)
    }
  }, [])

  const groups = [
    { id: 'navigation', label: 'Navigation', items: SHORTCUTS.filter((s) => s.group === 'navigation') },
    { id: 'general', label: 'General', items: SHORTCUTS.filter((s) => s.group === 'general') },
  ]

  return (
    <>
      {/* g-prefix indicator */}
      <AnimatePresence>
        {gPressed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] glass-strong rounded-full px-5 py-2.5 shadow-2xl border border-border/60 flex items-center gap-2.5"
          >
            <kbd className="inline-flex items-center justify-center w-7 h-7 rounded-md grad-primary text-white text-xs font-bold">
              G
            </kbd>
            <span className="text-sm font-medium">Press a key to navigate…</span>
            <div className="flex gap-1 ml-1">
              {['d', 'w', 'n', 's', 'a', 'l'].map((k, i) => (
                <motion.span
                  key={k}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-6 h-6 rounded glass flex items-center justify-center text-[10px] font-mono font-semibold text-muted-foreground"
                >
                  {k}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-2xl max-h-[85vh] glass-strong rounded-3xl shadow-2xl border border-border/60 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative shrink-0 p-5 border-b border-border/60 grad-primary">
                <div className="absolute inset-0 bg-grid opacity-20" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Keyboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                      <p className="text-xs text-white/80">
                        Navigate your studio at the speed of thought
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 rounded-xl hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto scroll-styled p-5 space-y-6">
                {groups.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2 px-3">
                      <Command className="w-3.5 h-3.5 text-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {group.items.map((s) => (
                        <ShortcutRow key={s.key} shortcut={s} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Tip */}
                <div className="rounded-2xl glass p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg grad-warm flex items-center justify-center shrink-0">
                    <span className="text-white text-sm">💡</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pro tip</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Press <Kbd>G</Kbd> then a letter to jump to any section instantly.
                      Use <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search across your entire workspace.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
