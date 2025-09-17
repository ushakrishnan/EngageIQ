import { Router } from 'express'
import { spawn } from 'child_process'
import path from 'path'
import logger from '../logger.js'
import { callRewriteProvider } from '../ai.js'
import { loadUserByHeader, requireEngageIQAdmin } from '../middleware/auth.js'
import { getContainer, database, getOrCreateContainer } from '../db.js'

const router = Router()

router.get('/status', loadUserByHeader, (req, res) => {
  return res.json({ ok: true, status: 'running', pid: process.pid })
})

// POST /admin/reseed - spawn seeder
router.post('/reseed', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'fresh-seed-all.mjs')
    const node = process.execPath
    const child = spawn(node, [scriptPath], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let errOut = ''
    child.stdout?.on('data', (chunk) => { out += String(chunk) })
    child.stderr?.on('data', (chunk) => { errOut += String(chunk) })
    child.on('close', (code) => {
      if (code === 0) {
        return res.json({ ok: true, message: 'Reseed completed successfully', output: out.slice(0, 8000) })
      } else {
        logger.error('/admin/reseed failed: %s', errOut)
        return res.status(500).json({ ok: false, error: errOut || 'Seeder failed', code })
      }
    })
  } catch (err) {
    logger.error('admin/reseed error: %o', err)
    return res.status(500).json({ ok: false, error: (err && (err as Error).message) || String(err) })
  }
})

// GET /admin/audit-logs
router.get('/audit-logs', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const auditContainer = await getOrCreateContainer('audit')
    const { resources } = await auditContainer.items.query({ query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC', parameters: [{ name: '@type', value: 'audit' }] }).fetchAll()
    return res.json(resources)
  } catch (err) {
    logger.error('/admin/audit-logs error: %o', err)
    return res.status(500).json({ ok: false, error: (err && (err as Error).message) || String(err) })
  }
})

// GET /admin/config
router.get('/config', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const cont = await getOrCreateContainer('config')
    const { resources } = await cont.items.query({ query: 'SELECT c.id, c.data FROM c WHERE c.type = @type', parameters: [{ name: '@type', value: 'config' }] }).fetchAll()
    const out: Record<string, any> = {}
    for (const r of (resources || [])) {
      if (r && r.id && r.data && Object.prototype.hasOwnProperty.call(r.data, 'value')) out[r.id] = r.data.value
    }
    return res.json({ ok: true, config: out })
  } catch (e) {
    logger.error('/admin/config GET failed: %o', e)
    return res.status(500).json({ ok: false, error: (e as any)?.message || String(e) })
  }
})

// POST /admin/config
router.post('/config', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  const { key, value } = req.body || {}
  if (!key) return res.status(400).json({ error: 'missing key' })
  try {
    const cont = await getOrCreateContainer('config')
    const now = Date.now()
    await cont.items.upsert({ id: key, type: 'config', data: { value }, createdAt: now, updatedAt: now })
    return res.json({ ok: true })
  } catch (e) {
    logger.error('/admin/config POST failed: %o', e)
    return res.status(500).json({ ok: false, error: (e as any)?.message || String(e) })
  }
})

// Tags endpoints
router.get('/tags', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  try {
    const cont = await getOrCreateContainer('tags')
    const { resources } = await cont.items.query({ query: 'SELECT c.id, c.data FROM c WHERE c.type = @type ORDER BY c.createdAt DESC', parameters: [{ name: '@type', value: 'tag' }] }).fetchAll()
    const out = Array.isArray(resources) ? resources.map((r: any) => ({ id: r.id, data: r.data })) : []
    return res.json({ ok: true, tags: out })
  } catch (e) {
    logger.error('/admin/tags GET failed: %o', e)
    return res.status(500).json({ ok: false, error: (e as any)?.message || String(e) })
  }
})

router.post('/tags', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  const { id, tag, synonyms } = req.body || {}
  if (!tag) return res.status(400).json({ error: 'missing tag' })
  try {
    const cont = await getOrCreateContainer('tags')
    const docId = id || `tag-${String(tag).toLowerCase().replace(/[^a-z0-9\-]+/g,'-')}`
    const now = Date.now()
    const upsertDoc = { id: docId, type: 'tag', data: { tag: String(tag), synonyms: Array.isArray(synonyms) ? synonyms : [], vector: null }, createdAt: now, updatedAt: now }
    await cont.items.upsert(upsertDoc)
    return res.json({ ok: true, id: docId })
  } catch (e) {
    logger.error('/admin/tags POST failed: %o', e)
    return res.status(500).json({ ok: false, error: (e as any)?.message || String(e) })
  }
})

router.delete('/tags/:id', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  const id = req.params.id
  if (!id) return res.status(400).json({ error: 'missing id' })
  try {
    const cont = await getOrCreateContainer('tags')
    await cont.item(id, id).delete()
    return res.json({ ok: true })
  } catch (e) {
    logger.error('/admin/tags DELETE failed: %o', e)
    return res.status(500).json({ ok: false, error: (e as any)?.message || String(e) })
  }
})

