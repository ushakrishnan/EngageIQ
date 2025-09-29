import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

export interface Config {
  port: number
  database: {
    provider: string
    cosmos: {
      endpoint?: string
      key?: string
      databaseName?: string
      containerName?: string
    }
  }
  autotagProvider?: string
}

export const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  database: {
  // Prefer server-side env names (DATABASE_PROVIDER / COSMOS_*)
  provider: process.env.DATABASE_PROVIDER || 'cosmos',
    cosmos: {
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
      databaseName: process.env.COSMOS_DATABASE || process.env.COSMOS_DATABASE_NAME || 'EngageIQ',
      containerName: process.env.COSMOS_CONTAINER || process.env.COSMOS_CONTAINER_NAME || 'data'
    }
  },
  autotagProvider: process.env.AUTOTAG_PROVIDER
}

export default config
