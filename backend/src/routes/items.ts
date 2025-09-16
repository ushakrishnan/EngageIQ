import { Router } from 'express';
import { getContainer, getOrCreateContainer, database } from '../db.js';

const router = Router();


// Get all items (example: type = 'user')
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    console.log(`[DEBUG] GET /api/items/${type}`);
    const container = await getOrCreateContainer(type);
    console.log(`[DEBUG] Using container:`, container.id);
    let resources: any[] = []
    try {
      const fetched = await container.items.readAll().fetchAll();
      resources = fetched.resources
    } catch (e) {
      // If container is unexpectedly not found, try to create it and retry once
      try {
        console.warn(`[items] readAll failed, attempting to create container ${container.id} and retry`, e)
        await database.containers.createIfNotExists({ id: container.id, partitionKey: { paths: ['/id'] } })
        const fetched = await container.items.readAll().fetchAll()
        resources = fetched.resources
      } catch (err2) {
        throw err2
      }
    }
    console.log(`[DEBUG] Retrieved resources:`, resources);
    res.json(resources);
  } catch (err) {
    console.error(`[ERROR] GET /api/items/${req.params.type}:`, err);
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
    console.log(`[DEBUG] POST /api/items/${type} payload:`, docToCreate)
    const { resource } = await container.items.upsert(docToCreate)
    res.status(201).json(resource)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ERROR] POST /api/items/${req.params.type}:`, err && (err as Error).stack ? (err as Error).stack : err)
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
