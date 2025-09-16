#!/usr/bin/env node

/**
 * Startup Check Script
 * 
 * This script runs before the application starts to check if setup is needed.
 * It automatically triggers the setup process if the database is not configured.
 */

import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

class StartupChecker {
  constructor() {
    this.envPath = path.join(projectRoot, '.env')
    this.setupStatePath = path.join(projectRoot, '.setup-complete')
  }

  async checkSetupRequired() {
    try {
      await fs.access(this.setupStatePath)
      const envExists = await this.checkEnvFile()
      if (!envExists) {
        return true
      }
      const dbConnectable = await this.checkDatabaseConnection()
      if (!dbConnectable) {
        console.log(chalk.yellow('⚠️  Database connection failed. Setup may be required.'))
        return true
      }
      return false
    } catch {
      return true
    }
  }

  async checkEnvFile() {
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8')
      const hasProvider = envContent.includes('VITE_DATABASE_PROVIDER=')
      const hasCosmosEndpoint = envContent.includes('VITE_COSMOS_ENDPOINT=') && envContent.match(/VITE_COSMOS_ENDPOINT=.+/)
      const hasCosmosKey = envContent.includes('VITE_COSMOS_KEY=') && envContent.match(/VITE_COSMOS_KEY=.+/)
      const isCosmosConfigured = hasCosmosEndpoint && hasCosmosKey
      return hasProvider && isCosmosConfigured
    } catch {
      return false
    }
  }

  async checkDatabaseConnection() {
    try {
      const configModule = await import('../src/lib/config.ts')
      const { config } = configModule
      if (config.database.provider === 'cosmos') {
        return await this.checkCosmosConnection(config.database.cosmos)
      }
      return false
    } catch (error) {
      console.log(chalk.red('Database connection check failed:', error.message))
      return false
    }
  }

  async checkCosmosConnection(cosmosConfig) {
    try {
      if (!cosmosConfig.endpoint || !cosmosConfig.key) {
        return false
      }
      const { CosmosClient } = await import('@azure/cosmos')
      const client = new CosmosClient({
        endpoint: cosmosConfig.endpoint,
        key: cosmosConfig.key
      })
      const { database } = await client.databases.readOrCreate({ id: cosmosConfig.databaseName || 'EngageIQ' })
      return true
    } catch {
      return false
    }
  }

  async runSetup() {
    console.log(chalk.cyan.bold('\n🔧 Database setup required. Starting interactive setup...\n'))
    return new Promise((resolve, reject) => {
      const setupProcess = spawn('node', ['scripts/setup.mjs'], {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env }
      })
      setupProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green.bold('\n✅ Setup completed successfully!\n'))
          resolve(true)
        } else {
          console.log(chalk.red.bold('\n❌ Setup failed. Please run "npm run setup" manually.\n'))
          reject(new Error(`Setup process exited with code ${code}`))
        }
      })
      setupProcess.on('error', (error) => {
        console.error(chalk.red.bold('\n❌ Failed to start setup process:'), error.message)
        reject(error)
      })
    })
  }

  async run() {
    console.log(chalk.blue('🚀 Starting EngageIQ...'))
    const setupRequired = await this.checkSetupRequired()
    if (setupRequired) {
      try {
        await this.runSetup()
        console.log(chalk.green('🎉 Ready to start the application!'))
        return true
      } catch (error) {
        console.error(chalk.red('Setup failed:', error.message))
        console.log(chalk.yellow('\nYou can run setup manually with: npm run setup:force'))
        return false
      }
    } else {
      console.log(chalk.green('✅ Database is configured and ready'))
      return true
    }
  }
}

// CLI entry point
async function main() {
  const checker = new StartupChecker()
  const success = await checker.run()
  if (!success) {
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Startup check failed:', err)
    process.exit(1)
  })
}

export { StartupChecker }
