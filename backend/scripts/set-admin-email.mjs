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

  if (!endpoint || !key) {
    console.error('Cosmos DB config missing in environment')
    process.exit(1)
  }

  const client = new CosmosClient({ endpoint, key, userAgentSuffix: 'EngageIQ-SetAdminEmail' })
  const { database } = await client.databases.createIfNotExists({ id: dbName })

  // Ensure per-type users container exists (partitionKey /id)
  await database.containers.createIfNotExists({ id: 'users', partitionKey: '/id' })
  const container = database.container('users')

  const adminData = {
    id: 'demo-user-admin',
    name: 'EngageIQ Admin',
    email: 'engageiq_admin@demo.com',
    avatar: '',
    bio: 'Platform administrator account',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    following: [],
    followers: [],
    title: 'Platform Admin',
    company: 'EngageIQ',
    location: '',
    experience: [],
    skills: [],
    roles: ['engageiq_admin'],
    karma: 0,
    karmaHistory: [],
    achievements: [],
    status: 'online',
    statusMessage: 'Admin user',
    interestedTopics: [],
    onboardingCompleted: true
  }

  const doc = {
    id: adminData.id,
    type: 'user',
    data: adminData,
    createdAt: adminData.joinedAt || Date.now(),
    updatedAt: Date.now()
  }

  try {
    const { resource } = await container.items.upsert(doc)
    console.log('Upserted admin user in users container:', resource.id)
  } catch (err) {
    console.error('Failed to upsert admin user:', err)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
