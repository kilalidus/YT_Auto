'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/app/sidebar'
import { Topbar } from '@/components/app/topbar'
import { SearchModal } from '@/components/app/search-modal'
import { AnimatedBackground } from '@/components/app/animated-bg'
import { AiChatAssistant } from '@/components/app/ai-chat-assistant'
import { KeyboardShortcuts } from '@/components/app/keyboard-shortcuts'
import { DashboardView } from '@/components/views/dashboard'
import { ChannelsView } from '@/components/views/channels'
import { AnalysisView } from '@/components/views/analysis'
import { RecommendationsView } from '@/components/views/recommendations'
import { IdeaLabView } from '@/components/views/idea-lab'
import { ScriptGeneratorView } from '@/components/views/script-generator'
import { WorkflowView } from '@/components/views/workflow'
import { PlannerView } from '@/components/views/planner'
import { NotesView } from '@/components/views/notes'
import { AnalyticsView } from '@/components/views/analytics'
import { FilesView } from '@/components/views/files'
import { CommunityView } from '@/components/views/community'
import { NotificationsView } from '@/components/views/notifications'
import { SettingsView } from '@/components/views/settings'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { EmailVerificationBanner } from '@/components/app/email-verification-banner'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  image?: string | null
  emailVerified?: boolean
}

function fetchUnread(): Promise<number> {
  return apiFetch<{ notifications: Array<{ read: boolean }> }>('/api/notifications')
    .then((d) => d.notifications.filter((n) => !n.read).length)
    .catch(() => 0)
}

export function AppShell({ user }: { user: User }) {
  const { view } = useAppStore()
  const [unread, setUnread] = useState(0)
  const [notifTick, setNotifTick] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Global YouTube OAuth callback handler. The Google sign-in callback and
  // the YouTube connect callback both redirect to /?yt=<status>. We surface
  // a toast here (regardless of which view is mounted) and then clean the URL.
  useEffect(() => {
    const yt = searchParams.get('yt')
    if (!yt) return
    const messages: Record<string, { type: 'success' | 'error' | 'info'; title: string; desc?: string }> = {
      auto_synced: { type: 'success', title: 'YouTube connected!', desc: 'Your Google account had YouTube access — channels synced automatically.' },
      connected: { type: 'success', title: 'YouTube connected!', desc: 'Your channel has been imported and synced.' },
      partial: { type: 'info', title: 'Channel connected (partial sync)', desc: 'Initial sync failed — use Sync Now to retry.' },
      denied: { type: 'error', title: 'Connection cancelled', desc: 'You declined the Google consent prompt.' },
      not_configured: { type: 'error', title: 'Not configured', desc: 'Google OAuth credentials are missing on the server.' },
      auth_required: { type: 'error', title: 'Sign in required', desc: 'Please sign in before connecting YouTube.' },
      state_mismatch: { type: 'error', title: 'Security check failed', desc: 'State mismatch — please try again.' },
      token_exchange_failed: { type: 'error', title: 'Authorization failed', desc: 'Could not exchange the code for tokens.' },
      invalid_callback: { type: 'error', title: 'Invalid callback', desc: 'Missing code or state parameter.' },
      error: { type: 'error', title: 'Connection failed', desc: 'Please try again.' },
    }
    const m = messages[yt] || messages.error
    if (m.type === 'success') toast.success(m.title, { description: m.desc })
    else if (m.type === 'info') toast.info(m.title, { description: m.desc })
    else toast.error(m.title, { description: m.desc })
    const clean = new URL(window.location.href)
    clean.searchParams.delete('yt')
    router.replace(clean.pathname + (clean.search ? clean.search : ''))
  }, [searchParams, router])

  // Wire up realtime socket — shows sonner toasts + dispatches the
  // `tf:notification:new` CustomEvent on window.
  const { isConnected } = useRealtimeNotifications()

  // Initial + view-change refetch of unread count.
  useEffect(() => {
    fetchUnread().then(setUnread)
  }, [view])

  // Bump unread + invalidate topbar popover state when a realtime
  // notification arrives.
  useEffect(() => {
    function onNew() {
      setUnread((u) => u + 1)
      setNotifTick((t) => t + 1)
    }
    window.addEventListener('tf:notification:new', onNew as EventListener)
    return () =>
      window.removeEventListener('tf:notification:new', onNew as EventListener)
  }, [])

  // When a new realtime notification arrives, refetch /api/notifications so
  // the count is accurate and any dedup / server-side state is reconciled.
  // (Deferred slightly so the DB write has flushed.)
  useEffect(() => {
    if (notifTick === 0) return
    const t = setTimeout(() => {
      fetchUnread().then(setUnread)
    }, 400)
    return () => clearTimeout(t)
  }, [notifTick])

  const handleMarkAllRead = useCallback(() => setUnread(0), [])

  return (
    <div className="relative min-h-screen flex">
      <AnimatedBackground />
      <Sidebar unreadCount={unread} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          notifTick={notifTick}
          realtimeConnected={isConnected}
          onUnreadCleared={handleMarkAllRead}
        />
        <main className="flex-1 overflow-y-auto scroll-styled">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="min-h-full"
            >
              {user.emailVerified === false && (
                <div className="px-4 pt-4 sm:px-6 sm:pt-6 max-w-[1600px] mx-auto">
                  <EmailVerificationBanner userId={user.id} />
                </div>
              )}
              {view === 'dashboard' && <DashboardView />}
              {view === 'channels' && <ChannelsView />}
              {view === 'analysis' && <AnalysisView />}
              {view === 'recommendations' && <RecommendationsView />}
              {view === 'idea-lab' && <IdeaLabView />}
              {view === 'script' && <ScriptGeneratorView />}
              {view === 'workflow' && <WorkflowView />}
              {view === 'planner' && <PlannerView />}
              {view === 'notes' && <NotesView />}
              {view === 'analytics' && <AnalyticsView />}
              {view === 'files' && <FilesView />}
              {view === 'community' && <CommunityView />}
              {view === 'notifications' && <NotificationsView />}
              {view === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <SearchModal />
      <AiChatAssistant />
      <KeyboardShortcuts />
    </div>
  )
}
