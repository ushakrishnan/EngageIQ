import { CosmosClient } from '@azure/cosmos'
import config from './config.js'

const cosmosConfig = config.database.cosmos
if (!cosmosConfig.endpoint || !cosmosConfig.key) {
  throw new Error('Missing Cosmos DB configuration in environment')
}

// Allow self-signed certs for local emulator when appropriate
try {
  const ep = String(cosmosConfig.endpoint || '')
  const url = new URL(ep)
  const localHosts = ['localhost', '127.0.0.1', '::1']
  if (localHosts.includes(url.hostname.toLowerCase()) || process.env.ALLOW_SELF_SIGNED_TLS === '1') {
    // Only do this for local development / emulator scenarios
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
} catch (e) {
  // ignore URL parsing error
}

const client = new CosmosClient({ endpoint: cosmosConfig.endpoint, key: cosmosConfig.key, userAgentSuffix: 'EngageIQ-TS-Server-v1' })
export const database = client.database(cosmosConfig.databaseName || 'EngageIQ')

export function getContainer(name: string) {
  // Map singular type names to plural container names
  const containerMap: Record<string, string> = {
    user: 'users',
    group: 'groups',
    post: 'posts',
    comment: 'comments',
    // add more mappings as needed
  }
  const mappedName = containerMap[name] || name
  return database.container(mappedName)
}

export async function getOrCreateContainer(name: string) {
  const containerMap: Record<string, string> = {
    user: 'users',
    group: 'groups',
    post: 'posts',
    comment: 'comments',
  }
  const mappedName = containerMap[name] || name
  try {
    const { container } = await database.containers.createIfNotExists({ id: mappedName, partitionKey: { paths: ['/id'] } })
    return container
  } catch (err) {
    console.error(`[db] getOrCreateContainer failed for ${mappedName}:`, err)
    // Fall back to returning container reference (may still error downstream)
    return database.container(mappedName)
  }
}

export default { client, database, getContainer }

export async function ensureContainersExist() {
  const required = ['users', 'groups', 'posts', 'comments', 'error', 'audit', 'daily-progress', 'moderation-action']
  for (const id of required) {
    try {
      // Use partition key '/id' to support point reads by id
      await database.containers.createIfNotExists({ id, partitionKey: { paths: ['/id'] } })
      console.log(`[db] ensured container exists: ${id}`)
    } catch (err) {
      console.error(`[db] failed to ensure container ${id}:`, err)
    }
  }
}
