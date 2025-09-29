import express from 'express'
import { getOrCreateContainer } from '../db.js'
import logger from '../logger.js'

const router = express.Router()

router.post('/errors', async (req, res) => {
  try {
    const { source, error, context, ts } = req.body || {}
    const container = await getOrCreateContainer('errors')
    const id = `error-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    const doc = {
      id,
      partitionKey: 'error',
      type: 'error',
      data: {
        source: source || 'client',
        error: error || {},
        context: context || null,
        ts: ts || Date.now()
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    try {
      await container.items.create(doc)
      return res.status(201).json({ ok: true, id })
    } catch (err) {
      logger.error('[internalErrors] failed to write error to cosmos', err)
      // still return success to avoid cascading client errors
      return res.status(500).json({ ok: false, error: 'failed to write' })
    }
  } catch (err) {
    logger.error('[internalErrors] handler error', err)
    return res.status(500).json({ ok: false, error: 'internal' })
  }
})

export default router
