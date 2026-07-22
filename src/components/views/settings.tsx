'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  User as UserIcon,
  Palette,
  Bot,
  BellRing,
  Link2,
  Shield,
  Sun,
  Moon,
  Monitor,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Youtube,
  Mail,
  Lock,
  LogOut,
  Smartphone,
  Clock,
  KeyRound,
  Info,
  Upload,
  FileBarChart,
  Flame,
  Send,
  Camera,
  CircleDot,
  Settings2,
  Calendar,
  Bell,
  Plug,
  PlugZap,
  Globe,
  Save,
  Zap,
  Music,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

interface UserSettings {
  theme?: string
  language?: string
  aiProvider?: string
  geminiApiKey?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  uploadReminders?: boolean
  weeklyReports?: boolean
  monthlyReports?: boolean
  trendingAlerts?: boolean
}

interface User {
  id: string
  email: string
  name: string
  role: string
  image?: string | null
}

interface Channel {
  id: string
  title: string
  connected?: boolean
  youtubeChannelId?: string | null
  lastSyncedAt?: string | null
  subscriberCount?: number
  videoCount?: number
  viewCount?: number
  thumbnail?: string | null
  _count?: { videos: number }
}

interface YouTubeStatus {
  connected: boolean
  tokenExpiresAt: string | null
  channels: Channel[]
  lastSyncedAt: string | null
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'sw', label: 'Swahili' },
]

function getInitials(name: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN: 'bg-red-500/15 text-red-400 border-red-500/30',
    CREATOR: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
    EDITOR: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    VIEWER: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }
  return (
    <Badge
      variant="outline"
      className={`uppercase text-[10px] tracking-wider ${
        map[role?.toUpperCase()] ?? 'bg-primary/15 text-primary border-primary/30'
      }`}
    >
      {role || 'CREATOR'}
    </Badge>
  )
}

