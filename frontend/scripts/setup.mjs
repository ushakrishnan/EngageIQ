#!/usr/bin/env node

/**
 * EngageIQ Database Setup Script (Cosmos-only)
 */
import inquirer from 'inquirer'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const DATABASE_PROVIDERS = [
  {
    name: 'Azure Cosmos DB - Enterprise scale',
    value: 'cosmos',
    short: 'Cosmos DB'
  }
]

const SAMPLE_DATA_OPTIONS = [
  { name: 'Full sample data (users, groups, posts)', value: 'full' },
  { name: 'Basic sample data (minimal content)', value: 'basic' },
  { name: 'No sample data (empty database)', value: 'none' }
]

class SetupManager {
  constructor() {
    this.config = {
      database: {
        provider: '',
        cosmos: {
          endpoint: '',
          key: '',
          databaseName: 'EngageIQ'
        }
      },
      app: {
        name: 'EngageIQ',
        environment: 'development'
      },
      api: {
        enableAnalytics: false
      },
      seedData: 'full'
    }
    
    this.envPath = path.join(projectRoot, '.env')
    this.setupStatePath = path.join(projectRoot, '.setup-state.json')
  }

  async checkExistingSetup() {
    // Check if setup has already been completed
    try {
      const envExists = await fs.access(this.envPath).then(() => true).catch(() => false)
      if (envExists) {
        const envContent = await fs.readFile(this.envPath, 'utf-8')
        if (envContent.includes('SETUP_COMPLETED=')) {
          return true
        }
      }
    } catch {
      // No existing setup
    }
    return false
  }

