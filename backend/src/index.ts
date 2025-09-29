import express from 'express'
import bodyParser from 'body-parser'
import adminRoutes from './routes/admin.js'
import identifyActor from './middleware/identifyActor.js'
import { requireEngageIQAdmin } from './middleware/auth.js'
import auditLogger from './middleware/auditLogger.js'
import internalErrors from './routes/internalErrors.js'
import itemsRouter from './routes/items.js'
import messagesRouter from './routes/messages.js'
import logger from './logger.js'
import config from './config.js'
import { metricsHandler, readiness } from './metrics.js'
import { ensureContainersExist } from './db.js'
import { createServer } from 'http'
import { initWebSocketServer } from './ws.js'

const app = express()
app.use(bodyParser.json())

// Allow cross-origin calls for the admin endpoint (development only)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  // Do not expose dev-only x-user-id header in production
  const allowHeaders = process.env.NODE_ENV === 'production' ? 'Content-Type, Authorization' : 'Content-Type, x-user-id, Authorization'
  res.setHeader('Access-Control-Allow-Headers', allowHeaders)
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// readiness: a lightweight readiness check
app.get('/ready', async (req, res) => {
  const r = await readiness()
  if (r.ok) return res.json({ ok: true })
  return res.status(500).json({ ok: false, error: r.error })
})

// metrics endpoint for Prometheus scraping
app.get('/metrics', metricsHandler)


// admin routes: audit + require authenticated actor and admin role
if (process.env.ADMIN_ENABLED === 'true') {
  app.use('/admin', auditLogger, identifyActor, requireEngageIQAdmin, adminRoutes)
} else {
  // do not mount admin routes by default; require explicit opt-in
  console.warn('ADMIN routes disabled; set ADMIN_ENABLED=true to enable /admin')
}
// internal endpoints used by client for dev-safe operations
app.use('/internal', internalErrors)

// items API routes
app.use('/api/items', itemsRouter)
// messages API routes
app.use('/api/messages', messagesRouter)

const port = config.port || 4000
ensureContainersExist()
  .then(() => logger.info('[db] required containers ensured'))
  .catch((err) => logger.error('[db] ensureContainersExist failed', err))
  .finally(() => {
    const server = createServer(app)
    initWebSocketServer(server)
    server.listen(port, () => {
      logger.info({ msg: `EngageIQ admin server listening on port ${port}` })
    })
  })

export default app
