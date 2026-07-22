/**
 * TubeFlow AI — Real-time Notifications Mini-Service
 * -------------------------------------------
 * Standalone Bun + socket.io server on port 3030 (hardcoded — no env).
 *
 * Routes:
 *  - GET  /health     → { ok, connections, uptime }
 *  - POST /broadcast  → { userId, notification: {...} }
 *      Emits `notification:new` to every socket registered for that userId.
 *
 * Socket.io:
 *  - path is `/` (default) so the Caddy gateway can forward `?XTransformPort=3030`
 *  - client emits `identify` with `{ userId }` on connect; we map userId -> Set<socketId>
 *
 * Note: CORS is wide-open because the Next.js app and the Caddy gateway both
 * reach this service from different effective origins.
 */

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server, type Socket } from 'socket.io'

// Hardcoded per spec — no env var.
const PORT = 3030

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '256kb' }))

const httpServer = createServer(app)

// Use socket.io's DEFAULT engine.io path (`/socket.io/`).
// We intentionally do NOT set `path: '/'` here, because engine.io's `check()`
// function returns true for ANY URL that starts with the configured path. If
// we set `path: '/'`, every URL on the server (including `/health` and
// `/broadcast`) would be intercepted by engine.io and return "Transport
// unknown". Using the default `/socket.io/` lets our HTTP routes coexist with
// socket.io on the same port — and the frontend `io('/?XTransformPort=3030')`
// connection string uses the default path implicitly, so end-to-end works.
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// userId -> Set<socketId>
const userSockets = new Map<string, Set<string>>()

function registerSocket(userId: string, socketId: string) {
  let set = userSockets.get(userId)
  if (!set) {
    set = new Set()
    userSockets.set(userId, set)
  }
  set.add(socketId)
}

function unregisterSocket(userId: string, socketId: string) {
  const set = userSockets.get(userId)
  if (!set) return
  set.delete(socketId)
  if (set.size === 0) {
    userSockets.delete(userId)
  }
}

function emitToUser(userId: string, event: string, payload: unknown) {
  const set = userSockets.get(userId)
  if (!set || set.size === 0) return 0
  for (const sid of set) {
    io.to(sid).emit(event, payload)
  }
  return set.size
}

// ---------------------------------------------------------------------------
// HTTP routes (internal — Next.js API routes POST here to fan-out to clients)
// ---------------------------------------------------------------------------

let startedAt = Date.now()

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    connections: io.engine.clientsCount,
    users: userSockets.size,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  })
})

interface BroadcastBody {
  userId?: unknown
  notification?: unknown
}

app.post('/broadcast', (req, res) => {
  const body = (req.body ?? {}) as BroadcastBody
  const userId =
    typeof body.userId === 'string' ? body.userId : String(body.userId ?? '')
  const notification = body.notification
  if (!userId || !notification || typeof notification !== 'object') {
    return res
      .status(400)
      .json({ ok: false, error: 'userId and notification are required' })
  }

  const delivered = emitToUser(userId, 'notification:new', notification)
  console.log(
    `[broadcast] user=${userId} delivered=${delivered} title=${
      (notification as { title?: string }).title ?? ''
    }`
  )
  res.json({ ok: true, delivered })
})

// ---------------------------------------------------------------------------
// socket.io — clients register their userId on connect via `identify`
// ---------------------------------------------------------------------------

io.on('connection', (socket: Socket) => {
  console.log(`[socket] connected id=${socket.id}`)

  // Default empty — until client emits `identify`
  let identifiedUserId: string | null = null

  socket.on('identify', (data: unknown) => {
    const payload = (data ?? {}) as { userId?: unknown }
    const userId =
      typeof payload.userId === 'string'
        ? payload.userId
        : String(payload.userId ?? '')

    if (!userId) {
      socket.emit('identify:error', { error: 'userId is required' })
      return
    }

    // If re-identifying, drop the old mapping first.
    if (identifiedUserId) {
      unregisterSocket(identifiedUserId, socket.id)
    }

    identifiedUserId = userId
    registerSocket(userId, socket.id)
    socket.emit('identify:ok', { userId })
    console.log(
      `[socket] identified id=${socket.id} user=${userId} (total=${
        userSockets.get(userId)?.size ?? 0
      })`
    )
  })

  socket.on('disconnect', (reason) => {
    if (identifiedUserId) {
      unregisterSocket(identifiedUserId, socket.id)
      console.log(
        `[socket] disconnected id=${socket.id} user=${identifiedUserId} reason=${reason}`
      )
    } else {
      console.log(`[socket] disconnected id=${socket.id} reason=${reason}`)
    }
  })

  socket.on('error', (err) => {
    console.error(`[socket] error id=${socket.id}`, err)
  })
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  startedAt = Date.now()
  console.log(
    `[tubeflow-notifications-service] listening on http://localhost:${PORT} (socket.io default path /socket.io/, HTTP routes /health + /broadcast)`
  )
})

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[tubeflow-notifications-service] received ${signal}, shutting down...`)
  io.close(() => {
    httpServer.close(() => {
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
