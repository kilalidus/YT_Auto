'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MailCheck,
  X,
  Loader2,
  Send,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api-client'

interface EmailVerificationBannerProps {
  userId: string
}

/**
 * Dismissible amber banner shown at the top of the main content area when the
 * signed-in user has not yet verified their email. Surfaces a "Resend
 * verification email" button — since this sandbox has no real email sending,
 * the demo link is returned from the API and shown inline as a clickable
 * pill + a manual token-input form so the user can complete verification.
 */
export function EmailVerificationBanner({ userId }: EmailVerificationBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [demoLink, setDemoLink] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [verifying, setVerifying] = useState(false)

  async function handleSend() {
    setSending(true)
    try {
      const data = await apiFetch<{
        ok: boolean
        demoLink?: string
        alreadyVerified?: boolean
      }>('/api/auth/send-verification', { method: 'POST' })
      if (data.alreadyVerified) {
        toast.success('Your email is already verified.')
        router.refresh()
        return
      }
      if (data.demoLink) {
        toast.success('Verification link generated', {
          description: data.demoLink,
        })
        setDemoLink(data.demoLink)
        setShowManual(true)
      } else {
        toast.success('Verification email sent.')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to send verification email'
      )
    } finally {
      setSending(false)
    }
  }

  async function handleManualVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!manualToken.trim()) return
    setVerifying(true)
    try {
      await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: manualToken.trim() }),
      })
      toast.success('Email verified successfully')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Invalid or expired verification token'
      )
    } finally {
      setVerifying(false)
    }
  }

  // userId is referenced to keep the banner tied to the signed-in user
  void userId

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="glass rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <MailCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Please verify your email address to unlock all features
                    </p>
                    <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
                      We sent a verification link when you signed up. Need a new
                      one? Click below.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    aria-label="Dismiss banner"
                    className="text-amber-700/70 dark:text-amber-300/70 hover:text-amber-900 dark:hover:text-amber-100 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSend}
                    disabled={sending}
                    className="h-9 grad-primary text-white font-medium rounded-lg inline-flex items-center gap-2"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Resend verification email
                  </Button>

                  {demoLink && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(demoLink)}
                      className="h-9 rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Demo: click here to verify
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowManual((s) => !s)}
                    className="text-xs font-medium text-amber-800/70 dark:text-amber-200/70 hover:text-amber-900 dark:hover:text-amber-100 transition-colors px-2"
                  >
                    {showManual ? 'Hide manual entry' : 'Enter token manually'}
                  </button>
                </div>

                {showManual && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onSubmit={handleManualVerify}
                    className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end"
                  >
                    <div className="flex-1 space-y-1.5">
                      <Label
                        htmlFor="manual-token"
                        className="text-xs text-amber-800 dark:text-amber-200"
                      >
                        Verification token
                      </Label>
                      <Input
                        id="manual-token"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="Paste your token here…"
                        className="h-9 rounded-lg bg-background/60 font-mono text-xs"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={verifying || !manualToken.trim()}
                      className="h-9 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 inline-flex items-center gap-2"
                    >
                      {verifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Verify
                    </Button>
                  </motion.form>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
