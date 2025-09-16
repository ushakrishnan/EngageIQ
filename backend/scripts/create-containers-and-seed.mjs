#!/usr/bin/env node

/**
 * Create required Cosmos containers (if missing) and then run the seeder.
 * This is intended for local development (emulator) — it detects localhost and
 * temporarily allows self-signed certificates for the process.
 */

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
  if (!endpoint || !key) {
    console.error('Missing VITE_COSMOS_ENDPOINT or VITE_COSMOS_KEY in .env')
    process.exit(2)
  }

  // allow self-signed certs for local emulator
  try {
    const url = new URL(endpoint)
    const host = url.hostname.toLowerCase()
    const localHosts = ['localhost', '127.0.0.1', '::1', 'host.docker.internal']
    if (localHosts.includes(host) || host.endsWith('.local')) {
      console.log('Local Cosmos endpoint detected — temporarily allowing self-signed certificates for this process')
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }
  } catch (err) { console.debug('[create-containers-and-seed] failed to parse endpoint URL', err) }

  let CosmosClient
  try {
    CosmosClient = (await import('@azure/cosmos')).CosmosClient
  } catch (e) {
    console.error('Failed to import @azure/cosmos. Is it installed?')
    console.error(e)
    process.exit(1)
  }

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-Setup-EnsureContainers' })

  try {
    console.log('Ensuring database exists:', dbName)
    const { database } = await client.databases.createIfNotExists({ id: dbName })

    const containers = ['users', 'groups', 'group_memberships', 'posts', 'comments']
    for (const id of containers) {
      try {
        const { container, statusCode } = await database.containers.createIfNotExists({ id, partitionKey: '/id' })
        console.log(`Ensured container ${id} (status ${statusCode || 'OK'})`)
      } catch (err) {
        console.warn(`Could not ensure container ${id}:`, err.message || err)
      }
    }

    // Run seeder
    try {
      const { seedSampleData } = await import('./seed-data.mjs')
      console.log('Running seeder (provider=cosmos, level=full)')
      await seedSampleData('cosmos', 'full')
      console.log('Seeding complete')
      process.exit(0)
    } catch (err) {
      console.error('Seeding failed:', err && err.message ? err.message : err)
      if (err && err.stack) console.error(err.stack)
      process.exit(1)
    }

  } catch (err) {
    console.error('Failed to ensure containers:', err && err.message ? err.message : err)
    if (err && err.stack) console.error(err.stack)
    process.exit(1)
  }
}

main()
