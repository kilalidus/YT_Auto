'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Youtube,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api-client'

type Status = 'form' | 'submitting' | 'success' | 'error'

interface ResetPasswordScreenProps {
  token: string
}

export function ResetPasswordScreen({ token }: ResetPasswordScreenProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [status, setStatus] = useState<Status>('form')
  const [errorMsg, setErrorMsg] = useState('')

  // Quick client-side guard: empty token → error state immediately
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No reset token was provided in the link.')
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setStatus('submitting')
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      })
      setStatus('success')
      toast.success('Password reset successfully')
    } catch (err) {
      setStatus('error')
      const msg =
        err instanceof Error ? err.message : 'This reset link is invalid or expired.'
      setErrorMsg(msg)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="glass-strong rounded-3xl p-8 sm:p-10 shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl grad-primary flex items-center justify-center">
            <Youtube className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">TubeFlow AI</h1>
            <p className="text-xs text-muted-foreground">Reset password</p>
          </div>
        </div>

        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-4 space-y-5"
          >
            <div className="w-16 h-16 rounded-full grad-success flex items-center justify-center mx-auto glow-success">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Password reset</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been reset successfully. Please sign in with
                your new password to continue.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push('/')}
              className="w-full h-11 grad-primary text-white font-semibold rounded-xl shadow-lg glow-primary inline-flex items-center justify-center gap-2"
            >
              Back to sign in
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : status === 'error' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-4 space-y-5"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Link invalid or expired</h2>
              <p className="text-sm text-muted-foreground">
                {errorMsg ||
                  'This reset link is invalid, has already been used, or has expired.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push('/')}
              className="w-full h-11 grad-primary text-white font-semibold rounded-xl shadow-lg glow-primary inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Request a new link
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Set a new password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a strong password — minimum 6 characters.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-11"
                    required
                    minLength={6}
                    autoFocus
                    autoComplete="new-password"
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 h-11"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full h-11 grad-primary text-white font-semibold rounded-xl shadow-lg glow-primary hover:shadow-xl transition-all group inline-flex items-center justify-center gap-2"
              >
                {status === 'submitting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Reset password
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to sign in
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
