import { Router } from 'express'
import jwt from 'jsonwebtoken'
import logger from '../logger.js'
import { loadUserByHeader } from '../middleware/auth.js'
import { getOrCreateContainer } from '../db.js'
import config from '../config.js'
import { callModerationProvider } from '../ai.js'
import { broadcastToRelevant } from '../ws.js'

const router = Router()

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
}

// JWT token functions for short-lived WebSocket tokens
const JWT_SECRET = process.env.MESSAGE_SSE_SECRET || process.env.MESSAGE_SSE_KEY || ''
function signToken(payload: Record<string, any>, expiresInSeconds = 30) {
  if (!JWT_SECRET) throw new Error('Missing MESSAGE_SSE_SECRET')
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: `${expiresInSeconds}s` })
}

function verifyToken(token: string) {
  if (!JWT_SECRET) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any
    return payload
  } catch (err) {
    return null
  }
}

async function persistMessage(msg: any) {
  try {
    const cont = await getOrCreateContainer('messages')
    await cont.items.create(msg)
    return msg
  } catch (err) {
    logger.error('persistMessage failed: %o', err)
    throw err
  }
}

function broadcastMessage(msg: any) {
  const payload = JSON.stringify(msg)
  // deliver to connected WebSocket clients (per-user)
  try { broadcastToRelevant(msg) } catch (e) { /* ignore */ }
}

// Issue short-lived JWT tokens for WebSocket connections
// This endpoint requires an authenticated actor (dev header-based auth currently)
// Token issuance: prefer Authorization Bearer JWT (production). For development, fall back to loadUserByHeader
router.get('/token', async (req, res, next) => {
  try {
    // If Authorization Bearer token is present, validate and extract userId from it.
    const auth = String(req.headers.authorization || '')
    let actorId: string | null = null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const bearer = auth.slice(7).trim()
      try {
        // In production this token should be a proper auth JWT (e.g., from your identity provider).
        const decoded: any = jwt.verify(bearer, process.env.AUTH_JWT_SECRET || '', { algorithms: ['HS256'] })
        actorId = String(decoded?.sub || decoded?.userId || decoded?.id || '')
      } catch (e) {
        logger.warn('Invalid bearer token on /api/messages/token')
      }
    }

    // If no actorId from bearer, fall back to loadUserByHeader (dev) only when NODE_ENV != 'production'
    if (!actorId) {
      if (process.env.NODE_ENV === 'production') return res.status(401).json({ error: 'missing auth' })
      // use dev header-based auth
      try {
        await loadUserByHeader(req as any, res as any, next as any)
        if ((req as any).actor) actorId = String((req as any).actor.id)
      } catch (e) {
        // ignore
      }
    }

    if (!actorId) return res.status(401).json({ error: 'missing actor' })
    const payload = { userId: actorId }
    const token = signToken(payload, 30)
    return res.json({ ok: true, token })
  } catch (err) {
    logger.error('/api/messages/token failed: %o', err)
    return res.status(500).json({ error: 'failed to issue token' })
  }
})

// Refresh token: accept a valid token and issue a new one (only if still valid)
router.post('/token/refresh', async (req, res) => {
  try {
    const { token } = req.body || {}
    if (!token) return res.status(400).json({ error: 'missing token' })
    const payload = verifyToken(String(token))
    if (!payload || !payload.userId) return res.status(401).json({ error: 'invalid token' })
    // issue new token for the same user
    const newToken = signToken({ userId: payload.userId }, 30)
    return res.json({ ok: true, token: newToken })
  } catch (err) {
    logger.error('/api/messages/token/refresh failed: %o', err)
    return res.status(500).json({ error: 'failed to refresh token' })
  }
})

// Note: SSE stream endpoint removed. This server now prefers WebSocket-only connections
// for realtime delivery. Clients should request a short-lived token from GET /api/messages/token
// and connect to the WebSocket server at ws(s)://<host>/?t=TOKEN. The token is verified at
// connection time by the WebSocket server.

