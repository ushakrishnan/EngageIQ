#!/usr/bin/env node

/**
 * Quick Environment Setup for Cosmos DB
 * 
 * This script helps users quickly configure their .env file for Cosmos DB usage.
 * It prompts for the essential values and updates the configuration.
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Promisify readline question
const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve))

const log = (message, color = chalk.white) => console.log(color(message))
const logError = (message) => log(`❌ ${message}`, chalk.red)
const logSuccess = (message) => log(`✅ ${message}`, chalk.green)
const logInfo = (message) => log(`ℹ️  ${message}`, chalk.blue)
const logWarning = (message) => log(`⚠️  ${message}`, chalk.yellow)

/**
 * Display help information
 */
function displayHelp() {
  console.clear()
  log('🚀 EngageIQ Cosmos DB Quick Setup', chalk.cyan.bold)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', chalk.cyan)
  console.log()
  logInfo('This tool will help you configure your .env file for Azure Cosmos DB.')
  console.log()
  
  log('What you need:', chalk.bright)
  console.log('  1. Azure Cosmos DB account (created in Azure Portal)')
  console.log('  2. Connection string or endpoint + key from Azure Portal')
  console.log()
  
  log('Where to find your credentials in Azure Portal:', chalk.bright)
  console.log('  1. Go to your Cosmos DB account')
  console.log('  2. Navigate to Settings → Keys')
  console.log('  3. Copy the URI and PRIMARY KEY')
  console.log()
}

/**
 * Get current environment configuration
 */
function getCurrentConfig() {
  const envPath = path.join(projectRoot, '.env')
  
  if (!fs.existsSync(envPath)) {
    return null
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  return {
    provider: getEnvValue(envContent, 'VITE_DATABASE_PROVIDER'),
    endpoint: getEnvValue(envContent, 'VITE_COSMOS_ENDPOINT'),
    key: getEnvValue(envContent, 'VITE_COSMOS_KEY'),
    databaseName: getEnvValue(envContent, 'VITE_COSMOS_DATABASE_NAME'),
    containerName: getEnvValue(envContent, 'VITE_COSMOS_CONTAINER_NAME')
  }
}

/**
 * Extract environment variable value from env content
 */
function getEnvValue(envContent, key) {
  const regex = new RegExp(`^${key}=(.*)$`, 'm')
  const match = envContent.match(regex)
  return match ? match[1].replace(/['"]/g, '') : ''
}

/**
 * Validate URL format
 */
function isValidCosmosUrl(url) {
  try {
    const urlObj = new URL(url)
    const host = urlObj.hostname.toLowerCase()
    const localHosts = ['localhost', '127.0.0.1', '::1', 'host.docker.internal']
    const isAzureEndpoint = host.includes('documents.azure.com')
    const isLocalEndpoint = localHosts.includes(host) || host.endsWith('.local')
    return isAzureEndpoint || isLocalEndpoint
  } catch {
    return false
  }
}

/**
 * Get user input for configuration
 */
async function getUserConfiguration() {
  const config = {}
  
  // Get endpoint
  while (!config.endpoint) {
    const endpoint = await question(chalk.yellow('Enter your Cosmos DB Endpoint URL: '))
    
    if (!endpoint.trim()) {
      logError('Endpoint URL is required!')
      continue
    }
    
    if (!isValidCosmosUrl(endpoint.trim())) {
      logWarning('This doesn\'t look like a valid Cosmos DB endpoint URL.')
      logWarning('Expected format: https://your-account.documents.azure.com:443/')
      const confirm = await question('Continue anyway? (y/n): ')
      if (confirm.toLowerCase() !== 'y') continue
    }
    
    config.endpoint = endpoint.trim()
  }

  // Get primary key
  while (!config.key) {
    const key = await question(chalk.yellow('Enter your Cosmos DB Primary Key: '))
    
    if (!key.trim()) {
      logError('Primary Key is required!')
      continue
    }
    
    if (key.trim().length < 50) {
      logWarning('This seems too short for a Cosmos DB primary key.')
      const confirm = await question('Continue anyway? (y/n): ')
      if (confirm.toLowerCase() !== 'y') continue
    }
    
    config.key = key.trim()
  }

  // Get database name (with default)
  const dbName = await question(chalk.yellow('Database name [EngageIQ]: '))
  config.databaseName = dbName.trim() || 'EngageIQ'

  // Get container name (with default)
  const containerName = await question(chalk.yellow('Container name [data]: '))
  config.containerName = containerName.trim() || 'data'

  return config
}

/**
 * Update .env file with new configuration
 */
function updateEnvFile(config) {
  const envPath = path.join(projectRoot, '.env')
  let envContent = ''
  
  // Read existing .env or create new
  if (fs.existsSync(envPath)) {
    logInfo('Updating existing .env file...')
    envContent = fs.readFileSync(envPath, 'utf8')
  } else {
    logInfo('Creating new .env file...')
    envContent = [
      '# EngageIQ Environment Configuration',
      '# Generated by Cosmos DB quick setup',
      `# Generated on: ${new Date().toISOString()}`,
      '',
      '# Application Settings',
      'VITE_APP_NAME=EngageIQ',
      'VITE_ENVIRONMENT=development',
      'VITE_ENABLE_ANALYTICS=false',
      ''
    ].join('\n')
  }

  // Update database provider
  envContent = updateEnvVar(envContent, 'VITE_DATABASE_PROVIDER', 'cosmos')
  
  // Update Cosmos DB settings
  envContent = updateEnvVar(envContent, 'VITE_COSMOS_ENDPOINT', config.endpoint)
  envContent = updateEnvVar(envContent, 'VITE_COSMOS_KEY', config.key)
  envContent = updateEnvVar(envContent, 'VITE_COSMOS_DATABASE_NAME', config.databaseName)
  envContent = updateEnvVar(envContent, 'VITE_COSMOS_CONTAINER_NAME', config.containerName)

  // Write updated content
  fs.writeFileSync(envPath, envContent, 'utf8')
  logSuccess('Environment configuration updated!')
}

/**
 * Update or insert environment variable in content
 */
function updateEnvVar(envContent, key, value, allowEmpty = false) {
  const regex = new RegExp(`^${key}=.*$`, 'm')
  const newLine = `${key}=${value}`

  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, newLine)
  } else {
    if (envContent.includes('# Application Settings')) {
      envContent = envContent.replace('# Application Settings', `# Application Settings\n${newLine}`)
    } else {
      envContent += `\n${newLine}\n`
    }
  }

  return envContent
}

/**
 * Main flow
 */
async function main() {
  displayHelp()
  const existing = getCurrentConfig()
  if (existing) {
    logInfo('Existing configuration detected:')
    console.log(existing)
    const answer = await question('Would you like to update it? (y/n): ')
    if (answer.toLowerCase() !== 'y') {
      console.log('No changes made. Exiting.')
      process.exit(0)
    }
  }

  const userConfig = await getUserConfiguration()
  updateEnvFile(userConfig)
  logSuccess('Quick setup complete!')
  rl.close()
}

if (require.main === module) {
  main().catch(err => {
    console.error('Quick setup failed:', err)
    process.exit(1)
  })
}

export { updateEnvFile }