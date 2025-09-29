#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8')
    const lines = text.split(/\r?\n/)
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        let val = m[2].trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[m[1]] = val
      }
    }
  }
}

async function main() {
  await loadEnv()
  const { CosmosClient } = await import('@azure/cosmos')

  const endpoint = process.env.VITE_COSMOS_ENDPOINT || process.env.VITE_COSMOS_ENDPOINT
  const key = process.env.VITE_COSMOS_KEY || process.env.VITE_COSMOS_KEY
  const dbName = process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ'

  if (!endpoint || !key) {
    console.error('Cosmos DB config missing in environment')
    process.exit(1)
  }

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-SetAuditTTL' })
  const { database } = await client.databases.createIfNotExists({ id: dbName })

  // TTL in seconds. Pass via CLI: --ttl 7776000 (90 days)
  const argv = process.argv.slice(2)
  let ttlArg = argv.find(a => a.startsWith('--ttl='))
  if (!ttlArg) ttlArg = argv.find(a => a === '--disable')

  if (!ttlArg) {
    console.error('Usage: set-audit-ttl.mjs --ttl=<seconds>  OR --disable to remove TTL')
    process.exit(1)
  }

  const containerId = 'audit'
  try {
    const { resource: containerDef } = await database.containers.read(containerId)
    if (!containerDef) {
      console.error('Audit container not found')
      process.exit(1)
    }

    if (ttlArg === '--disable') {
      containerDef.defaultTtl = undefined
      await database.containers.createOrReplace(containerDef)
      console.log('Disabled default TTL on audit container')
      process.exit(0)
    }

    const ttl = parseInt(ttlArg.split('=')[1], 10)
    if (Number.isNaN(ttl) || ttl < 0) {
      console.error('Invalid ttl value')
      process.exit(1)
    }

    containerDef.defaultTtl = ttl
    await database.containers.createOrReplace(containerDef)
    console.log(`Set default TTL for audit container to ${ttl} seconds`)
  } catch (err) {
    console.error('Failed to set TTL on audit container:', err)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
