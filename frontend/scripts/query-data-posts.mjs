#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  const lines = content.split(/\r?\n/)
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

async function main() {
  const envPath = path.join(process.cwd(), '.env')
  loadEnvFile(envPath)

  const endpoint = process.env.VITE_COSMOS_ENDPOINT
  const key = process.env.VITE_COSMOS_KEY
  const dbName = process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ'
  const containerName = process.env.VITE_COSMOS_CONTAINER_NAME || 'data'

  if (!endpoint || !key) {
    console.error('Missing VITE_COSMOS_ENDPOINT or VITE_COSMOS_KEY in .env')
    process.exit(2)
  }

  try {
    const url = new URL(endpoint)
    const host = url.hostname.toLowerCase()
    const localHosts = ['localhost', '127.0.0.1', '::1', 'host.docker.internal']
    if (localHosts.includes(host) || host.endsWith('.local')) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }
  } catch (err) { console.debug('[query-data-posts] failed to parse endpoint URL', err) }

  const { CosmosClient } = await import('@azure/cosmos')
  const client = new CosmosClient({ endpoint, key })
  const database = client.database(dbName)
  const container = database.container(containerName)

  try {
    const { resources } = await container.items.query({ query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC', parameters: [{ name: '@type', value: 'post' }] }).fetchAll()
    console.log(`Found ${resources.length} posts in container '${containerName}' (database '${dbName}'):`) 
    for (const r of resources) {
      console.log('- id:', r.id, 'userId:', (r.data||{}).userId || (r.data||{}).userId, 'contentPreview:', ((r.data||{}).content || '').slice(0, 100))
    }
    process.exit(0)
  } catch (err) {
    console.error('Query failed:', err && err.message ? err.message : err)
    if (err && err.stack) console.error(err.stack)
    process.exit(1)
  }
}

main()
