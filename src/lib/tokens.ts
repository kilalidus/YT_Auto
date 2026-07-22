import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

export type TokenType = 'email_verify' | 'password_reset'

interface CreateTokenResult {
  token: string
  expiresAt: Date
}

const TTL_MS: Record<TokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000, // 24h
  password_reset: 60 * 60 * 1000, // 1h
}

/**
 * Generates a 32-byte random hex token, persists a VerificationToken row in
 * the DB with the appropriate expiry, and returns the token + expiry date.
 */
export async function createToken(
  userId: string,
  type: TokenType
): Promise<CreateTokenResult> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TTL_MS[type])

  await db.verificationToken.create({
    data: { userId, token, type, expiresAt },
  })

  return { token, expiresAt }
}

/**
 * Looks up a token by value, validates type + not-expired + not-used,
 * marks it as used, and returns the userId. Returns null if invalid.
 */
export async function consumeToken(
  token: string,
  type: TokenType
): Promise<{ userId: string } | null> {
  const record = await db.verificationToken.findUnique({
    where: { token },
  })

  if (!record) return null
  if (record.type !== type) return null
  if (record.used) return null
  if (record.expiresAt < new Date()) return null

  await db.verificationToken.update({
    where: { id: record.id },
    data: { used: true },
  })

  return { userId: record.userId }
}
