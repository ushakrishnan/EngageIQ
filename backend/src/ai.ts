import config from './config.js'
import { getContainer } from './db.js'

function safeString(v: any) {
  return v == null ? '' : String(v)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function postJsonWithRetries(url: string, init: any, retries = 2) {
  let lastErr: any = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, init)
      if (!resp || !resp.ok) {
        const txt = await (resp?.text?.() || Promise.resolve(''))
        throw new Error(`HTTP ${resp?.status || 'NO_RESPONSE'} ${txt}`)
      }
      // try parse JSON
      try {
        return await resp.json()
      } catch (e) {
        // return text as fallback
        const t = await resp.text().catch(() => '')
        return { __text: t }
      }
    } catch (err) {
      lastErr = err
      if (attempt < retries) await sleep(200 * (attempt + 1))
    }
  }
  throw lastErr
}

export async function callAutotagProvider(content: string, maxTags = 6) {
  const provider = (config.autotagProvider || 'AOAI').toUpperCase()
  if (!content) return []
  try {
    if (provider === 'AOAI') {
      const endpoint = (process.env.AOAI_ENDPOINT || '').replace(/\/+$/, '')
      const deployment = process.env.AOAI_DEPLOYMENT
      const apiVersion = process.env.AOAI_API_VERSION || '2024-12-01-preview'
      const key = process.env.AOAI_KEY
      if (!endpoint || !deployment || !key) throw new Error('AOAI config missing')

      const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
      const prompt = `Extract up to ${maxTags} concise tags (single-word or short phrases). Return the tags as a JSON array only.`
      const body = { messages: [{ role: 'system', content: 'You are a tag extraction assistant. Return only a JSON array of concise tags, no extra text.' }, { role: 'user', content: `${prompt}\n\nText:\n"""${content}\n"""` }], max_completion_tokens: 100 }
      let text = ''
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': key }, body: JSON.stringify(body) })
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          throw new Error(`AOAI autotag failed: ${res.status} ${t}`)
        }
        text = await res.text()
      } catch (e) {
        console.error('Autotag fetch failed', (e as any)?.message || e)
        return []
      }

      try {
        const m = text.match(/\[.*\]/s)
        if (m) {
          const parsed = JSON.parse(m[0])
          if (Array.isArray(parsed)) return parsed.slice(0, maxTags).map(safeString)
        }
        const parsed = JSON.parse(text)
        const raw = parsed?.choices?.[0]?.message?.content || parsed?.choices?.[0]?.text || ''
        const mm = raw.match(/\[.*\]/s)
        if (mm) return JSON.parse(mm[0]).slice(0, maxTags).map(safeString)
      } catch (e) {
        // fallback: try to split lines/commas
        const raw = text || ''
        const fallback = raw.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        return fallback.slice(0, maxTags).map(safeString)
      }
    } else if (provider === 'FOUNDRY') {
      const endpoint = (process.env.FOUNDRY_ENDPOINT || '').replace(/\/+$/, '')
      const model = process.env.FOUNDRY_MODEL || 'phi-3.5-mini'
      const key = process.env.FOUNDRY_KEY
      if (!endpoint) throw new Error('FOUNDRY_ENDPOINT missing')
      const url = `${endpoint}/v1/chat/completions`
      const body = { model, messages: [{ role: 'system', content: 'Return a JSON array of tags only.' }, { role: 'user', content: `Extract up to ${maxTags} short tags from the text: ${content}` }], max_tokens: 100 }
      const headers: any = { 'Content-Type': 'application/json' }
      if (key) headers['Authorization'] = `Bearer ${key}`
      let j: any = null
      try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          throw new Error(`Foundry autotag failed: ${res.status} ${t}`)
        }
        j = await res.json()
      } catch (e) {
        console.error('Foundry autotag failed', (e as any)?.message || e)
        return []
      }
      const raw = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || ''
      const m = raw.match(/\[.*\]/s)
      if (m) {
        try { const parsed = JSON.parse(m[0]); return Array.isArray(parsed) ? parsed.slice(0, maxTags).map(safeString) : [] } catch (e) { console.error('Failed to parse Foundry response', e) }
      }
      const fallback = raw.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
      return fallback.slice(0, maxTags).map(safeString)
    }
  } catch (err) {
    console.error('Autotag provider failed', err)
    return []
  }
  return []
}