// Send a message. Body: { to: string, content: string, rewriteWithAI?: boolean }
// basic in-memory rate limiter and profanity filter (POC only)
const userMessageTimestamps: Record<string, number[]> = {}
const PROFANITY = ['badword', 'curseword', 'damn']
const MAX_PER_MINUTE = 60

router.post('/', loadUserByHeader, async (req, res) => {
  try {
    if (!req.actor) return res.status(401).json({ error: 'missing actor' })
    const actor = req.actor
    const { to, content } = req.body || {}
    if (!to || !content) return res.status(400).json({ error: 'missing to or content' })

    // rate limit per user (simple slide window)
    const now = Date.now()
    const windowStart = now - 60 * 1000
    const arr = userMessageTimestamps[actor.id] || []
    const recent = arr.filter(ts => ts >= windowStart)
    if (recent.length >= MAX_PER_MINUTE) return res.status(429).json({ error: 'rate limit exceeded' })
    recent.push(now)
    userMessageTimestamps[actor.id] = recent

    // AI-based moderation (if configured) or naive profanity fallback. We record moderation
    // metadata on the saved message so admins and auditors can review results.
    let moderation: { ok?: boolean; flagged: boolean; reason?: string; provider?: string; raw?: any } = { ok: true, flagged: false }
    try {
      const mod = await callModerationProvider(String(content))
      if (mod) moderation = { ok: mod.ok !== false, flagged: Boolean(mod.flagged), reason: mod.reason || '', provider: mod.provider || (process.env.AUTOTAG_PROVIDER || process.env.AI_PROVIDER || 'AOAI'), raw: mod.raw || null }
    } catch (e) {
      // if moderation throws, mark as not-ok so we queue for review
      moderation = { ok: false, flagged: false, reason: 'moderation_error', provider: 'unknown', raw: null }
    }

    const baseMeta = { ...moderation, reviewed: false, examinedAt: null }
    let status: 'accepted' | 'blocked' | 'pending_review' = 'accepted'
    if (!moderation.ok) status = 'pending_review'
    else if (moderation.flagged) status = 'blocked'

    const msg = { id: generateId(), type: 'message', from: actor.id, to, content, createdAt: now, moderation: baseMeta, status }
    await persistMessage(msg)

    if (!moderation.ok) {
      // moderation provider failed to produce a reliable result: mark pending and do not broadcast
      return res.status(202).json({ ok: true, status: 'pending_review', message: msg })
    }

    if (moderation.flagged) {
      // flagged: persisted for audit and not broadcast
      return res.status(403).json({ error: 'message blocked by moderation', reason: moderation.reason || 'unspecified' })
    }

    // accepted messages are broadcast to relevant clients
    broadcastMessage(msg)
    return res.json({ ok: true, message: msg })
  } catch (err) {
    logger.error('/api/messages POST failed: %o', err)
    return res.status(500).json({ error: 'failed to send message' })
  }
})

// Get recent messages for the current user (inbox). Query: ?limit=50
router.get('/', loadUserByHeader, async (req, res) => {
  try {
    if (!req.actor) return res.status(401).json({ error: 'missing actor' })
    const actor = req.actor
    const limit = parseInt(String(req.query.limit || '50'), 10) || 50
    const cont = await getOrCreateContainer('messages')
    // simple query for messages where to == userId or from == userId ordered by createdAt desc
    // Use bracket notation for property names that collide with SQL keywords (e.g. 'from')
    const q = {
      query: 'SELECT * FROM c WHERE c.type = @type AND (c["to"] = @id OR c["from"] = @id) ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit',
      parameters: [
        { name: '@type', value: 'message' },
        { name: '@id', value: actor.id },
        { name: '@limit', value: limit }
      ]
    }
    const { resources } = await cont.items.query(q).fetchAll()
    return res.json({ ok: true, messages: resources || [] })
  } catch (err) {
    logger.error('/api/messages GET failed: %o', err)
    return res.status(500).json({ error: 'failed to list messages' })
  }
})

export default router
