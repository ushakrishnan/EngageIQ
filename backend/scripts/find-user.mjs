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
  const containerName = process.env.VITE_COSMOS_CONTAINER_NAME || 'data'

  if (!endpoint || !key) {
    console.error('Cosmos DB config missing in environment')
    process.exit(1)
  }

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-QueryUser' })
  const { database } = await client.databases.createIfNotExists({ id: dbName })
  const { container } = await database.containers.createIfNotExists({ id: containerName, partitionKey: '/partitionKey' })

  const querySpec = {
    query: 'SELECT * FROM c WHERE c.type = @type AND (c.data.email = @e1 OR c.data.email = @e2)',
    parameters: [
      { name: '@type', value: 'user' },
      { name: '@e1', value: 'engageiq_admin' },
      { name: '@e2', value: 'engageiq_admin@demo.com' }
    ]
  }

  const { resources } = await container.items.query(querySpec).fetchAll()
  if ((resources || []).length === 0) {
    console.log('No engageiq_admin user found')
  } else {
    console.log('Found user(s):')
    console.log(JSON.stringify(resources, null, 2))
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
