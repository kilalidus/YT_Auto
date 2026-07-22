'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Youtube,
  MailCheck,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-client'

type Status = 'verifying' | 'success' | 'error'

interface VerifyEmailScreenProps {
  token: string
}

export function VerifyEmailScreen({ token }: VerifyEmailScreenProps) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token was provided in the link.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await apiFetch('/api/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        })
        if (!cancelled) {
          setStatus('success')
          toast.success('Email verified successfully')
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'This verification link is invalid or has expired.'
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

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
            <p className="text-xs text-muted-foreground">Email verification</p>
          </div>
        </div>

        {status === 'verifying' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-full grad-primary flex items-center justify-center mx-auto glow-primary">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Verifying your email…</h2>
              <p className="text-sm text-muted-foreground">
                Hang tight — we&apos;re confirming your email address.
              </p>
            </div>
          </motion.div>
        )}

        {status === 'success' && (
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
              <h2 className="text-2xl font-bold">Email verified!</h2>
              <p className="text-sm text-muted-foreground">
                Your email address has been confirmed. You can now access all
                features of your workspace.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.refresh()}
              className="w-full h-11 grad-primary text-white font-semibold rounded-xl shadow-lg glow-primary inline-flex items-center justify-center gap-2"
            >
              Continue to dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {status === 'error' && (
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
              <h2 className="text-2xl font-bold">Verification failed</h2>
              <p className="text-sm text-muted-foreground">
                {errorMsg ||
                  'This verification link is invalid, has already been used, or has expired.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push('/')}
              className="w-full h-11 grad-primary text-white font-semibold rounded-xl shadow-lg glow-primary inline-flex items-center justify-center gap-2"
            >
              <MailCheck className="w-4 h-4" />
              Back to sign in
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
