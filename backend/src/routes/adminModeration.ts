import { Router } from 'express'
import logger from '../logger.js'
import { loadUserByHeader, requireEngageIQAdmin } from '../middleware/auth.js'
import { getOrCreateContainer } from '../db.js'
import { broadcastToRelevant } from '../ws.js'

const router = Router()

/**
 * Admin Moderation API
 *
 * Pagination: This endpoint supports Cosmos-style continuation tokens for efficient, scalable paging.
 * - Use `?limit=<n>&continuationToken=<token>` to fetch the next page.
 * - For backward compatibility, `?limit=<n>&offset=<m>` is still supported but **not recommended** for large datasets.
 *
 * Audit docs: moderation actions write an audit record to the `audit` container with this schema:
 * {
 *   id: string,                // unique audit id
 *   type: 'audit',
 *   action: string,           // e.g. 'moderation.approve' or 'moderation.block'
 *   admin: string,            // admin id who performed action
 *   messageId: string,        // id of the moderated message
 *   before: object,           // optional snapshot of previous state (e.g. { status: 'pending_review' })
 *   after: object,            // optional snapshot of new state (e.g. { status: 'accepted' })
 *   note: string | null,      // optional review note
 *   createdAt: number         // epoch ms
 * }
 *
 * Retention policy (recommendation): store audits for an initial period (e.g. 90 days) in the `audit` container.
 * - For long-term retention, export audits to an immutable archive (cold storage) and remove from the live container.
 * - Optionally add a TTL index on the `createdAt` field or a Cosmos TTL policy to auto-expire older audit docs.
 */
// List moderation queue: pending_review or blocked
router.get('/', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'pending_review')
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10)))
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10))
    const continuationToken = typeof req.query.continuationToken === 'string' ? req.query.continuationToken : undefined
    const cont = await getOrCreateContainer('messages')

    // If a continuation token is provided, use Cosmos continuation-style paging for efficiency.
    if (continuationToken) {
      const q = {
        query: status === 'all' ? 'SELECT * FROM c WHERE c.type = @type AND (c.status = "pending_review" OR c.status = "blocked") ORDER BY c.createdAt DESC' : 'SELECT * FROM c WHERE c.type = @type AND c.status = @status ORDER BY c.createdAt DESC',
        parameters: status === 'all' ? [ { name: '@type', value: 'message' } ] : [ { name: '@type', value: 'message' }, { name: '@status', value: status } ]
      }
      const iterator = cont.items.query(q, { maxItemCount: limit, continuationToken })
      const { resources, continuationToken: nextToken } = await iterator.fetchNext()
      return res.json({ ok: true, messages: resources || [], continuationToken: nextToken })
    }

    // Backward-compatible offset/limit path (less efficient for large collections)
    let q
    if (status === 'all') {
      q = {
        query: 'SELECT * FROM c WHERE c.type = @type AND (c.status = "pending_review" OR c.status = "blocked") ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [ { name: '@type', value: 'message' }, { name: '@offset', value: offset }, { name: '@limit', value: limit } ]
      }
    } else {
      q = {
        query: 'SELECT * FROM c WHERE c.type = @type AND c.status = @status ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit',
        parameters: [ { name: '@type', value: 'message' }, { name: '@status', value: status }, { name: '@offset', value: offset }, { name: '@limit', value: limit } ]
      }
    }

    const { resources } = await cont.items.query(q).fetchAll()
    return res.json({ ok: true, messages: resources || [], limit, offset })
  } catch (err) {
    logger.error('/admin/moderation GET failed: %o', err)
    return res.status(500).json({ ok: false, error: 'failed to query moderation queue' })
  }
})

// Approve a message (release to recipients)
router.post('/:id/approve', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const id = req.params.id
    if (!id) return res.status(400).json({ error: 'missing id' })
    const cont = await getOrCreateContainer('messages')
    const { resource } = await cont.item(id, id).read()
    if (!resource) return res.status(404).json({ error: 'not found' })

    resource.status = 'accepted'
    resource.moderation = resource.moderation || {}
    resource.moderation.reviewed = true
    resource.moderation.reviewedBy = (req as any).actor?.id || 'admin'
    resource.moderation.reviewedAt = Date.now()
    resource.moderation.reviewNote = (req.body && req.body.note) || null

    await cont.items.upsert(resource)

    // write audit record
    try {
      const audit = await getOrCreateContainer('audit')
      const auditDoc = { id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, type: 'audit', action: 'moderation.approve', admin: (req as any).actor?.id || 'admin', messageId: resource.id, before: { status: 'pending_review' }, after: { status: 'accepted' }, note: resource.moderation.reviewNote || null, createdAt: Date.now() }
      await audit.items.create(auditDoc)
    } catch (e) { logger.warn('failed to write audit record for moderation approve: %o', e) }

    // broadcast the approved message to relevant users
    try { broadcastToRelevant(resource) } catch (e) { /* ignore */ }

    return res.json({ ok: true, message: resource })
  } catch (err) {
    logger.error('/admin/moderation/:id/approve failed: %o', err)
    return res.status(500).json({ ok: false, error: 'failed to approve message' })
  }
})

// Block a message (mark as blocked and keep it from being delivered)
router.post('/:id/block', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const id = req.params.id
    if (!id) return res.status(400).json({ error: 'missing id' })
    const cont = await getOrCreateContainer('messages')
    const { resource } = await cont.item(id, id).read()
    if (!resource) return res.status(404).json({ error: 'not found' })

    resource.status = 'blocked'
    resource.moderation = resource.moderation || {}
    resource.moderation.reviewed = true
    resource.moderation.reviewedBy = (req as any).actor?.id || 'admin'
    resource.moderation.reviewedAt = Date.now()
    resource.moderation.reviewNote = (req.body && req.body.note) || null

    await cont.items.upsert(resource)

    // write audit record for block
    try {
      const audit = await getOrCreateContainer('audit')
      const auditDoc = { id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, type: 'audit', action: 'moderation.block', admin: (req as any).actor?.id || 'admin', messageId: resource.id, before: { status: 'pending_review' }, after: { status: 'blocked' }, note: resource.moderation.reviewNote || null, createdAt: Date.now() }
      await audit.items.create(auditDoc)
    } catch (e) { logger.warn('failed to write audit record for moderation block: %o', e) }

    return res.json({ ok: true, message: resource })
  } catch (err) {
    logger.error('/admin/moderation/:id/block failed: %o', err)
    return res.status(500).json({ ok: false, error: 'failed to block message' })
  }
})

// fetch a single message and its audit records
router.get('/:id', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const id = req.params.id
    if (!id) return res.status(400).json({ error: 'missing id' })
    const cont = await getOrCreateContainer('messages')
    const { resource } = await cont.item(id, id).read()
    if (!resource) return res.status(404).json({ error: 'not found' })

    const audit = await getOrCreateContainer('audit')
    const q = {
      query: 'SELECT * FROM c WHERE c.type = @type AND c.messageId = @messageId ORDER BY c.createdAt DESC',
      parameters: [ { name: '@type', value: 'audit' }, { name: '@messageId', value: id } ]
    }
    const { resources } = await audit.items.query(q).fetchAll()
    return res.json({ ok: true, message: resource, audits: resources || [] })
  } catch (err) {
    logger.error('/admin/moderation/:id GET failed: %o', err)
    return res.status(500).json({ ok: false, error: 'failed to fetch message details' })
  }
})

export default router
