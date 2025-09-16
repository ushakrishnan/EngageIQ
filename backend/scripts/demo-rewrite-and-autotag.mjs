#!/usr/bin/env node
// scripts/demo-rewrite-and-autotag.mjs
// Demo script: rewrite a sample post with AOAI/Foundry and extract tags.
// Usage: node ./scripts/demo-rewrite-and-autotag.mjs

import fs from 'fs'
import path from 'path'
import process from 'process'

function parseEnvContent(content) {
  const lines = content.split(/\r?\n/)
  const env = {}
  for (let line of lines) {
    line = line.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    let key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    const hashIndex = val.indexOf('#')
    if (hashIndex !== -1) val = val.slice(0, hashIndex).trim()
    env[key] = val
  }
  return env
}

function loadEnv() {
  const candidate = {
    AUTOTAG_PROVIDER: process.env.AUTOTAG_PROVIDER,
    AOAI_ENDPOINT: process.env.AOAI_ENDPOINT,
    AOAI_KEY: process.env.AOAI_KEY,
    AOAI_DEPLOYMENT: process.env.AOAI_DEPLOYMENT,
    AOAI_API_VERSION: process.env.AOAI_API_VERSION,
    FOUNDRY_ENDPOINT: process.env.FOUNDRY_ENDPOINT,
    FOUNDRY_KEY: process.env.FOUNDRY_KEY,
    FOUNDRY_MODEL: process.env.FOUNDRY_MODEL
  }
  const have = Object.values(candidate).some(Boolean)
  if (have) return { source: 'process.env', env: candidate }
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return { source: 'none', env: {} }
  const content = fs.readFileSync(envPath, 'utf8')
  const parsed = parseEnvContent(content)
  return { source: '.env', env: parsed }
}

async function callChat({ endpoint, key, deployment, apiVersion, messages, max_tokens = 200, model = null }) {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('global fetch() not available (Node 18+ required)')
  }
  const urlBase = endpoint.replace(/\/+$|\/$/, '')
  // AOAI path
  const url = `${urlBase}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  // AOAI (Azure OpenAI) chat/completions expects max_completion_tokens in some API versions.
  const body = { messages }
  if (typeof max_tokens !== 'undefined') body['max_completion_tokens'] = max_tokens
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let parsed
  try { parsed = JSON.parse(text) } catch (e) { parsed = text }
  return { status: res.status, ok: res.ok, body: parsed }
}

async function callFoundryChat({ endpoint, key, model, messages, max_tokens = 200 }) {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('global fetch() not available (Node 18+ required)')
  }
  const urlBase = endpoint.replace(/\/+$|\/$/, '')
  const url = `${urlBase}/v1/chat/completions`
  const headers = { 'Content-Type': 'application/json' }
  if (key) headers['Authorization'] = `Bearer ${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, max_tokens, temperature: 0.0 })
  })
  const text = await res.text()
  let parsed
  try { parsed = JSON.parse(text) } catch (e) { parsed = text }
  return { status: res.status, ok: res.ok, body: parsed }
}

