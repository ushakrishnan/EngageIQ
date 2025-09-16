declare module '@azure/cosmos' {
  export class CosmosClient {
    constructor(options?: Record<string, unknown>)
    // Minimal surface area used by lightweight dev utilities; callers should narrow as needed.
    databases?: {
      createIfNotExists?: (opts: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>
    }
    getDatabaseAccount?: () => Promise<Record<string, unknown>>
  }
  export default CosmosClient;
}
