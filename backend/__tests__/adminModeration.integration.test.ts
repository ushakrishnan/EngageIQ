import express from 'express'
import request from 'supertest'
import adminModerationRouter from '../src/routes/adminModeration.js'

// In-memory 'database' for messages and audit
const messagesStore: Record<string, any> = {
  'm1': { id: 'm1', type: 'message', status: 'pending_review', from: 'alice', to: 'bob', content: 'hello bob', createdAt: Date.now(), moderation: { flagged: true } },
  'm2': { id: 'm2', type: 'message', status: 'pending_review', from: 'charlie', to: 'dave', content: 'hey', createdAt: Date.now(), moderation: { flagged: false } }
}
const auditStore: any[] = []

jest.mock('../src/db', () => ({
  getOrCreateContainer: async (name: string) => {
    if (name === 'messages') {
      return {
        item: (id: string) => ({ read: async () => ({ resource: messagesStore[id] }) }),
        items: {
          upsert: async (doc: any) => ({ resource: (messagesStore[doc.id] = doc) }),
          query: (q: any) => ({ fetchAll: async () => ({ resources: Object.values(messagesStore) }) })
        }
      }
    }
    if (name === 'audit') {
      return {
        items: {
          create: async (doc: any) => { auditStore.push(doc); return { resource: doc } },
          query: (q: any) => ({ fetchAll: async () => ({ resources: auditStore }) })
        }
      }
    }
    // users/data containers used by auth won't be used since we mock auth
    return { items: { query: () => ({ fetchAll: async () => ({ resources: [] }) }) }, item: () => ({ read: async () => ({ resource: null }) }) }
  }
}))

jest.mock('../src/ws', () => ({ broadcastToRelevant: jest.fn() }))

// Mock auth middleware: populate req.actor with admin role
jest.mock('../src/middleware/auth', () => ({
  loadUserByHeader: (req: any, res: any, next: any) => { const uid = req.header && req.header('x-user-id'); if (uid) req.actor = { id: uid, data: { roles: ['engageiq_admin'] } }; return next() },
  requireEngageIQAdmin: (req: any, res: any, next: any) => next()
}))

describe('admin moderation integration', () => {
  let app: express.Express
  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/admin/moderation', adminModerationRouter)
    auditStore.length = 0
  })

  test('list returns messages', async () => {
    const res = await request(app).get('/admin/moderation?status=pending_review').set('x-user-id', 'admin')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.messages)).toBe(true)
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1)
  })

  test('approve writes audit and broadcasts', async () => {
    const res = await request(app).post('/admin/moderation/m1/approve').set('x-user-id', 'admin').send({ note: 'ok' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // audit created
    expect(auditStore.length).toBeGreaterThanOrEqual(1)
    const a = auditStore[auditStore.length - 1]
    expect(a.action).toContain('moderation.approve')
    expect(a.messageId).toBe('m1')
  })

  test('details returns audits', async () => {
    // ensure there is at least one audit
    auditStore.push({ id: 'a1', type: 'audit', action: 'moderation.approve', admin: 'admin', messageId: 'm1', note: 'ok', createdAt: Date.now() })
    const res = await request(app).get('/admin/moderation/m1').set('x-user-id', 'admin')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(Array.isArray(res.body.audits)).toBe(true)
    expect(res.body.audits.length).toBeGreaterThanOrEqual(1)
  })

  test('block writes audit', async () => {
    const res = await request(app).post('/admin/moderation/m2/block').set('x-user-id', 'admin').send({ note: 'bad' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const a = auditStore[auditStore.length - 1]
    expect(a.action).toContain('moderation.block')
    expect(a.messageId).toBe('m2')
  })
})
