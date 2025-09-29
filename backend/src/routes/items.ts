import { Router } from 'express';
import { getContainer, getOrCreateContainer, database } from '../db.js';
import logger from '../logger.js'

const router = Router();


// Get all items (example: type = 'user')
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
  logger.debug(`GET /api/items/${type}`);
  const container = await getOrCreateContainer(type);
  logger.debug('Using container: %s', container.id);
    let resources: any[] = []
    try {
      const fetched = await container.items.readAll().fetchAll();
      resources = fetched.resources
    } catch (e) {
      // If container is unexpectedly not found, try to create it and retry once
      try {
        logger.warn('[items] readAll failed, attempting to create container %s and retry', container.id, e)
        await database.containers.createIfNotExists({ id: container.id, partitionKey: { paths: ['/id'] } })
        const fetched = await container.items.readAll().fetchAll()
        resources = fetched.resources
      } catch (err2) {
        throw err2
      }
    }
  logger.debug('Retrieved resources: %o', resources);
    res.json(resources);
  } catch (err) {
    logger.error('GET /api/items/%s failed: %o', req.params.type, err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to fetch items', details: message });
  }
});


// Create an item
router.post('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const container = await getOrCreateContainer(type);
    // Accept either a direct document or the wrapper { id, type, partitionKey, data: {...} }
    const payload = req.body || {}
    let docToCreate: any = payload
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data && typeof payload.data === 'object') {
      // Flatten `data` into the top level document and ensure id is present
      docToCreate = { ...(payload.data || {}), id: payload.id || (payload.data && payload.data.id) }
    }
  logger.debug('POST /api/items/%s payload: %o', type, docToCreate)
    const { resource } = await container.items.upsert(docToCreate)

    // If this is a comment and it contains a mentions array, award "mentioned" karma idempotently
    try {
      if (type === 'comment' && docToCreate && Array.isArray(docToCreate.mentions) && docToCreate.mentions.length > 0) {
        const auditCont = await getOrCreateContainer('audit')
        const dpCont = await getOrCreateContainer('daily-progress')
        const now = Date.now()
        const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        // Points for 'mentioned' are defined in frontend karmaData; keep server-side in sync (2 points)
        const pointsForMention = 2

        for (const mentionedUserId of docToCreate.mentions) {
          try {
            // Deterministic award key ensures idempotency across retries/clients
            const relatedId = docToCreate.id || 'none'
            const awardKey = `award-${mentionedUserId}-mentioned-${relatedId}-${today}`

            // Try to read existing audit - if it exists, skip awarding
            let alreadyAwarded = false
            try {
              const { resource: prior } = await auditCont.item(awardKey, awardKey).read()
              if (prior) alreadyAwarded = true
            } catch (e) {
              // item read throws when not found in some SDKs; ignore
            }

            if (alreadyAwarded) continue

            // Update or create daily-progress for the mentioned user for today
            const dpId = `daily-progress-${mentionedUserId}-${today}`
            try {
              // Attempt to read existing daily-progress
              const { resource: existing } = await dpCont.item(dpId, dpId).read()
              if (existing && existing.data) {
                const data = existing.data || existing
                data.mentions = (data.mentions || 0) + 1
                data.karmaEarned = (data.karmaEarned || 0) + pointsForMention
                data.updatedAt = now
                // Use replace to maintain id/partition key
                await dpCont.item(dpId, dpId).replace({ ...existing, data })
              } else {
                // Some documents may store counters at top-level; fall back to upsert
                const newDoc = { id: dpId, type: 'daily-progress', data: { id: dpId, userId: mentionedUserId, date: today, posts: 0, comments: 0, likes: 0, mentions: 1, follows: 0, groupsJoined: 0, karmaEarned: pointsForMention, createdAt: now, updatedAt: now } }
                await dpCont.items.upsert(newDoc)
              }
            } catch (e) {
              // If read/replace failed (maybe non-existent), attempt upsert as best-effort
              try {
                const newDoc = { id: dpId, type: 'daily-progress', data: { id: dpId, userId: mentionedUserId, date: today, posts: 0, comments: 0, likes: 0, mentions: 1, follows: 0, groupsJoined: 0, karmaEarned: pointsForMention, createdAt: now, updatedAt: now } }
                await dpCont.items.upsert(newDoc)
              } catch (uu) {
                logger.warn('[items] failed to upsert daily-progress for %s: %o', mentionedUserId, uu)
              }
            }

            // Write deterministic audit entry to mark this award as applied
            const auditDoc = { id: awardKey, type: 'audit', action: 'daily_progress.increment.karma', userId: mentionedUserId, points: pointsForMention, relatedId: relatedId, ts: now }
              try {
                // Use create to fail on conflict; if it already exists another process beat us to it
                await auditCont.items.create(auditDoc)
              } catch (e) {
                // If create failed because of conflict, it's fine — treat as already awarded
                // Log and continue; stringify error to avoid TS property access issues
                try {
                  logger.warn('[items] audit create conflict or failed for %s: %s', awardKey, JSON.stringify(e))
                } catch (ee) {
                  logger.warn('[items] audit create conflict or failed for %s: %s', awardKey, String(e))
                }
              }
          } catch (inner) {
            logger.error('[items] awarding mention failed for user %s: %o', mentionedUserId, inner)
          }
        }
      }
    } catch (awardErr) {
      logger.error('[items] failed running mention awarding logic: %o', awardErr)
    }

    res.status(201).json(resource)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('POST /api/items/%s failed: %o', req.params.type, err && (err as Error).stack ? (err as Error).stack : err)
    res.status(500).json({ error: 'Failed to create item', details: message })
  }
});


// Update an item
router.put('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const container = await getOrCreateContainer(type);
    const { resource } = await container.item(id, id).replace(req.body);
    res.json(resource);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to update item', details: message });
  }
});


// Delete an item
router.delete('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const container = await getOrCreateContainer(type);
    await container.item(id, id).delete();
    res.status(204).end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to delete item', details: message });
  }
});

export default router;
