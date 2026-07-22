'use client'

/**
 * use-realtime-notifications
 * -------------------------
 * Connects to the TubeFlow AI notifications mini-service (socket.io on port
 * 3030, reached via the Caddy gateway using `?XTransformPort=3030`).
 *
 * Responsibilities:
 *  - On mount, fetch the current user id via /api/auth/me, then connect to
 *    socket.io and emit `identify` so the server can route notifications
 *    to this client.
 *  - Listen for `notification:new` events.
 *  - On each new notification:
 *      * show a sonner toast with the title/message
 *      * dispatch a `tf:notification:new` CustomEvent on window so the
 *        AppShell + Topbar can bump their unread counts and refetch.
 *  - Auto-reconnect handled by socket.io-client (default reconnection=true).
 *
 * CRITICAL: never use `http://localhost:3030` directly — always
 * `io('/?XTransformPort=3030')` so the request goes through Caddy.
 */

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'

export interface RealtimeNotification {
  id: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

export interface UseRealtimeNotificationsResult {
  isConnected: boolean
  lastNotification: RealtimeNotification | null
}

const SOCKET_URL = '/?XTransformPort=3030'

export function useRealtimeNotifications(): UseRealtimeNotificationsResult {
  const [isConnected, setIsConnected] = useState(false)
  const [lastNotification, setLastNotification] =
    useState<RealtimeNotification | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    let cancelled = false
    let socket: Socket | null = null

    async function init() {
      // 1. Identify the current user.
      let userId: string | null = null
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) {
          const data = (await res.json()) as {
            user?: { id?: string } | null
          }
          userId = data?.user?.id ?? null
        }
      } catch {
        // ignore — we'll just not identify; no realtime notifications.
      }

      if (cancelled || !userId) return

      // 2. Connect to the socket.io server via the Caddy gateway.
      //    NEVER use http://localhost:3030 directly.
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
      })
      socketRef.current = socket

      socket.on('connect', () => {
        setIsConnected(true)
        // Tell the server which user this socket belongs to.
        socket!.emit('identify', { userId })
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
      })

      socket.on('reconnect', () => {
        // Re-identify after reconnect so the server's userId→socketId map is
        // repopulated for the new socket id.
        socket!.emit('identify', { userId })
      })

      socket.on('notification:new', (n: RealtimeNotification) => {
        setLastNotification(n)
        // Toast the user.
        toast(n.title, {
          description: n.message,
          duration: 6000,
        })
        // Let the AppShell / Topbar / Sidebar react.
        window.dispatchEvent(
          new CustomEvent('tf:notification:new', { detail: n })
        )
      })

      socket.on('connect_error', (err) => {
        // Quiet — the mini-service may be down; we'll retry automatically.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[use-realtime-notifications] connect_error', err.message)
        }
      })
    }

    init()

    return () => {
      cancelled = true
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
      }
      socketRef.current = null
      setIsConnected(false)
    }
  }, [])

  return { isConnected, lastNotification }
}
