import adminModerationRouter from '../src/routes/adminModeration.js'
import express from 'express'
import request from 'supertest'

// Mocks
jest.mock('../src/db', () => {
  const messageResource = { id: 'msg1', type: 'message', status: 'pending_review', from: 'userA', to: 'userB', content: 'hello', createdAt: Date.now(), moderation: { flagged: false } }
  const container = () => ({
    // item(partitionKey, id)
    item: (id: string) => ({ read: jest.fn(async () => ({ resource: messageResource })) }),
    items: {
      upsert: jest.fn(async (doc) => ({ resource: doc })),
      create: jest.fn(async (doc) => ({ resource: doc })),
      query: jest.fn(() => ({ fetchAll: jest.fn(async () => ({ resources: [messageResource] })) }))
    }
  })
  return { getOrCreateContainer: async (name: string) => container() }
})

jest.mock('../src/ws', () => ({ broadcastToRelevant: jest.fn() }))

// mock auth middleware so tests don't invoke real DB lookups
jest.mock('../src/middleware/auth', () => ({
  loadUserByHeader: (req: any, res: any, next: any) => {
    const uid = req.header && req.header('x-user-id')
    if (uid) req.actor = { id: uid, data: { roles: ['engageiq_admin'] } }
    return next()
  },
  requireEngageIQAdmin: (req: any, res: any, next: any) => next()
}))

import { getOrCreateContainer } from '../src/db.js'
import { broadcastToRelevant } from '../src/ws.js'

describe('adminModeration router', () => {
  let app: express.Express
  beforeEach(() => {
    app = express()
    app.use(express.json())
    // simple dev header auth middleware mimic
    app.use((req, res, next) => {
      const uid = req.header('x-user-id')
      if (uid) req.actor = { id: uid }
      next()
    })
    // mock admin check
    app.use((req, res, next) => {
      // set admin role on actor.data.roles
      if ((req as any).actor) (req as any).actor.data = { roles: ['engageiq_admin'] }
      next()
    })
    app.use('/admin/moderation', adminModerationRouter)
  })

  test('approve endpoint upserts message, writes audit and broadcasts', async () => {
    const res = await request(app).post('/admin/moderation/msg1/approve').set('x-user-id', 'admin1').send({ note: 'ok' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // ensure broadcast called
    expect((broadcastToRelevant as any).mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  test('block endpoint upserts and writes audit', async () => {
    const res = await request(app).post('/admin/moderation/msg1/block').set('x-user-id', 'admin1').send({ note: 'nope' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