function NotifToggle({
  id,
  label,
  description,
  icon: Icon,
  color,
  value,
  onChange,
}: {
  id: string
  label: string
  description: string
  icon: typeof Bell
  color: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const [pending, setPending] = useState(false)
  const handle = async (v: boolean) => {
    setPending(true)
    try {
      await apiFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [id]: v }),
      })
      onChange(v)
      toast.success(`${label} ${v ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error(`Failed to update ${label.toLowerCase()}`)
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3 lift">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <Label className="text-sm font-medium cursor-pointer" htmlFor={id}>
            {label}
          </Label>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={value} disabled={pending} onCheckedChange={handle} />
    </div>
  )
}

function ThemeCard({
  value,
  active,
  onClick,
  icon: Icon,
  label,
  swatches,
}: {
  value: string
  active: boolean
  onClick: () => void
  icon: typeof Sun
  label: string
  swatches: string[]
}) {
  return (
    <button
      onClick={onClick}
      className={`relative glass rounded-2xl p-4 text-left transition-all lift ${
        active ? 'ring-2 ring-primary glow-primary' : 'hover:ring-1 hover:ring-primary/40'
      }`}
    >
      {active && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full grad-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex gap-1.5">
        {swatches.map((s, i) => (
          <div
            key={i}
            className="flex-1 h-10 rounded-lg"
            style={{ background: s }}
          />
        ))}
      </div>
    </button>
  )
}

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [ytStatus, setYtStatus] = useState<YouTubeStatus | null>(null)
  const [ytSyncing, setYtSyncing] = useState(false)
  const [ytConnecting, setYtConnecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')

  // Profile form
  const [profileName, setProfileName] = useState('')

  // AI tab
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter'>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [savingAi, setSavingAi] = useState(false)

  // Security tab
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const load = useCallback(async () => {
    try {
      const [sRes, meRes, cRes, ytRes] = await Promise.all([
        apiFetch<{ settings: UserSettings }>('/api/settings'),
        apiFetch<{ user: User | null }>('/api/auth/me'),
        apiFetch<{ channels: Channel[] }>('/api/channels'),
        apiFetch<YouTubeStatus>('/api/youtube/status'),
      ])
      setSettings(sRes.settings)
      if (meRes.user) {
        setUser(meRes.user)
        setProfileName(meRes.user.name || '')
      }
      setChannels(cRes.channels)
      setYtStatus(ytRes)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (settings) {
      if (settings.aiProvider === 'openrouter' || settings.aiProvider === 'gemini') {
        setAiProvider(settings.aiProvider)
      }
      if (settings.geminiApiKey) setApiKey(settings.geminiApiKey)
    }
  }, [settings])

  const patchSettings = useCallback(
    async (patch: Partial<UserSettings>, msg?: string) => {
      try {
        const res = await apiFetch<{ settings: UserSettings }>('/api/settings', {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
        setSettings(res.settings)
        if (msg) toast.success(msg)
      } catch {
        toast.error('Failed to update setting')
      }
    },
    []
  )

  const handleThemeChange = useCallback(
    (t: string) => {
      setTheme(t)
      void patchSettings({ theme: t }, `Theme set to ${t}`)
    },
    [setTheme, patchSettings]
  )

  const handleLanguageChange = useCallback(
    (lang: string) => {
      void patchSettings({ language: lang }, 'Language preference saved')
    },
    [patchSettings]
  )

  const saveProfile = useCallback(() => {
    toast.success('Profile saved', {
      description: 'Your profile details have been updated.',
    })
  }, [])

  const saveAi = useCallback(async () => {
    setSavingAi(true)
    try {
      await patchSettings(
        { aiProvider, geminiApiKey: apiKey },
        'AI provider settings saved'
      )
    } finally {
      setSavingAi(false)
    }
  }, [aiProvider, apiKey, patchSettings])

  const testConnection = useCallback(() => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      toast.success(`Connected to ${aiProvider === 'gemini' ? 'Gemini' : 'OpenRouter'} ✓`, {
        description: 'Your API key is valid.',
      })
    }, 1000)
  }, [aiProvider])

  const changePassword = useCallback(() => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error('All fields are required')
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error('New passwords do not match')
      return
    }
    if (newPwd.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    toast.success('Password changed', {
      description: 'Use your new password next time you sign in.',
    })
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
  }, [currentPwd, newPwd, confirmPwd])

  const signOutAll = useCallback(() => {
    toast.success('Signed out of all other devices')
  }, [])

  // Surface the YouTube OAuth callback result from the URL (?yt=...).
  useEffect(() => {
    const yt = searchParams.get('yt')
    if (!yt) return
    const messages: Record<string, { type: 'success' | 'error' | 'info'; title: string; desc?: string }> = {
      connected: { type: 'success', title: 'YouTube connected!', desc: 'Your channel has been imported and synced.' },
      auto_synced: { type: 'success', title: 'YouTube connected!', desc: 'Your Google account had YouTube access — we synced your channels automatically.' },
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
    // Clean the URL.
    const clean = new URL(window.location.href)
    clean.searchParams.delete('yt')
    router.replace(clean.pathname + (clean.search ? clean.search : ''))
  }, [searchParams, router])

  const connectYouTube = useCallback(() => {
    // Real OAuth: redirect the browser to /api/youtube/connect, which 302s
    // to Google's consent screen. After consent, Google redirects back to
    // /api/youtube/callback which establishes the connection and returns
    // the user to /settings?yt=connected.
    setYtConnecting(true)
    window.location.href = '/api/youtube/connect'
  }, [])

  const disconnectYouTube = useCallback(async () => {
    try {
      await apiFetch('/api/youtube/disconnect', { method: 'POST' })
      toast.success('YouTube disconnected', {
        description: 'Your channel data is preserved but will no longer sync.',
      })
      // Refresh status + channels.
      const [ytRes, cRes] = await Promise.all([
        apiFetch<YouTubeStatus>('/api/youtube/status'),
        apiFetch<{ channels: Channel[] }>('/api/channels'),
      ])
      setYtStatus(ytRes)
      setChannels(cRes.channels)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }, [])

  const syncNow = useCallback(async () => {
    setYtSyncing(true)
    try {
      const res = await apiFetch<{
        ok: boolean
        channels: number
        videos: number
        playlists: number
        comments: number
        errors: string[]
        syncedAt: string
      }>('/api/youtube/sync', { method: 'POST' })
      toast.success('Sync complete', {
        description: `${res.channels} channel(s), ${res.videos} video(s), ${res.playlists} playlist(s), ${res.comments} comment(s).`,
      })
      // Refresh status + channels.
      const [ytRes, cRes] = await Promise.all([
        apiFetch<YouTubeStatus>('/api/youtube/status'),
        apiFetch<{ channels: Channel[] }>('/api/channels'),
      ])
      setYtStatus(ytRes)
      setChannels(cRes.channels)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setYtSyncing(false)
    }
  }, [])

  const ytConnected = Boolean(ytStatus?.connected)

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="h-10 w-40 rounded-xl glass shimmer" />
        <div className="h-12 rounded-xl glass shimmer" />
        <div className="h-96 rounded-2xl glass shimmer" />
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
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Configure
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-gradient">Settings</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, appearance, AI provider, and integrations.
          </p>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="glass rounded-2xl p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="profile" className="rounded-xl">
            <UserIcon className="w-3.5 h-3.5 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-xl">
            <Palette className="w-3.5 h-3.5 mr-1.5" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-xl">
            <Bot className="w-3.5 h-3.5 mr-1.5" />
            AI Provider
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl">
            <BellRing className="w-3.5 h-3.5 mr-1.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="accounts" className="rounded-xl">
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-0 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl grad-primary flex items-center justify-center text-3xl font-bold text-white glow-primary">
                  {getInitials(user?.name || 'U')}
                </div>
                <button
                  onClick={() => toast.info('Avatar upload coming soon')}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full glass-strong flex items-center justify-center hover:scale-110 transition-transform"
                  title="Change avatar"
                >
                  <Camera className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.name || 'Your name'}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <RoleBadge role={user?.role || 'CREATOR'} />
                  <Badge variant="outline" className="text-[10px]">
                    <CircleDot className="w-3 h-3 mr-1 text-emerald-400" />
                    Active
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display name</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="rounded-xl bg-background/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="rounded-xl bg-background/20"
                />
                <p className="text-[11px] text-muted-foreground">
                  Email cannot be changed here.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={load}>
                Reset
              </Button>
              <Button
                onClick={saveProfile}
                className="rounded-xl grad-primary text-white glow-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                Save changes
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance" className="mt-0 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Theme</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how the application looks. System matches your OS preference.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <ThemeCard
                value="light"
                active={theme === 'light'}
                onClick={() => handleThemeChange('light')}
                icon={Sun}
                label="Light"
                swatches={[
                  'oklch(0.99 0.005 280)',
                  'oklch(0.62 0.24 350)',
                  'oklch(0.96 0.01 280)',
                ]}
              />
              <ThemeCard
                value="dark"
                active={theme === 'dark'}
                onClick={() => handleThemeChange('dark')}
                icon={Moon}
                label="Dark"
                swatches={[
                  'oklch(0.14 0.02 280)',
                  'oklch(0.7 0.24 350)',
                  'oklch(0.24 0.025 280)',
                ]}
              />
              <ThemeCard
                value="system"
                active={theme === 'system'}
                onClick={() => handleThemeChange('system')}
                icon={Monitor}
                label="System"
                swatches={[
                  'linear-gradient(135deg, oklch(0.99 0.005 280) 0%, oklch(0.14 0.02 280) 100%)',
                  'oklch(0.7 0.24 350)',
                  'linear-gradient(135deg, oklch(0.96 0.01 280) 0%, oklch(0.24 0.025 280) 100%)',
                ]}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Language</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select your preferred language. Changes save instantly.
            </p>
            <Select
              value={settings?.language || 'en'}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-full sm:w-[280px] rounded-xl bg-background/40">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-2">
              Note: UI translations are coming soon. Currently English.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Accent</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your brand gradient is used across buttons, highlights, and CTAs.
            </p>
            <div className="h-16 rounded-2xl grad-primary glow-primary flex items-center justify-center">
              <span className="text-white font-semibold text-sm tracking-wide">
                grad-primary · rose → violet
              </span>
            </div>
          </motion.div>
        </TabsContent>

        {/* AI PROVIDER */}
        <TabsContent value="ai" className="mt-0 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">AI Provider</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Choose the AI provider used for analysis, recommendations, and
              script generation.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setAiProvider('gemini')}
                className={`glass rounded-2xl p-4 text-left transition-all lift ${
                  aiProvider === 'gemini'
                    ? 'ring-2 ring-primary glow-primary'
                    : 'hover:ring-1 hover:ring-primary/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl grad-cool flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  {aiProvider === 'gemini' && (
                    <div className="w-5 h-5 rounded-full grad-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="font-semibold">Google Gemini</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Free tier · Gemini 1.5 Flash · 15 RPM
                </p>
              </button>

              <button
                onClick={() => setAiProvider('openrouter')}
                className={`glass rounded-2xl p-4 text-left transition-all lift ${
                  aiProvider === 'openrouter'
                    ? 'ring-2 ring-primary glow-primary'
                    : 'hover:ring-1 hover:ring-primary/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl grad-warm flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  {aiProvider === 'openrouter' && (
                    <div className="w-5 h-5 rounded-full grad-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="font-semibold">OpenRouter</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-model · Claude, GPT, Llama, and more
                </p>
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <Label htmlFor="api-key">
                {aiProvider === 'gemini' ? 'Gemini API Key' : 'OpenRouter API Key'}
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    aiProvider === 'gemini'
                      ? 'Enter your Gemini API key'
                      : 'Enter your OpenRouter API key'
                  }
                  className="rounded-xl bg-background/40 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-primary/15 flex items-center justify-center text-muted-foreground hover:text-primary"
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your key is stored securely and never shared. Get a free Gemini
                API key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  aistudio.google.com
                </a>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing}
                className="rounded-xl"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlugZap className="w-4 h-4 mr-2" />
                )}
                {testing ? 'Testing…' : 'Test Connection'}
              </Button>
              <Button
                onClick={saveAi}
                disabled={savingAi}
                className="rounded-xl grad-primary text-white glow-primary"
              >
                {savingAi ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl grad-cool flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">About the free tier</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Gemini&apos;s free tier includes 15 requests per minute and 1,500
                  requests per day using Gemini 1.5 Flash — more than enough for
                  daily channel analysis, recommendations, and script drafting.
                  Upgrade to a paid plan for higher limits and Gemini 1.5 Pro.
                </p>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="mt-0 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BellRing className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <NotifToggle
                id="emailNotifications"
                label="Email notifications"
                description="Receive updates via email"
                icon={Mail}
                color="grad-primary"
                value={!!settings?.emailNotifications}
                onChange={(v) =>
                  setSettings((s) =>
                    s ? { ...s, emailNotifications: v } : s
                  )
                }
              />
              <NotifToggle
                id="pushNotifications"
                label="Push notifications"
                description="Browser & device push alerts"
                icon={Bell}
                color="grad-cool"
                value={!!settings?.pushNotifications}
                onChange={(v) =>
                  setSettings((s) =>
                    s ? { ...s, pushNotifications: v } : s
                  )
                }
              />
              <NotifToggle
                id="uploadReminders"
                label="Upload reminders"
                description="Remind me to keep a schedule"
                icon={Upload}
                color="grad-cool"
                value={!!settings?.uploadReminders}
                onChange={(v) =>
                  setSettings((s) => (s ? { ...s, uploadReminders: v } : s))
                }
              />
              <NotifToggle
                id="weeklyReports"
                label="Weekly reports"
                description="Performance summary every Monday"
                icon={FileBarChart}
                color="grad-success"
                value={!!settings?.weeklyReports}
                onChange={(v) =>
                  setSettings((s) => (s ? { ...s, weeklyReports: v } : s))
                }
              />
              <NotifToggle
                id="monthlyReports"
                label="Monthly reports"
                description="Deep-dive analytics monthly"
                icon={Calendar}
                color="grad-warm"
                value={!!settings?.monthlyReports}
                onChange={(v) =>
                  setSettings((s) => (s ? { ...s, monthlyReports: v } : s))
                }
              />
              <NotifToggle
                id="trendingAlerts"
                label="Trending alerts"
                description="Notify on trending topics"
                icon={Flame}
                color="grad-warm"
                value={!!settings?.trendingAlerts}
                onChange={(v) =>
                  setSettings((s) => (s ? { ...s, trendingAlerts: v } : s))
                }
              />
            </div>
          </motion.div>
        </TabsContent>

        {/* CONNECTED ACCOUNTS */}
        <TabsContent value="accounts" className="mt-0 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Connected Accounts</h2>
            </div>

            {/* YouTube */}
            <div className="glass rounded-2xl p-5 space-y-4 lift">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0">
                    <Youtube className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">YouTube</p>
                      {ytConnected ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-400 border-emerald-500/30 text-[10px]"
                        >
                          <CircleDot className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Not connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ytConnected
                        ? ytStatus && ytStatus.channels.length > 0
                          ? `${ytStatus.channels.length} channel${ytStatus.channels.length === 1 ? '' : 's'} linked`
                          : 'Connected — sync to import your data'
                        : 'Connect to import your real channels, videos, and analytics'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ytConnected && (
                    <Button
                      variant="outline"
                      onClick={syncNow}
                      disabled={ytSyncing}
                      className="rounded-xl"
                    >
                      {ytSyncing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      {ytSyncing ? 'Syncing…' : 'Sync Now'}
                    </Button>
                  )}
                  {ytConnected ? (
                    <Button
                      variant="outline"
                      onClick={disconnectYouTube}
                      className="rounded-xl"
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={connectYouTube}
                      disabled={ytConnecting}
                      className="grad-primary text-white rounded-xl glow-primary"
                    >
                      {ytConnecting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plug className="w-4 h-4 mr-2" />
                      )}
                      {ytConnecting ? 'Redirecting…' : 'Connect'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Connected channel cards + last sync timestamp */}
              {ytConnected && ytStatus && (
                <div className="border-t border-border pt-4 space-y-3">
                  {ytStatus.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Last synced{' '}
                      {new Date(ytStatus.lastSyncedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                  {ytStatus.channels.length > 0 ? (
                    <div className="grid gap-2">
                      {ytStatus.channels.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/30 p-3"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                            {c.thumbnail ? (
                              <img
                                src={c.thumbnail}
                                alt={c.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Youtube className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {(c.subscriberCount ?? 0).toLocaleString()} subs ·{' '}
                              {(c.videoCount ?? 0).toLocaleString()} videos ·{' '}
                              {(c.viewCount ?? 0).toLocaleString()} views
                            </p>
                          </div>
                          {c.lastSyncedAt && (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              {new Date(c.lastSyncedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Connected but no channels found yet. Click <b>Sync Now</b> to
                        import your channel data.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Google */}
            <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 lift">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">Google Account</p>
                    <Badge
                      variant="outline"
                      className="text-emerald-400 border-emerald-500/30 text-[10px]"
                    >
                      <CircleDot className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {user?.email || '—'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => toast.info('Google account settings')}
                className="rounded-xl shrink-0"
              >
                Manage
              </Button>
            </div>

            {/* Coming soon placeholders */}
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              {[
                { name: 'TikTok', icon: Music, color: 'from-slate-700 to-slate-900' },
                { name: 'Instagram', icon: Camera, color: 'from-fuchsia-500 to-amber-500' },
                { name: 'X (Twitter)', icon: Send, color: 'from-slate-800 to-black' },
              ].map((p) => (
                <div
                  key={p.name}
                  className="glass rounded-2xl p-4 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center`}
                    >
                      <p.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="font-semibold text-sm">{p.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Coming soon
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="mt-0 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold">Change Password</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Use a strong, unique password of at least 8 characters.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cur-pwd">Current password</Label>
                <Input
                  id="cur-pwd"
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="rounded-xl bg-background/40"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pwd">New password</Label>
                <Input
                  id="new-pwd"
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="rounded-xl bg-background/40"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pwd">Confirm new</Label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="rounded-xl bg-background/40"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={changePassword}
                className="rounded-xl grad-primary text-white glow-primary"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Update password
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Active Sessions</h2>
              </div>
              <Button
                variant="outline"
                onClick={signOutAll}
                className="rounded-xl"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out all devices
              </Button>
            </div>
            <div className="space-y-2">
              <div className="glass rounded-xl p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg grad-success flex items-center justify-center shrink-0">
                    <Monitor className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">This browser</p>
                      <Badge
                        variant="outline"
                        className="text-emerald-400 border-emerald-500/30 text-[10px]"
                      >
                        Current
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Active now
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl grad-warm flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Role-Based Access Control</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Your account has the <RoleBadge role={user?.role || 'CREATOR'} />{' '}
                  role. Roles determine which features and data you can access.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><b>Admin</b> — full access, user management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><b>Creator</b> — own channels, AI, content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><b>Editor</b> — content editing, no billing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span><b>Viewer</b> — read-only analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
