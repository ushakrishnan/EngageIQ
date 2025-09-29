import WebSocket, { WebSocketServer } from 'ws'
import { createServer } from 'http'
import url from 'url'
import jwt from 'jsonwebtoken'
import logger from './logger.js'

const JWT_SECRET = process.env.MESSAGE_SSE_SECRET || process.env.MESSAGE_SSE_KEY || ''

// Map userId -> Set<WebSocket>
const clients: Map<string, Set<WebSocket>> = new Map()
let wss: WebSocketServer | null = null

export function initWebSocketServer(httpServer: any) {
  if (!JWT_SECRET) {
    logger.warn('WebSocket server started without MESSAGE_SSE_SECRET; connections requiring tokens will fail')
  }
  wss = new WebSocketServer({ server: httpServer })
  wss.on('connection', (ws: WebSocket, req: any) => {
    try {
      const q = url.parse(req.url || '', true).query
      const token = String(q.t || '')
      let userId = ''

      function fail(code: number, reason: string) {
        try { ws.close(code, reason) } catch (_) {}
      }

      const verifyAndRegister = (tok: string) => {
        try {
          const payload: any = jwt.verify(tok, JWT_SECRET, { algorithms: ['HS256'] })
          const uid = String(payload.userId || '')
          if (!uid) return null
          let set = clients.get(uid)
          if (!set) { set = new Set(); clients.set(uid, set) }
          set.add(ws)
          userId = uid
          ws.on('close', () => {
            const s = clients.get(userId)
            if (s) { s.delete(ws); if (s.size === 0) clients.delete(userId) }
          })
          return uid
        } catch (e) {
          return null
        }
      }

      if (token) {
        const registered = verifyAndRegister(token)
        if (!registered) { fail(4002, 'invalid token'); return }
        return
      }

      // No token in query param: allow initial auth handshake message within 5s
      let authed = false
      const authTimeout = setTimeout(() => {
        if (!authed) fail(4001, 'missing token')
      }, 5000)

      const onMessage = (data: WebSocket.Data) => {
        if (authed) return
        try {
          const txt = typeof data === 'string' ? data : data.toString()
          const parsed = JSON.parse(txt)
          if (parsed && parsed.type === 'auth' && parsed.token) {
            const reg = verifyAndRegister(String(parsed.token))
            if (reg) {
              authed = true
              clearTimeout(authTimeout)
              ws.removeEventListener('message', onMessage as any)
              return
            } else {
              fail(4002, 'invalid token')
            }
          }
        } catch (e) {
          // ignore and wait for auth
        }
      }

      ws.addEventListener('message', onMessage as any)
    } catch (err) {
      logger.error('WebSocket connection error: %o', err)
      try { ws.close(1011, 'server error') } catch (_) {}
    }
  })

  logger.info('WebSocket server initialized')
}

export function sendToUser(userId: string, msg: any) {
  const set = clients.get(userId)
  if (!set) return
  const payload = JSON.stringify(msg)
  for (const ws of set) {
    try { ws.send(payload) } catch (e) {
      // ignore
    }
  }
}

export function broadcastToRelevant(msg: any) {
  // send to from and to if present
  if (msg && msg.to) sendToUser(String(msg.to), msg)
  if (msg && msg.from) sendToUser(String(msg.from), msg)
}