export async function callRewriteProvider(content: string, style = 'concise') {
  const provider = (config.autotagProvider || 'AOAI').toUpperCase()
  if (!content) return ''
  try {
    if (provider === 'AOAI') {
      const endpoint = (process.env.AOAI_ENDPOINT || '').replace(/\/+$/, '')
      const deployment = process.env.AOAI_DEPLOYMENT
      const apiVersion = process.env.AOAI_API_VERSION || '2024-12-01-preview'
      const key = process.env.AOAI_KEY
      if (!endpoint || !deployment || !key) throw new Error('AOAI config missing')
      const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
      const system = `You are a helpful editor. Rewrite the user's post to be ${style}. Keep meaning intact. Return only the rewritten text.`
      const body = { messages: [{ role: 'system', content: system }, { role: 'user', content }], max_completion_tokens: 400 }
      try {
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': key }, body: JSON.stringify(body) })
        if (!resp.ok) {
          const t = await resp.text().catch(() => '')
          throw new Error(`AOAI rewrite failed: ${resp.status} ${t}`)
        }
        const j = await resp.json()
        const rewritten = (j?.choices?.[0]?.message?.content) || j?.choices?.[0]?.text || ''
        return String(rewritten || '').trim()
      } catch (e) {
        console.error('Rewrite fetch failed', (e as any)?.message || e)
        return String(content || '').trim()
      }
    } else if (provider === 'FOUNDRY') {
      const endpoint = (process.env.FOUNDRY_ENDPOINT || '').replace(/\/+$/, '')
      const model = process.env.FOUNDRY_MODEL || 'phi-3.5-mini'
      const key = process.env.FOUNDRY_KEY
      if (!endpoint) throw new Error('FOUNDRY_ENDPOINT missing')
      const url = `${endpoint}/v1/chat/completions`
      const system = `You are a helpful editor. Rewrite the user's post to be ${style}. Return only the rewritten text.`
      const headers: any = { 'Content-Type': 'application/json' }
      if (key) headers['Authorization'] = `Bearer ${key}`
      try {
        const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content }], max_tokens: 400, temperature: 0.0 }) })
        if (!resp.ok) {
          const t = await resp.text().catch(() => '')
          throw new Error(`Foundry rewrite failed: ${resp.status} ${t}`)
        }
        const j = await resp.json()
        const rewritten = (j?.choices?.[0]?.message?.content) || j?.choices?.[0]?.text || ''
        return String(rewritten || '').trim()
      } catch (e) {
        console.error('Foundry rewrite failed', (e as any)?.message || e)
        return String(content || '').trim()
      }
    }
  } catch (err) {
    console.error('Rewrite provider failed', err)
    return String(content || '').trim()
  }
  return String(content || '').trim()
}

export async function computeVectors(embeddingDeployment?: string, tagsContainer?: any) {
  const apiEndpoint = (process.env.AOAI_ENDPOINT || '').replace(/\/+$/, '')
  const apiKey = process.env.AOAI_KEY
  const apiVer = process.env.AOAI_API_VERSION || '2024-12-01-preview'
  const deploy = embeddingDeployment || process.env.AOAI_EMBEDDING_DEPLOYMENT || process.env.AOAI_EMBEDDING_MODEL
  if (!apiEndpoint || !apiKey || !deploy) throw new Error('AOAI endpoint/key/deployment missing')

  const tagsCont = tagsContainer || getContainer('tags')
  const { resources } = await tagsCont.items.query({ query: 'SELECT c.id, c.data FROM c WHERE c.type = @type', parameters: [{ name: '@type', value: 'tag' }] }).fetchAll()
  const tagDocs = Array.isArray(resources) ? resources : []
  const missing = tagDocs.filter((d: any) => !(d.data && Array.isArray(d.data.vector) && d.data.vector.length)).map((d: any) => ({ id: d.id, tag: d.data.tag }))
  if (missing.length === 0) return { ok: true, processed: 0 }

  const url = `${apiEndpoint}/openai/deployments/${encodeURIComponent(deploy)}/embeddings?api-version=${encodeURIComponent(apiVer)}`

  const chunkSize = 32
  let processed = 0
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize)
    const inputs = chunk.map((t: any) => t.tag)
    // try a few times per chunk to tolerate transient failures
    let attempt = 0
    let success = false
    while (attempt < 3 && !success) {
      try {
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': apiKey }, body: JSON.stringify({ input: inputs }) })
        if (!resp.ok) {
          const t = await resp.text().catch(() => '')
          throw new Error(`Embedding request failed ${resp.status} ${t}`)
        }
        const ej = await resp.json().catch(() => null)
        const arr = ej?.data || ej?.embeddings || []
        for (let k = 0; k < chunk.length; k++) {
          const vec = arr[k] && (arr[k].embedding || arr[k].vector) ? (arr[k].embedding || arr[k].vector) : null
          if (vec && Array.isArray(vec)) {
            try {
              const upsertDoc = { id: chunk[k].id, type: 'tag', data: { tag: chunk[k].tag, synonyms: [], vector: vec }, createdAt: Date.now(), updatedAt: Date.now() }
              await tagsCont.items.upsert(upsertDoc)
              processed++
            } catch (e) {
              console.warn('Failed to persist tag vector for', chunk[k].id, (e as any).message || e)
            }
          }
        }
        success = true
      } catch (e) {
        attempt++
        console.error('Embedding chunk failed (attempt ' + attempt + ')', (e as any)?.message || e)
        if (attempt < 3) await sleep(200 * attempt)
      }
    }
  }
  return { ok: true, processed }
}
