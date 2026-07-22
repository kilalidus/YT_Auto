import { getSessionUser } from '@/lib/auth'
import { AuthScreen } from '@/components/auth/auth-screen'
import { AppShell } from '@/components/app/app-shell'
import { ResetPasswordScreen } from '@/components/auth/reset-password-screen'
import { VerifyEmailScreen } from '@/components/auth/verify-email-screen'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; mode?: string }>
}) {
  const params = await searchParams
  const mode = params.mode
  const token = params.token

  // Public password-reset screen — no auth required.
  if (mode === 'reset-password') {
    return <ResetPasswordScreen token={token ?? ''} />
  }

  // Public email-verification screen — no auth required (it verifies on mount).
  if (mode === 'verify-email') {
    return <VerifyEmailScreen token={token ?? ''} />
  }

  const user = await getSessionUser()

  if (!user) {
    return <AuthScreen />
  }

  return <AppShell user={user} />
}
