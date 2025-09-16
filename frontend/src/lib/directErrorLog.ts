import { cosmosConfig } from '@/lib/config'

/**
 * Best-effort direct error logger that writes to the 'errors' container
 * without using databaseService to avoid recursion.
 */
export async function directErrorLog(source: string, error: unknown, context?: Record<string, unknown> | null): Promise<void> {
  try {
    if (!cosmosConfig.endpoint || !cosmosConfig.key) {
      // no configuration available
      console.warn('[directErrorLog] Cosmos configuration missing; skipping')
      return
    }

    // Dynamically import the Cosmos SDK so we don't pull it into the main bundle
    const { CosmosClient } = await eval('import("@azure/cosmos")')
    const client = new CosmosClient({ endpoint: cosmosConfig.endpoint, key: cosmosConfig.key, userAgentSuffix: 'EngageIQ-DirectErrorLog' })
    const clientDatabases = (client as unknown as { databases?: { createIfNotExists?: (opts: Record<string, unknown>) => Promise<Record<string, unknown> | undefined> } })
    if (!clientDatabases.databases || typeof clientDatabases.databases.createIfNotExists !== 'function') {
      console.warn('[directErrorLog] Cosmos SDK does not expose databases.createIfNotExists; skipping write')
      return
    }
    const createResult = await clientDatabases.databases.createIfNotExists({ id: cosmosConfig.databaseName })
    const database = createResult && (createResult as Record<string, unknown>)['database'] as Record<string, unknown> | undefined

    // ensure the errors container exists (id: 'errors', pk: '/id')
    const containersObj = database && (database as Record<string, unknown>)['containers'] as { createIfNotExists?: (opts: Record<string, unknown>) => Promise<Record<string, unknown> | undefined> } | undefined
    if (!containersObj || typeof containersObj.createIfNotExists !== 'function') {
      console.warn('[directErrorLog] database.containers.createIfNotExists not available; skipping write')
      return
    }
    const containerCreateResult = await containersObj.createIfNotExists({ id: 'errors', partitionKey: '/id' })
    const container = containerCreateResult && (containerCreateResult as Record<string, unknown>)['container'] as Record<string, unknown> | undefined

    const id = `error-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const maybeErrorObj = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {}
    const doc = {
      id,
      partitionKey: 'error',
      type: 'error',
      data: {
        source,
        message: (maybeErrorObj['message'] ? String(maybeErrorObj['message']) : String(error)),
        stack: (maybeErrorObj['stack'] ? String(maybeErrorObj['stack']) : undefined),
        context: context || null,
        ts: Date.now()
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const itemsObj = container && (container as Record<string, unknown>)['items'] as { create?: (d: Record<string, unknown>) => Promise<unknown> } | undefined
    if (!itemsObj || typeof itemsObj.create !== 'function') {
      console.warn('[directErrorLog] container.items.create not available; skipping write')
      return
    }
    await itemsObj.create(doc)
  } catch (err) {
    try { console.error('[directErrorLog] failed to write error log', err) } catch { /* ignore */ }
  }
}
