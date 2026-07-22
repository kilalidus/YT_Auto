'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Youtube,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  ArrowRight,
  BarChart3,
  Calendar,
  Wand2,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api-client'
import { AuthHero3D } from '@/components/auth/auth-hero-3d'

type Mode = 'login' | 'register'

const features = [
  { icon: Wand2, label: 'AI Script Generator', color: 'text-fuchsia-400' },
  { icon: BarChart3, label: 'Advanced Analytics', color: 'text-emerald-400' },
  { icon: Calendar, label: 'Content Calendar', color: 'text-sky-400' },
  { icon: Sparkles, label: 'Gemini-Powered Insights', color: 'text-amber-400' },
]

// Map server-side auth_error codes to user-friendly toast messages.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    'Google OAuth is not configured on this server. Sign in with email & password instead.',
  denied: 'Google sign-in was cancelled.',
  google_error: 'Google returned an error. Please try again.',
  invalid_callback: 'Invalid Google callback. Please try again.',
  state_mismatch:
    'Security check failed (state mismatch). Please try signing in with Google again.',
  token_exchange_failed:
    'Could not complete Google sign-in. Please try again or use email & password.',
  session_failed: 'Could not create a session. Please try again.',
}

export function AuthScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Forgot-password dialog state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotDemoLink, setForgotDemoLink] = useState<string | null>(null)

  // Surface auth_error from the Google OAuth callback redirect.
  useState(() => {
    const err = searchParams.get('auth_error')
    if (err) {
      const msg = AUTH_ERROR_MESSAGES[err] || 'Authentication error. Please try again.'
      toast.error(msg)
      // Clean the URL so the toast doesn't re-appear on refresh.
      const clean = new URL(window.location.href)
      clean.searchParams.delete('auth_error')
      window.history.replaceState({}, '', clean.toString())
    }
  })

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    setForgotDemoLink(null)
    try {
      const data = await apiFetch<{ ok: boolean; demoLink?: string }>(
        '/api/auth/request-reset',
        {
          method: 'POST',
          body: JSON.stringify({ email: forgotEmail || email }),
        }
      )
      if (data.demoLink) {
        // Sandbox-only: surface the reset link so the user can "click the email link"
        // In production this would be sent via SMTP and the demoLink field would not be returned.
        toast.success('Reset link generated', {
          description: data.demoLink,
        })
        setForgotDemoLink(data.demoLink)
      } else {
        toast.success(
          'If an account exists for that email, a reset link is on its way.'
        )
        setForgotOpen(false)
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to request reset link'
      )
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        // 1. Create the user in the DB (real bcrypt-hashed password).
        await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        })
        // 2. Sign in with the same credentials to establish the session.
        await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        toast.success('Welcome to TubeFlow AI!')
      } else {
        // Real login — validates email + password against the DB with bcrypt.
        // Throws ApiError with status 401 if credentials are invalid; the
        // apiFetch wrapper surfaces the server's error message ("Invalid
        // email or password") to the toast below.
        await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        toast.success('Welcome back!')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    // Real Google OAuth — redirect the browser to /api/auth/google/login,
    // which 302s to Google's consent screen. After consent, Google redirects
    // back to /api/auth/google/callback which establishes the session and
    // sends the user back to /.
    setGoogleLoading(true)
    window.location.href = '/api/auth/google/login'
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* 3D animated hero backdrop (React Three Fiber) */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-90">
        <AuthHero3D />
      </div>
      {/* Soft vignette so the form panel reads clearly on top of the 3D scene */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/20 to-background/70 pointer-events-none" />
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left — brand showcase */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="hidden lg:flex flex-col gap-8"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 grad-primary blur-xl opacity-60" />
              <div className="relative w-14 h-14 rounded-2xl grad-primary flex items-center justify-center shadow-lg">
                <Youtube className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TubeFlow AI</h1>
              <p className="text-sm text-muted-foreground">YouTube Workflow & Content Studio</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-bold leading-tight">
              Your entire YouTube workflow,{' '}
              <span className="text-shimmer">supercharged by AI</span>.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Plan, script, schedule, analyze and grow — all in one premium
              studio powered by Gemini.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass rounded-2xl p-4 flex items-center gap-3 lift"
              >
                <div className="w-10 h-10 rounded-xl bg-background/40 flex items-center justify-center">
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <span className="text-sm font-medium">{f.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['bg-fuchsia-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500'].map(
                  (c, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full ${c} border-2 border-background`}
                    />
                  )
                )}
              </div>
              <span>Join 12,000+ creators</span>
            </div>
          </div>
        </motion.div>

        {/* Right — auth form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="glass-strong rounded-3xl p-8 sm:p-10 shadow-2xl"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl grad-primary flex items-center justify-center">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TubeFlow AI</h1>
              <p className="text-xs text-muted-foreground">YouTube Studio</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {mode === 'login' ? 'Welcome back' : 'Create your studio'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login'
                ? 'Sign in to continue to your workspace.'
                : 'Start managing your YouTube workflow in seconds.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Creator"
                      className="pl-9 h-11"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-11"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email)
                      setForgotDemoLink(null)
                      setForgotOpen(true)
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 grad-primary text-white font-semibold rounded-xl shadow-lg glow-primary hover:shadow-xl transition-all group"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-3 text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full h-11 rounded-xl"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-semibold text-primary hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Forgot password dialog */}
      <Dialog
        open={forgotOpen}
        onOpenChange={(o) => {
          setForgotOpen(o)
          if (!o) setForgotDemoLink(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg grad-primary flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-white" />
              </span>
              Reset your password
            </DialogTitle>
            <DialogDescription>
              Enter your account email and we&apos;ll send you a link to reset
              your password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 h-11"
                  required
                  autoFocus
                />
              </div>
            </div>

            {forgotDemoLink && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Reset link (sandbox only — in production this would be emailed)
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setForgotOpen(false)
                    router.push(forgotDemoLink)
                  }}
                  className="w-full h-10 grad-primary text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Click here to reset your password
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                disabled={forgotLoading}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={forgotLoading}
                className="grad-primary text-white font-semibold rounded-xl inline-flex items-center gap-2"
              >
                {forgotLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Send reset link
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
