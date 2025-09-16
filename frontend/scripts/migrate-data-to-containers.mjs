#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

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
  const sourceContainerName = process.env.VITE_COSMOS_CONTAINER_NAME || 'data'

  if (!endpoint || !key) {
    console.error('Cosmos DB config missing in environment')
    process.exit(1)
  }

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-DataMigrator' })
  const { database } = await client.databases.createIfNotExists({ id: dbName })

  console.log(chalk.blue('Using database:'), dbName)
  const { container: sourceContainer } = await database.containers.createIfNotExists({ id: sourceContainerName, partitionKey: '/partitionKey' })
  console.log(chalk.yellow('Reading documents from source container:'), sourceContainerName)

  const typeToContainer = {
    user: 'users',
    post: 'posts',
    group: 'groups',
    comment: 'comments',
    report: 'reports',
    achievement: 'achievements',
    karma: 'karma',
    audit: 'audit'
  }

  // Ensure target containers exist
  for (const [type, containerName] of Object.entries(typeToContainer)) {
    await database.containers.createIfNotExists({ id: containerName, partitionKey: '/id' })
    console.log(chalk.green(`Ensured container for type=${type} -> ${containerName}`))
  }

  // Fetch all documents from source container
  const querySpec = { query: 'SELECT * FROM c' }
  const { resources } = await sourceContainer.items.query(querySpec, { maxItemCount: 1000 }).fetchAll()

  console.log(chalk.blue(`Found ${resources.length} items in source container`))

  let migrated = 0
  let skipped = 0
  for (const item of resources) {
    const t = item.type
    const targetName = typeToContainer[t]
    if (!targetName) {
      console.warn(`Skipping item ${item.id}: unknown type=${t}`)
      skipped++
      continue
    }

    const targetContainer = (await database.containers.createIfNotExists({ id: targetName, partitionKey: '/id' })).container

    const targetDoc = {
      id: item.id,
      type: item.type,
      data: item.data || item,
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now()
    }

    try {
      await targetContainer.items.upsert(targetDoc)
      migrated++
    } catch (err) {
      console.error('Failed to migrate item', item.id, err)
    }
  }

  console.log(chalk.green(`Migration complete. Migrated=${migrated}, Skipped=${skipped}`))
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
