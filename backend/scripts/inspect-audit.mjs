(async () => {
  try {
    const { CosmosClient } = await import('@azure/cosmos')
    const endpoint = process.env.VITE_COSMOS_ENDPOINT || 'https://localhost:8081'
    const key = process.env.VITE_COSMOS_KEY || 'FILL THE KEY HERE FOR TESTING'
    const dbName = process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ'
    const client = new CosmosClient({ endpoint, key })
    const db = client.database(dbName)
    const container = db.container('audit')
    const { resources } = await container.items.query('SELECT * FROM c ORDER BY c.createdAt DESC').fetchAll()
    console.log('audit items count:', (resources||[]).length)
    console.log(JSON.stringify(resources.slice(0,10), null, 2))
  } catch (e) {
    console.error('inspect-audit error', e)
    process.exit(1)
  }
})()