async function demo() {
  const { source, env } = loadEnv()
  console.log('Using environment from:', source)

  const provider = (env.AUTOTAG_PROVIDER || 'AOAI').toUpperCase()
  console.log('Provider:', provider)

  // Demo content
  const original = `Excited to share that my team shipped a new feature that improves SQL query throughput and reduces latency by 30%. We did this by optimizing our indexes and adding a caching layer. Would love feedback from anyone working with large-scale data pipelines!`;
  console.log('\n=== Original Post ===\n')
  console.log(original)

  let rewritten = original
  let tags = []

  try {
    if (provider === 'AOAI') {
      const endpoint = env.AOAI_ENDPOINT
      const key = env.AOAI_KEY
      const deployment = env.AOAI_DEPLOYMENT
      const apiVersion = env.AOAI_API_VERSION || '2024-12-01-preview'
      if (!endpoint || !key || !deployment) throw new Error('Missing AOAI configuration in environment')

      // Rewrite: ask AOAI chat to rewrite concisely
      const rewriteMessages = [
        { role: 'system', content: 'You are a helpful editor. Rewrite the user\'s post to be concise, professional, and clear. Return ONLY the rewritten text.' },
        { role: 'user', content: original }
      ]
      process.stdout.write('\nCalling AOAI rewrite...\n')
      const r = await callChat({ endpoint, key, deployment, apiVersion, messages: rewriteMessages, max_tokens: 200 })
      if (r.ok) {
        const content = (r.body?.choices?.[0]?.message?.content) || r.body?.choices?.[0]?.text || ''
        rewritten = String(content).trim() || original
        console.log('\n=== Rewritten Post ===\n')
        console.log(rewritten)
      } else {
        console.error('Rewrite call failed:', r.status, r.body)
      }

      // Autotag: ask AOAI to return JSON array of tags
      const tagPrompt = `Extract up to 6 concise tags (single words or short hyphenated phrases) for the following content and return only a JSON array, e.g. ["data-engineering","caching"].\n\nContent:\n"""${rewritten}\n"""`
      const tagMessages = [
        { role: 'system', content: 'You are a tag extraction assistant. Return ONLY a JSON array of concise tags.' },
        { role: 'user', content: tagPrompt }
      ]
      process.stdout.write('\nCalling AOAI autotag...\n')
      const t = await callChat({ endpoint, key, deployment, apiVersion, messages: tagMessages, max_tokens: 100 })
      if (t.ok) {
        const raw = (t.body?.choices?.[0]?.message?.content) || t.body?.choices?.[0]?.text || ''
        // try to extract JSON array from response
        const m = String(raw).match(/\[.*\]/s)
        if (m) {
          try {
            const parsed = JSON.parse(m[0])
            if (Array.isArray(parsed)) tags = parsed.map(x => String(x).toLowerCase())
          } catch (e) {
            // fallback to split
            tags = String(raw).split(/[\,\n]/).map(s => s.trim()).filter(Boolean).slice(0,6)
          }
        } else {
          tags = String(raw).split(/[\,\n]/).map(s => s.trim()).filter(Boolean).slice(0,6)
        }
        console.log('\n=== Tags ===\n')
        console.log(tags)
      } else {
        console.error('Autotag call failed:', t.status, t.body)
      }

    } else if (provider === 'FOUNDRY') {
      const endpoint = env.FOUNDRY_ENDPOINT
      const key = env.FOUNDRY_KEY
      const model = env.FOUNDRY_MODEL || 'phi-3.5-mini'
      if (!endpoint) throw new Error('Missing FOUNDRY_ENDPOINT in env')

      // Rewrite
      process.stdout.write('\nCalling Foundry rewrite...\n')
      const r = await callFoundryChat({ endpoint, key, model, messages: [{ role: 'system', content: 'You are a helpful editor. Rewrite the user\'s post to be concise and professional. Return only the rewritten text.' }, { role: 'user', content: original }], max_tokens: 200 })
      if (r.ok) {
        const content = (r.body?.choices?.[0]?.message?.content) || r.body?.choices?.[0]?.text || ''
        rewritten = String(content).trim() || original
        console.log('\n=== Rewritten Post ===\n')
        console.log(rewritten)
      } else {
        console.error('Rewrite call failed:', r.status, r.body)
      }

      // Autotag
      process.stdout.write('\nCalling Foundry autotag...\n')
      const t = await callFoundryChat({ endpoint, key, model, messages: [{ role: 'system', content: 'Return only a JSON array of short tags.' }, { role: 'user', content: `Extract up to 6 concise tags from the content:\n${rewritten}` }], max_tokens: 100 })
      if (t.ok) {
        const raw = (t.body?.choices?.[0]?.message?.content) || t.body?.choices?.[0]?.text || ''
        const m = String(raw).match(/\[.*\]/s)
        if (m) {
          try { const parsed = JSON.parse(m[0]); if (Array.isArray(parsed)) tags = parsed.map(x => String(x).toLowerCase()) } catch(e) { tags = String(raw).split(/[\,\n]/).map(s=>s.trim()).filter(Boolean).slice(0,6) }
        } else {
          tags = String(raw).split(/[\,\n]/).map(s=>s.trim()).filter(Boolean).slice(0,6)
        }
        console.log('\n=== Tags ===\n')
        console.log(tags)
      } else {
        console.error('Autotag call failed:', t.status, t.body)
      }

    } else {
      console.log('Unknown provider; nothing to do.')
    }
  } catch (err) {
    console.error('Demo failed', err)
  }

  console.log('\nDemo finished')
}

demo()
