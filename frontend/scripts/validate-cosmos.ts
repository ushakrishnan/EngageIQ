
// Cosmos DB connectivity check for frontend (Vite/React)
// Usage: Run with `ts-node` or as a Vite script (not in browser)

import 'dotenv/config'; // Load .env for Node/tsx
import { cosmosConfig } from '../src/lib/config'
import { CosmosClient } from '@azure/cosmos'

async function validateCosmosFrontend() {
  console.log('\n🌐 EngageIQ Frontend Cosmos DB Connectivity Check')
  const { endpoint, key, databaseName, containerName } = cosmosConfig

  if (!endpoint || !key) {
    console.error('❌ Missing Cosmos DB endpoint or key in frontend config')
    process.exit(1)
  }

  try {
    const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-Frontend-Validator' })
    const { database } = await client.databases.createIfNotExists({ id: databaseName })
    const { container } = await database.containers.createIfNotExists({ id: containerName, partitionKey: '/partitionKey' })
    const testItem = {
      id: 'frontend-test-' + Date.now(),
      partitionKey: 'test',
      type: 'test',
      data: { message: 'Frontend validation test' },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await container.items.create(testItem)
    console.log('✅ Write operation successful (frontend)')
    const { resource } = await container.item(testItem.id, 'test').read()
    if (resource && resource.data.message === 'Frontend validation test') {
      console.log('✅ Read operation successful (frontend)')
    } else {
      throw new Error('Read operation returned unexpected data (frontend)')
    }
    await container.item(testItem.id, 'test').delete()
    console.log('✅ Delete operation successful (frontend)')
    console.log('\n🎉 Frontend Cosmos DB connectivity validated!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Frontend Cosmos DB connectivity failed:', error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateCosmosFrontend()
}
