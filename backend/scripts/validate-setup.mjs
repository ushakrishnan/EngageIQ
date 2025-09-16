#!/usr/bin/env node

/**
 * Setup Validation Script
 * 
 * Validates that the setup was completed successfully and all components are working
 */

import chalk from 'chalk'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

class SetupValidator {
  constructor() {
    this.envPath = path.join(projectRoot, '.env')
    this.setupStatePath = path.join(projectRoot, '.setup-complete')
  }

  async validateEnvironment() {
    console.log(chalk.blue('📋 Validating environment configuration...'))
    
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8')
      
      // Parse environment variables
      const envVars = {}
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && !key.startsWith('#')) {
          envVars[key.trim()] = valueParts.join('=').trim()
        }
      })
      
      // Check required variables
      const provider = envVars.VITE_DATABASE_PROVIDER
      if (!provider) {
        throw new Error('VITE_DATABASE_PROVIDER not set')
      }
      
      console.log(chalk.green(`  ✅ Database provider: ${provider}`))
      
      if (provider === 'cosmos') {
        if (!envVars.VITE_COSMOS_ENDPOINT) throw new Error('VITE_COSMOS_ENDPOINT not set')
        if (!envVars.VITE_COSMOS_KEY) throw new Error('VITE_COSMOS_KEY not set')
        console.log(chalk.green('  ✅ Cosmos DB configuration valid'))
      } else {
        throw new Error('Unsupported database provider. Set VITE_DATABASE_PROVIDER to "cosmos"')
      }
      
      return true
    } catch (error) {
      console.log(chalk.red(`  ❌ Environment validation failed: ${error.message}`))
      return false
    }
  }

  async validateDatabaseConnection() {
    console.log(chalk.blue('🔗 Testing database connection...'))
    
    try {
      // Dynamic import to avoid module loading issues
      const configModule = await import('../src/lib/config.ts')
      const { config } = configModule
      
      if (config.database.provider === 'cosmos') {
        return await this.testCosmosConnection(config.database.cosmos)
      }
      
      return false
    } catch (error) {
      console.log(chalk.red(`  ❌ Database connection test failed: ${error.message}`))
      return false
    }
  }

  async testCosmosConnection(cosmosConfig) {
    try {
      const { CosmosClient } = await import('@azure/cosmos')
      const client = new CosmosClient({
        endpoint: cosmosConfig.endpoint,
        key: cosmosConfig.key
      })
      
      // Test connection
      const { database } = await client.databases.readOrCreate({
        id: cosmosConfig.databaseName || 'EngageIQ'
      })
      
      console.log(chalk.green('  ✅ Cosmos DB connection successful'))
      return true
    } catch (error) {
      console.log(chalk.red(`  ❌ Cosmos DB connection failed: ${error.message}`))
      return false
    }
  }

  async validateSetupCompletion() {
    console.log(chalk.blue('📝 Checking setup completion status...'))
    
    try {
      const setupInfo = await fs.readFile(this.setupStatePath, 'utf-8')
      const setupData = JSON.parse(setupInfo)
      
      console.log(chalk.green(`  ✅ Setup completed: ${setupData.completedAt}`))
      console.log(chalk.green(`  ✅ Provider: ${setupData.provider}`))
      console.log(chalk.green(`  ✅ Sample data: ${setupData.seedData}`))
      
      return true
    } catch (error) {
      console.log(chalk.red('  ❌ Setup completion file not found or invalid'))
      return false
    }
  }

  async run() {
    console.log(chalk.cyan.bold('\n🔍 EngageIQ Setup Validation\n'))
    
    const results = {
      environment: await this.validateEnvironment(),
      database: await this.validateDatabaseConnection(),
      completion: await this.validateSetupCompletion()
    }
    
    console.log(chalk.blue('\n📊 Validation Summary:'))
    console.log(`Environment: ${results.environment ? chalk.green('✅ Valid') : chalk.red('❌ Invalid')}`)
    console.log(`Database: ${results.database ? chalk.green('✅ Connected') : chalk.red('❌ Failed')}`)
    console.log(`Setup: ${results.completion ? chalk.green('✅ Complete') : chalk.red('❌ Incomplete')}`)
    
    const allValid = Object.values(results).every(Boolean)
    
    if (allValid) {
      console.log(chalk.green.bold('\n🎉 All validations passed! Your setup is ready.'))
      console.log(chalk.cyan('\nYou can now start the development server:'))
      console.log(chalk.white('  npm run dev'))
    } else {
      console.log(chalk.red.bold('\n⚠️  Some validations failed. Please check the issues above.'))
      console.log(chalk.yellow('\nTo reconfigure:'))
      console.log(chalk.white('  npm run setup:force'))
    }
    
    return allValid
  }
}

// CLI entry point
async function main() {
  const validator = new SetupValidator()
  const success = await validator.run()
  process.exit(success ? 0 : 1)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red.bold('Validation failed:'), error)
    process.exit(1)
  })
}

export { SetupValidator }
