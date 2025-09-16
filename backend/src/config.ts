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
    provider: process.env.VITE_DATABASE_PROVIDER || 'cosmos',
    cosmos: {
      endpoint: process.env.VITE_COSMOS_ENDPOINT,
      key: process.env.VITE_COSMOS_KEY,
      databaseName: process.env.VITE_COSMOS_DATABASE_NAME || 'EngageIQ',
      containerName: process.env.VITE_COSMOS_CONTAINER_NAME || 'data'
    }
  },
  autotagProvider: process.env.AUTOTAG_PROVIDER
}

export default config
