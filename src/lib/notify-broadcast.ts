/**
 * Server-side fire-and-forget helper that asks the standalone notifications
 * mini-service (Bun + socket.io on port 3030) to broadcast a new notification
 * to the relevant user's connected clients.
 *
 * CRITICAL: this MUST stay fire-and-forget. If the mini-service is down or
 * slow, API routes that create notifications should NOT be blocked or fail.
 * We swallow all errors and never await the fetch in caller code paths.
 *
 * The mini-service then emits `notification:new` over socket.io to every
 * socket registered with that userId.
 */

export interface BroadcastNotificationPayload {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

const NOTIFY_SERVICE_URL = 'http://localhost:3030/broadcast'

/**
 * Fire-and-forget POST to the notifications mini-service.
 * Safe to call from server code (API routes, server actions). Never throws.
 */
export function broadcastNotification(
  userId: string,
  notification: BroadcastNotificationPayload
): void {
  // We deliberately do NOT return the promise to the caller — they should
  // not be tempted to await it. But we still attach handlers to prevent
  // unhandled-rejection warnings.
  const p = (async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(NOTIFY_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notification }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn(
          `[notify-broadcast] mini-service responded ${res.status}: ${text}`
        )
      }
    } catch (err) {
      // Mini-service is down or unreachable — log + swallow so the API
      // route that created the notification is unaffected.
      console.warn(
        `[notify-broadcast] failed to reach notifications mini-service:`,
        err instanceof Error ? err.message : err
      )
    }
  })()

  // Prevent unhandled-rejection if the caller discards the sync return.
  void p.catch(() => {})
}
