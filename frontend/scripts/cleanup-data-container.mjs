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

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-Cleanup' })
  const { database } = await client.databases.createIfNotExists({ id: dbName })

  const { container: sourceContainer } = await database.containers.createIfNotExists({ id: sourceContainerName, partitionKey: '/partitionKey' })
  console.log(chalk.yellow('Cleaning up legacy container:'), sourceContainerName)

  const querySpec = { query: 'SELECT * FROM c' }
  const { resources } = await sourceContainer.items.query(querySpec, { maxItemCount: 1000 }).fetchAll()

  console.log(chalk.blue(`Found ${resources.length} items in ${sourceContainerName}`))

  let removed = 0
  for (const item of resources) {
    try {
      const pk = item.partitionKey || item.type || 'user'
      await sourceContainer.item(item.id, pk).delete()
      removed++
    } catch (err) {
      console.warn('Failed to delete item', item.id, err.message || err)
    }
  }

  console.log(chalk.green(`Deleted ${removed} items from ${sourceContainerName}`))
}

main().catch(err => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