// Container TTL endpoints
router.get('/container-ttl', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  const type = req.query.type as string
  if (!type) return res.status(400).json({ error: 'missing type' })
  const mapping: Record<string, string> = { audit: 'audit', error: 'errors' }
  const containerName = mapping[type]
  if (!containerName) return res.status(400).json({ error: 'unknown type' })
  try {
    const cont = await getOrCreateContainer(containerName)
    const { resource } = await cont.read()
    return res.json({ containerName, defaultTtl: resource?.defaultTtl ?? null })
  } catch (err) {
    logger.error('/admin/container-ttl GET error: %o', err)
    return res.status(500).json({ error: 'failed to read container' })
  }
})

router.post('/container-ttl', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  const { type, ttlSeconds } = req.body
  if (!type || typeof ttlSeconds !== 'number') return res.status(400).json({ error: 'missing type or ttlSeconds' })
  const mapping: Record<string, string> = { audit: 'audit', error: 'errors' }
  const containerName = mapping[type]
  if (!containerName) return res.status(400).json({ error: 'unknown type' })

  try {
    const cont = await getOrCreateContainer(containerName)
    // Read container resource and attempt to replace defaultTtl
    const { resource: currentRes } = await cont.read()
    const updated = { ...currentRes, defaultTtl: ttlSeconds }
    const { resource: replaced } = await cont.replace(updated)
    return res.json({ ok: true, container: containerName, defaultTtl: replaced?.defaultTtl ?? null })
  } catch (err) {
    logger.error('/admin/container-ttl POST error: %o', err)
    try {
      // attempt create with TTL if replace fails
      await database.containers.createIfNotExists({ id: containerName, partitionKey: '/id', defaultTtl: ttlSeconds })
      return res.json({ ok: true, container: containerName, defaultTtl: ttlSeconds })
    } catch (e) {
      logger.error('fallback create failed: %o', e)
      return res.status(500).json({ error: 'failed to update container TTL' })
    }
  }
})

// GET /admin/containers - diagnostics for container existence and sample reads (dev/admin only)
router.get('/containers', loadUserByHeader, requireEngageIQAdmin, async (req, res) => {
  const containers = ['users', 'groups', 'posts', 'comments', 'error', 'audit', 'tags', 'config', 'daily-progress']
  const results: Record<string, any> = {}
  for (const name of containers) {
    try {
      const cont = await getOrCreateContainer(name)
      // container metadata
      const { resource: meta } = await cont.read()
      // try a lightweight sample query to confirm items are accessible
      let sample: any = null
      try {
        const { resources } = await cont.items.query({ query: 'SELECT TOP 1 c.id FROM c' }).fetchAll()
        sample = (Array.isArray(resources) && resources.length > 0) ? resources[0] : null
      } catch (qErr) {
        // query may fail if container empty or not queryable
        sample = { queryError: (qErr && (qErr as Error).message) || String(qErr) }
      }
      results[name] = { ok: true, meta, sample }
    } catch (err) {
      results[name] = { ok: false, error: (err && (err as Error).message) || String(err) }
    }
  }
  return res.json({ ok: true, results })
})

// POST /admin/autotag - simple autotagging helper (dev only)
router.post('/autotag', loadUserByHeader, async (req, res) => {
  try {
    const { content } = req.body || {}
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'missing content' })

    // First, look for explicit hashtags
    const hashtags = Array.from(new Set((content.match(/#(\w[\w-]*)/g) || []).map(h => h.replace(/^#/, '').toLowerCase())))
    if (hashtags.length > 0) return res.json({ tags: hashtags })

    // Fallback: naive frequency-based keyword extraction
    const stopwords = new Set(['the','and','is','in','at','of','a','to','for','on','it','this','that','with','as','are','was','be','by','from'])
    const words = (content.toLowerCase().match(/[a-z0-9\-]{3,}/g) || []).filter(w => !stopwords.has(w))
    const counts: Record<string, number> = {}
    for (const w of words) counts[w] = (counts[w] || 0) + 1
    const sorted = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0,5)
    return res.json({ tags: sorted })
  } catch (err) {
    console.error('/admin/autotag failed: %o', err)
    return res.status(500).json({ error: 'autotag failed', details: (err as any)?.message || String(err) })
  }
})

// POST /admin/rewrite - simple rewrite helper (dev). Requires identification via x-user-id header.
router.post('/rewrite', loadUserByHeader, async (req, res) => {
  try {
    const { content, style } = req.body || {}
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'missing content' })

    // Try AI-backed rewrite first (AOAI / Foundry depending on config inside callRewriteProvider)
    try {
      const aiResult = await callRewriteProvider(content, typeof style === 'string' ? style : 'concise')
      if (aiResult && String(aiResult).trim() && String(aiResult).trim() !== String(content).trim()) {
        return res.json({ rewritten: String(aiResult).trim(), provider: 'ai' })
      }
      // If AI returned empty or identical content, fall through to deterministic fallback
    } catch (aiErr) {
      logger.error('/admin/rewrite: AI provider call failed: %o', aiErr)
      // fall through to deterministic rewrite
    }

    // Deterministic fallback: collapse whitespace, trim, and capitalize sentences
    let rewritten = content.replace(/\s+/g, ' ').trim()
    rewritten = rewritten.replace(/(?:^|[.!?]\s+)([a-z])/g, (m, p1) => m.slice(0, -1) + p1.toUpperCase())
    return res.json({ rewritten })
  } catch (err) {
    logger.error('/admin/rewrite failed: %o', err)
    return res.status(500).json({ error: 'rewrite failed', details: (err as any)?.message || String(err) })
  }
})

export default router
