/**
 * Database Service Factory
 *
 * This module provides a unified interface for database operations,
 * abstracting away the specific database implementation (Cosmos DB only).
 */




// Define common interfaces that both services should implement
export type DatabaseItemType =
  | 'user'
  | 'post'
  | 'group'
  | 'comment'
  | 'report'
  | 'achievement'
  | 'karma'
  | 'audit'
  | 'error'
  | 'daily-progress'
  | 'moderation-action'
  | 'auto-moderation-rule'
  | 'user-moderation-status';

export interface DatabaseItem {
  id: string;
  type: DatabaseItemType;
  data: unknown;
  createdAt: number;
  updatedAt: number;
  partitionKey?: string;
}

export interface DatabaseService {
  initialize(): Promise<void>
  create(item: Omit<DatabaseItem, 'createdAt' | 'updatedAt'>): Promise<DatabaseItem>
  read(id: string, partitionKey?: string): Promise<DatabaseItem | null>
  update(item: DatabaseItem): Promise<DatabaseItem>
  delete(id: string, partitionKey?: string): Promise<void>
  queryByType(type: DatabaseItem['type'], limit?: number): Promise<DatabaseItem[]>
  query(querySpec: unknown, options?: unknown): Promise<DatabaseItem[]>
  getAllByType(
    type: DatabaseItem['type'],
    continuationToken?: string,
    maxItemCount?: number
  ): Promise<{ items: DatabaseItem[], continuationToken?: string }>
  bulkUpsert(items: Omit<DatabaseItem, 'createdAt' | 'updatedAt'>[]): Promise<DatabaseItem[]>
  searchByContent(searchTerm: string, type?: DatabaseItem['type']): Promise<DatabaseItem[]>
  getStats(): Promise<{ 
    totalItems: number
    itemsByType: Record<string, number>
    lastUpdated: number 
  }>
  // Log an application error to the data store. Implementations should avoid throwing on failure.
  logError(source: string, error: unknown, context?: unknown): Promise<void>
}


// REST API Service Adapter
class RestApiDatabaseAdapter implements DatabaseService {
  async initialize(): Promise<void> {
    // No initialization needed for REST API
    return
  }

  async create(item: Omit<DatabaseItem, 'createdAt' | 'updatedAt'>): Promise<DatabaseItem> {
    const res = await fetch(`/api/items/${item.type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error('Failed to create item')
    return await res.json()
  }

  async read(id: string, type?: string): Promise<DatabaseItem | null> {
    if (!type) throw new Error('Type (container) is required for read')
    const res = await fetch(`/api/items/${type}/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Failed to fetch item')
    return await res.json()
  }

  async update(item: DatabaseItem): Promise<DatabaseItem> {
    const res = await fetch(`/api/items/${item.type}/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error('Failed to update item')
    return await res.json()
  }

  async delete(id: string, type?: string): Promise<void> {
    if (!type) throw new Error('Type (container) is required for delete')
    const res = await fetch(`/api/items/${type}/${id}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) throw new Error('Failed to delete item')
  }

  async queryByType(type: DatabaseItem['type']): Promise<DatabaseItem[]> {
    const base = (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) ? (process.env.API_BASE_URL.replace(/\/$/, '')) : ''
    const url = `${base}/api/items/${type}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch items')
    return await res.json()
  }

  async query(): Promise<DatabaseItem[]> {
    // Not implemented in REST API
    throw new Error('Custom query not supported in REST API')
  }

  async getAllByType(type: DatabaseItem['type']): Promise<{ items: DatabaseItem[] }> {
     const items = await this.queryByType(type)
     return { items }
   }

  async bulkUpsert(items: Omit<DatabaseItem, 'createdAt' | 'updatedAt'>[]): Promise<DatabaseItem[]> {
    const results: DatabaseItem[] = []
    for (const it of items) {
      try {
        const res = await this.create({ id: it.id as string, type: it.type, data: it.data })
        results.push(res)
      } catch (e) {
        // Best-effort: log and continue with remaining items
        try {
          await this.logError('bulkUpsert.itemFailed', e, { id: it.id, type: it.type })
        } catch { /* ignore logging errors */ }
      }
    }
    return results
  }

  async searchByContent(): Promise<DatabaseItem[]> {
    // Not implemented in REST API
    throw new Error('Search by content not supported in REST API')
  }

  async getStats(): Promise<{ totalItems: number, itemsByType: Record<string, number>, lastUpdated: number }> {
    // Not implemented in REST API
    throw new Error('Get stats not supported in REST API')
  }

  async logError(source: string, error: unknown, context?: unknown): Promise<void> {
    try {
      const id = `error-${Date.now()}-${Math.floor(Math.random()*1000)}`
      const payload = {
        id,
        partitionKey: 'error',
        type: 'error',
        data: {
          id,
          source,
          message: (() => { const maybe = error as unknown; return (maybe && typeof (maybe as { message?: unknown }).message === 'string') ? (maybe as { message?: string }).message : (typeof error === 'string' ? error : JSON.stringify(error)) })(),
          stack: (() => { const maybe = error as unknown; return (maybe && typeof (maybe as { stack?: unknown }).stack === 'string') ? (maybe as { stack?: string }).stack : undefined })(),
          context: context || undefined,
          timestamp: Date.now()
        }
      }
      // Use the existing REST create endpoint to persist the error. Fail silently on network/backend errors.
      try {
        await fetch(`/api/items/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } catch (e) {
        // Best-effort logging — don't throw from logger
        console.error('[RestApiDatabaseAdapter] logError POST failed', e)
      }
    } catch (e) {
      console.error('[RestApiDatabaseAdapter] logError failed to build payload', e)
    }
  }
}

function createDatabaseService(): DatabaseService {
  console.log('🌐 Using REST API as database provider')
  return new RestApiDatabaseAdapter()
}

// Export the configured service instance
export const databaseService = createDatabaseService()

// Initialize the service on module load
let initializationPromise: Promise<void> | null = null

export async function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = databaseService.initialize()
  }
  return initializationPromise
}

// Export config for convenience
export { config } from './config'

// NOTE: This relative import is intentional to allow migration scripts to execute
// in environments where tsconfig path aliases are not available at runtime.
// Other modules continue to use '@/...' aliases (resolved by the app bundler).

export default databaseService