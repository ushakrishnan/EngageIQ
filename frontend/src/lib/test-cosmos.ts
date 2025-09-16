/**
 * Simple test utility to verify Cosmos DB connectivity
 * This can be called from the console for debugging
 */

export async function testCosmosConnection(endpoint: string, key: string) {
  try {
    console.log('Testing Cosmos DB connection...')
    console.log('Endpoint:', endpoint)
    console.log('Key length:', key.length)
    
    // Cosmos SDK is imported dynamically when the test is invoked to avoid bundling it in the main app
    // use eval to avoid static analysis by Vite so the SDK isn't required as a dev dependency
    const { CosmosClient } = await eval('import("@azure/cosmos")')
    const client = new CosmosClient({ endpoint, key })
    const maybeClient = client as unknown as { getDatabaseAccount?: () => Promise<Record<string, unknown>> }
    const account = maybeClient.getDatabaseAccount ? await maybeClient.getDatabaseAccount() : undefined
    
    console.log('✅ Connection successful!')
    const resource = (account as unknown as Record<string, unknown>)?.resource as Record<string, unknown> | undefined
    console.log('Account ID:', resource?.id)
    console.log('Consistency policy:', resource?.consistencyPolicy)
    const readableLocations = Array.isArray(resource?.readableLocations) ? resource!.readableLocations as Array<Record<string, unknown>> : []
    console.log('Regions:', readableLocations.map(r => r.name))
    
    return true
  } catch (error: unknown) {
    const errObj = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {}
    console.error('❌ Connection failed:', error)
    console.error('Error code:', errObj['code'])
    console.error('Error message:', errObj['message'])
    
    return false
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).testCosmosConnection = testCosmosConnection as unknown
 }