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
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

async function main() {
  await loadEnv()
  const { CosmosClient } = await import('@azure/cosmos')

  const endpoint = process.env.VITE_COSMOS_ENDPOINT
  const key = process.env.VITE_COSMOS_KEY
  const dbName = process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ'

  if (!endpoint || !key) {
    console.error('Cosmos DB config missing in environment')
    process.exit(1)
  }

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-WriteAudit' })
  const { database } = await client.databases.createIfNotExists({ id: dbName })

  const container = database.container('audit')

  const id = `audit-test-${Date.now()}-${Math.floor(Math.random()*1000)}`
  const doc = {
    id,
    partitionKey: 'audit',
    type: 'audit',
    data: {
      action: 'test_audit',
      actorId: 'verify-script',
      actorName: 'verify-script',
      ts: Date.now(),
      note: 'quick verify'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  try {
    const { resource } = await container.items.upsert(doc)
    console.log('Upserted audit ID:', resource.id)
  } catch (err) {
    console.error('Failed to upsert audit doc:', err)
    process.exit(1)
  }

  try {
    const querySpec = { query: 'SELECT TOP 5 * FROM c WHERE c.type = @type ORDER BY c.createdAt DESC', parameters: [ { name: '@type', value: 'audit' } ] }
    const { resources } = await container.items.query(querySpec).fetchAll()
    console.log('Recent audit docs:')
    for (const r of resources) {
      console.log('-', r.id, ':', r.data && r.data.action ? r.data.action : '')
    }
  } catch (err) {
    console.error('Failed to query audit docs:', err)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