  async checkEnvFile() {
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8')
      return envContent
    } catch {
      return null
    }
  }

  async run() {
    console.clear()
    console.log(chalk.cyan.bold('🚀 EngageIQ Setup Wizard\n'))
    console.log(chalk.white('Welcome! This wizard will help you configure EngageIQ for first-time use.\n'))

    // Check if already set up
    const alreadySetup = await this.checkExistingSetup()
    if (alreadySetup) {
      console.log(chalk.yellow('⚠️  Setup appears to have been completed already.\n'))
      const { restart } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'restart',
          message: 'Do you want to run setup again? (This will overwrite your current configuration)',
          default: false
        }
      ])
      if (!restart) {
        console.log(chalk.green('Setup cancelled. Your existing configuration is preserved.'))
        return true
      }
    }

    console.log(chalk.blue('Let\'s get started!\n'))

    try {
      // Step 1: Database provider selection (Cosmos-only)
      await this.selectDatabaseProvider()
      
      // Step 2: Database configuration (Cosmos only)
      await this.configureCosmosDB()
      
      // Step 3: Sample data configuration
      await this.configureSampleData()
      
      // Step 4: Generate .env file
      await this.generateEnvFile()
      
      // Step 5: Initialize database
      await this.initializeDatabase()
      
      // Step 6: Seed database if requested
      if (this.config.seedData !== 'none') {
        await this.seedDatabase()
      }
      
      // Step 7: Mark setup as complete
      await this.markSetupComplete()
      
      console.log(chalk.green.bold('\n🎉 Setup completed successfully!\n'))
      console.log(chalk.white('You can now start the development server:\n'))
      console.log(chalk.white('  npm run dev\n'))
      
      return true
    } catch (error) {
      console.error(chalk.red('\n❌ Setup failed:'), error.message)
      console.log(chalk.yellow('\nYou can try running setup again with: npm run setup\n'))
      return false
    }
  }

  async selectDatabaseProvider() {
    console.log(chalk.blue.bold('📊 Database Provider Selection (Cosmos-only)\n'))
    
    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Choose your database provider:',
        choices: DATABASE_PROVIDERS
      }
    ])
    
    this.config.database.provider = provider
    console.log(chalk.blue('\n📖 Azure Cosmos DB Setup Information:'))
    console.log('• Create a Cosmos DB account in Azure Portal')
    console.log('• Copy the endpoint and primary key from the Keys section')
  }

  async configureCosmosDB() {
    console.log(chalk.blue.bold('\n🔧 Azure Cosmos DB Configuration\n'))
    
    const cosmosConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'endpoint',
        message: 'Enter your Cosmos DB endpoint:',
        validate: (input) => {
          if (!input) return 'Endpoint is required'
          if (!input.startsWith('https://')) return 'Please enter a valid HTTPS endpoint'
          return true
        },
        filter: (input) => input.trim()
      },
      {
        name: 'key',
        type: 'password',
        message: 'Enter your Cosmos DB primary key:',
        validate: (input) => {
          if (!input) return 'Primary key is required'
          return true
        },
        filter: (input) => input.trim()
      },
      {
        name: 'databaseName',
        type: 'input',
        message: 'Enter your Cosmos DB database name:',
        default: 'EngageIQ',
        filter: (input) => input.trim()
      }
    ])
    
    this.config.database.cosmos.endpoint = cosmosConfig.endpoint
    this.config.database.cosmos.key = cosmosConfig.key
    this.config.database.cosmos.databaseName = cosmosConfig.databaseName

    console.log(chalk.green('Cosmos DB configuration saved.'))
  }

  async configureSampleData() {
    console.log(chalk.blue.bold('\n📦 Sample Data Configuration\n'))
    
    const { seedData } = await inquirer.prompt([
      {
        type: 'list',
        name: 'seedData',
        message: 'Choose the type of sample data to install:',
        choices: SAMPLE_DATA_OPTIONS
      }
    ])
    
    this.config.seedData = seedData
    console.log(chalk.green('Sample data preference saved:', seedData))
  }

  // Generate a simple .env and save to project root
  async generateEnvFile() {
    try {
      const envPath = path.join(projectRoot, '.env')
      const lines = []
      lines.push('# EngageIQ Configuration - generated by setup')
      lines.push(`VITE_DATABASE_PROVIDER=${this.config.database.provider}`)

      // Cosmos-only
      lines.push(`VITE_COSMOS_ENDPOINT=${this.config.database.cosmos.endpoint}`)
      lines.push(`VITE_COSMOS_KEY=${this.config.database.cosmos.key}`)
      lines.push(`VITE_COSMOS_DATABASE_NAME=${this.config.database.cosmos.databaseName || 'EngageIQ'}`)
      
      lines.push('VITE_ENABLE_ANALYTICS=false')
      
      await fs.writeFile(envPath, lines.join('\n'), 'utf8')
      console.log(chalk.green(`.env written to ${envPath}`))
    } catch (err) {
      console.error('Failed to write .env file:', err)
      throw err
    }
  }

  // Placeholder initialization - real initialization may be performed by other scripts
  async initializeDatabase() {
    console.log(chalk.blue('Initializing database (skipped by quick setup placeholder)'))
    return true
  }

  // Attempt to kick off seeding using existing seeding script if present
  async seedDatabase() {
    if (!this.config.seedData || this.config.seedData === 'none') {
      console.log('No sample data requested — skipping seeding')
      return
    }
    
    try {
      const seedScript = path.join(projectRoot, 'scripts', 'create-containers-and-seed.mjs')
      // Use child_process spawn to run seeding script
      const { spawn } = await import('child_process')
      const proc = spawn(process.execPath, [seedScript], { stdio: 'inherit' })
      
      return new Promise((resolve, reject) => {
        proc.on('exit', (code) => {
          if (code === 0) resolve(true)
          else reject(new Error(`Seeding script exited with code ${code}`))
        })
      })
    } catch (err) {
      console.error('Seeding failed:', err)
    }
  }

  async markSetupComplete() {
    const data = { completed: true, when: new Date().toISOString() }
    try {
      await fs.writeFile(this.setupStatePath, JSON.stringify(data, null, 2), 'utf8')
      console.log(chalk.green('Setup finished — state saved.'))
    } catch (err) {
      console.error('Failed to mark setup complete:', err)
    }
  }
}

// Run the setup when invoked directly
const manager = new SetupManager()
manager.run().catch(err => {
  console.error('Setup encountered an error:', err)
  process.exit(1)
})