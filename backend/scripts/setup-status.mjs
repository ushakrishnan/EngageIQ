#!/usr/bin/env node

/**
 * EngageIQ Setup Status Checker
 * 
 * This script checks the current setup status and provides guidance
 * on what steps need to be completed.
 */

import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

async function checkSetupStatus() {
  console.clear()
  console.log(chalk.cyan.bold('🔍 EngageIQ Setup Status Check\n'))

  const envPath = path.join(projectRoot, '.env')
  const exampleEnvPath = path.join(projectRoot, '.env.example')
  
  try {
    const envExists = await fs.access(envPath).then(() => true).catch(() => false)
    
    if (!envExists) {
      console.log(chalk.red('❌ .env file not found'))
      console.log(chalk.yellow('   You need to configure your database settings.\n'))
      
      const exampleExists = await fs.access(exampleEnvPath).then(() => true).catch(() => false)
      if (exampleExists) {
        console.log(chalk.blue('💡 Quick setup options:'))
        console.log(chalk.white('   1. Run interactive setup: npm run setup'))
        console.log(chalk.white('   2. Copy example file: cp .env.example .env'))
        console.log(chalk.white('      Then edit .env with your database credentials\n'))
      }
      
      return false
    }

    const envContent = await fs.readFile(envPath, 'utf-8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '')
        }
      }
    })

    console.log(chalk.green('✅ .env file found'))
    
    const provider = envVars.VITE_DATABASE_PROVIDER
    if (!provider) {
      console.log(chalk.red('❌ Database provider not set'))
      console.log(chalk.yellow('   Set VITE_DATABASE_PROVIDER to "cosmos"\n'))
      return false
    }
    
    console.log(chalk.green(`✅ Database provider: ${provider}`))
    
    if (provider === 'cosmos') {
      const endpoint = envVars.VITE_COSMOS_ENDPOINT
      const key = envVars.VITE_COSMOS_KEY
      const dbName = envVars.VITE_COSMOS_DATABASE_NAME
      
      if (!endpoint || !key) {
        console.log(chalk.red('❌ Cosmos DB configuration incomplete'))
        console.log(chalk.yellow('   Missing required Cosmos DB credentials\n'))
        console.log(chalk.blue('   Required variables:'))
        console.log(chalk.white('   - VITE_COSMOS_ENDPOINT'))
        console.log(chalk.white('   - VITE_COSMOS_KEY\n'))
        return false
      }
      
      console.log(chalk.green('✅ Cosmos DB configuration complete'))
      console.log(chalk.white(`   Endpoint: ${endpoint}`))
      console.log(chalk.white(`   Database: ${dbName || 'EngageIQ'}`))
      console.log(chalk.white(`   Key: ${key.substring(0, 20)}...\n`))
    } else {
      console.log(chalk.red('❌ Unsupported database provider. Please set VITE_DATABASE_PROVIDER to "cosmos"'))
      return false
    }
    
    const setupCompleted = envVars.SETUP_COMPLETED
    if (setupCompleted) {
      console.log(chalk.green(`✅ Setup completed: ${new Date(setupCompleted).toLocaleString()}`))
      const seedData = envVars.SETUP_SEED_DATA
      if (seedData) {
        console.log(chalk.green(`✅ Sample data: ${seedData}`))
      }
    } else {
      console.log(chalk.yellow('⚠️  Setup not fully completed'))
      console.log(chalk.blue('   Run: npm run setup\n'))
    }
    
    console.log(chalk.green.bold('\n🎉 Configuration looks good!'))
    console.log(chalk.white('Ready to start the application:\n'))
    console.log(chalk.white('  npm run dev\n'))
    
    return true
    
  } catch (error) {
    console.error(chalk.red('❌ Error checking setup status:'), error.message)
    return false
  }
}

async function main() {
  const isConfigured = await checkSetupStatus()
  
  if (isConfigured) {
    await showNextSteps()
  } else {
    console.log(chalk.blue.bold('🚀 Getting Started:\n'))
    console.log(chalk.white('Run the interactive setup wizard:'))
    console.log(chalk.gray('  npm run setup\n'))
    console.log(chalk.white('Or manually create .env file:'))
    console.log(chalk.gray('  cp .env.example .env'))
    console.log(chalk.gray('  # Then edit .env with your credentials\n'))
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Status check failed:'), error)
    process.exit(1)
  })
}

export { checkSetupStatus }
