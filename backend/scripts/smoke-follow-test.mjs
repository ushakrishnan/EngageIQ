import { CosmosClient } from '@azure/cosmos'
import fs from 'fs'
import path from 'path'

function loadEnvFromDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFromDotEnv()
// Allow self-signed certs for localhost/emulator
try {
  if (process.env.VITE_COSMOS_ENDPOINT) {
    const url = new URL(process.env.VITE_COSMOS_ENDPOINT)
    const localHosts = ['localhost', '127.0.0.1', '::1']
    if (localHosts.includes(url.hostname.toLowerCase())) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }
  }
} catch (e) { /* ignore */ }

const endpoint = process.env.VITE_COSMOS_ENDPOINT
const key = process.env.VITE_COSMOS_KEY
const databaseName = process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ'

if (!endpoint || !key) {
  console.error('Missing Cosmos env vars. Set VITE_COSMOS_ENDPOINT and VITE_COSMOS_KEY in .env or environment.')
  process.exit(1)
}

const client = new CosmosClient({ endpoint, key })
const db = client.database(databaseName)
const usersContainer = db.container('users')

const current = process.env.SMOKE_CURRENT || 'demo-user-1'
const target = process.env.SMOKE_TARGET || 'demo-user-2'

try {
  const { resource: curRes } = await usersContainer.item(current, current).read()
  if (!curRes) {
    console.error('Current user not found:', current)
    process.exit(2)
  }

  const existing = (curRes.data && Array.isArray(curRes.data.following)) ? curRes.data.following : []
  if (!existing.includes(target)) {
    const newFollowing = [...existing, target]
    const updated = {
      id: curRes.id,
      type: 'user',
      data: { ...(curRes.data || {}), following: newFollowing },
      createdAt: curRes.createdAt || Date.now(),
      updatedAt: Date.now()
    }
    await usersContainer.items.upsert(updated)
    console.log(`Smoke test: added ${target} to ${current}.following`)
  } else {
    console.log(`Smoke test: ${current} already follows ${target}`)
  }

  // read back
  const { resource: after } = await usersContainer.item(current, current).read()
  console.log('Now following:', (after.data && after.data.following) || [])
  process.exit(0)
} catch (err) {
  console.error('Smoke test failed:', err)
  process.exit(1)
}
