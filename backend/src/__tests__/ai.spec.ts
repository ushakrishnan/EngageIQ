import assert from 'node:assert/strict'
import { describe, it } from '@jest/globals'
import * as ai from '../ai.js'

describe('AI module', () => {
  it('computeVectors persists embeddings for missing vectors', async () => {
    const saved: any[] = []
    const tagsContainer = {
      items: {
        query: (_q: any) => ({ fetchAll: async () => ({ resources: [
          { id: 'tag1', data: { tag: 'alpha', vector: [] } },
          { id: 'tag2', data: { tag: 'beta', vector: [] } }
        ] }) }),
        upsert: async (doc: any) => { saved.push(doc); return { resource: doc } }
      }
    }

    process.env.AOAI_ENDPOINT = 'https://fake'
    process.env.AOAI_KEY = 'k'
    process.env.AOAI_EMBEDDING_DEPLOYMENT = 'd'

    const origFetch = (globalThis as any).fetch
    try {
      (globalThis as any).fetch = async (_url?: any, _init?: any) => ({
        json: async () => ({ data: [{ embedding: [1, 2, 3] }, { embedding: [4, 5, 6] }] }),
        text: async () => JSON.stringify({ data: [{ embedding: [1, 2, 3] }, { embedding: [4, 5, 6] }] }),
        ok: true,
        status: 200
      })

      const res = await ai.computeVectors(undefined, tagsContainer as any)
      assert.strictEqual(res.ok, true)
      assert.strictEqual(res.processed, 2)
      assert.strictEqual(saved.length, 2)
      assert.deepStrictEqual(saved[0].data.vector, [1, 2, 3])
    } finally {
      ;(globalThis as any).fetch = origFetch
    }
  })

  it('callAutotagProvider returns parsed tags from AOAI', async () => {
    process.env.AOAI_ENDPOINT = 'https://fake'
    process.env.AOAI_DEPLOYMENT = 'dep'
    process.env.AOAI_KEY = 'key'

    const origFetch = (globalThis as any).fetch
    try {
      (globalThis as any).fetch = async (_url?: any, _init?: any) => ({
        text: async () => '["tagA","tagB"]',
        ok: true
      })

      const tags = await ai.callAutotagProvider('some content', 3)
      assert.deepStrictEqual(tags, ['tagA', 'tagB'])
    } finally {
      ;(globalThis as any).fetch = origFetch
    }
  })

  it('callRewriteProvider returns rewritten text from AOAI', async () => {
    process.env.AOAI_ENDPOINT = 'https://fake'
    process.env.AOAI_DEPLOYMENT = 'dep'
    process.env.AOAI_KEY = 'key'

    const origFetch = (globalThis as any).fetch
    try {
      (globalThis as any).fetch = async (_url?: any, _init?: any) => ({
        json: async () => ({ choices: [{ message: { content: 'rewritten text' } }] }),
        ok: true,
        text: async () => JSON.stringify({ choices: [{ message: { content: 'rewritten text' } }] })
      })

      const out = await ai.callRewriteProvider('original text', 'polished')
      assert.strictEqual(out, 'rewritten text')
    } finally {
      ;(globalThis as any).fetch = origFetch
    }
  })
})
