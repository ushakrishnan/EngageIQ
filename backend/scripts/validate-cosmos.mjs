#!/usr/bin/env node

/**
 * Cosmos DB Setup Validation Script
 * 
 * This script validates that Azure Cosmos DB is properly configured
 * and can be accessed by the EngageIQ application.
 */

import { CosmosClient } from '@azure/cosmos'
import chalk from 'chalk'

// Import environment variables directly since we can't import the TS config
const getEnvVar = (key, fallback = '') => {
  const value = process.env[key]
  return value || fallback
}

// Create config object directly
const config = {
  database: {
    provider: getEnvVar('VITE_DATABASE_PROVIDER', 'cosmos'),
    cosmos: {
      endpoint: getEnvVar('VITE_COSMOS_ENDPOINT'),
      key: getEnvVar('VITE_COSMOS_KEY'),
      databaseName: getEnvVar('VITE_COSMOS_DATABASE_NAME', 'EngageIQ'),
      containerName: getEnvVar('VITE_COSMOS_CONTAINER_NAME', 'data')
    }
  }
}

async function validateCosmosSetup() {
  console.log(chalk.blue.bold('\n🌐 EngageIQ Cosmos DB Setup Validator\n'))
  
  // Check if Cosmos DB is configured as the provider
  if (config.database.provider !== 'cosmos') {
    console.log(chalk.yellow('⚠️  Database provider is not set to "cosmos"'))
    console.log(chalk.gray(`   Current provider: ${config.database.provider}`))
    console.log(chalk.gray('   Set VITE_DATABASE_PROVIDER=cosmos in your .env file'))
    return false
  }

  console.log(chalk.green('✅ Database provider set to Cosmos DB'))

  // Check environment variables
  const { endpoint, key, databaseName, containerName } = config.database.cosmos
  
  console.log('\n📋 Configuration Check:')
  
  if (!endpoint) {
    console.log(chalk.red('❌ VITE_COSMOS_ENDPOINT is not set'))
    return false
  }
  console.log(chalk.green(`✅ Endpoint: ${endpoint.substring(0, 30)}...`))

  if (!key) {
    console.log(chalk.red('❌ VITE_COSMOS_KEY is not set'))
    return false
  }
  console.log(chalk.green(`✅ Key: ${key.substring(0, 10)}...************`))

  console.log(chalk.green(`✅ Database Name: ${databaseName}`))
  console.log(chalk.green(`✅ Container Name: ${containerName}`))

  // Test connection
  console.log('\n🔌 Testing Connection...')
  
  try {
    // Allow self-signed certs for local emulator when requested (non-production only)
    try {
      const host = new URL(endpoint).hostname
      if (host === 'localhost' || host === '127.0.0.1' || process.env.ALLOW_SELF_SIGNED_TLS === '1') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      }
    } catch (e) {
      // ignore URL parse errors
    }
    const client = new CosmosClient({
      endpoint,
      key,
      userAgentSuffix: 'EngageIQ-Validator-v1.0.0'
    })

    // Test connection by getting account info
    console.log(chalk.blue('   Connecting to Cosmos DB...'))
    const response = await client.getDatabaseAccount()
    console.log(chalk.green(`✅ Connected successfully to ${response.resource.id}`))

    // Check if database exists, create if it doesn't
    console.log(chalk.blue('   Checking database...'))
    const { database } = await client.databases.createIfNotExists({
      id: databaseName
    })
    console.log(chalk.green(`✅ Database "${databaseName}" is ready`))

    // Check if container exists, create if it doesn't  
    console.log(chalk.blue('   Checking container...'))
    const { container } = await database.containers.createIfNotExists({
      id: containerName,
      partitionKey: '/partitionKey',
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [
          { path: '/*' }
        ],
        excludedPaths: [
          { path: '/data/content/*' },
          { path: '/data/bio/*' }
        ]
      }
    })
    console.log(chalk.green(`✅ Container "${containerName}" is ready`))

    // Test basic operations
    console.log(chalk.blue('   Testing basic operations...'))
    
    // Test write
    const testItem = {
      id: 'test-' + Date.now(),
      partitionKey: 'test',
      type: 'test',
      data: { message: 'Setup validation test' },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    await container.items.create(testItem)
    console.log(chalk.green('✅ Write operation successful'))

    // Test read
    const { resource } = await container.item(testItem.id, 'test').read()
    if (resource && resource.data.message === 'Setup validation test') {
      console.log(chalk.green('✅ Read operation successful'))
    } else {
      throw new Error('Read operation returned unexpected data')
    }

    // Test delete (cleanup)
    await container.item(testItem.id, 'test').delete()
    console.log(chalk.green('✅ Delete operation successful'))

    // Get container stats
    console.log(chalk.blue('   Getting container information...'))
    const containerInfo = await container.read()
    console.log(chalk.gray(`   Partition key: ${containerInfo.resource.partitionKey.paths[0]}`))
    console.log(chalk.gray(`   Indexing mode: ${containerInfo.resource.indexingPolicy.indexingMode}`))

    console.log(chalk.green.bold('\n🎉 Cosmos DB setup validation successful!'))
    console.log(chalk.gray('   Your EngageIQ application is ready to use Cosmos DB.\n'))
    
    return true

  } catch (error) {
    console.log(chalk.red(`❌ Connection failed: ${error.message}`))
    
    if (error.code === 401) {
      console.log(chalk.yellow('\n💡 Tips for 401 Unauthorized errors:'))
      console.log(chalk.gray('   - Check that your VITE_COSMOS_KEY is the PRIMARY key'))
      console.log(chalk.gray('   - Ensure the key was copied correctly without extra spaces'))
      console.log(chalk.gray('   - Verify the endpoint URL is correct'))
    } else if (error.code === 403) {
      console.log(chalk.yellow('\n💡 Tips for 403 Forbidden errors:'))
      console.log(chalk.gray('   - Check your Azure account permissions'))
      console.log(chalk.gray('   - Verify the Cosmos DB account exists'))
      console.log(chalk.gray('   - Check firewall settings in Azure Portal'))
    } else if (error.code === 'ENOTFOUND') {
      console.log(chalk.yellow('\n💡 Tips for connection errors:'))
      console.log(chalk.gray('   - Check your internet connection'))
      console.log(chalk.gray('   - Verify the endpoint URL format'))
      console.log(chalk.gray('   - Ensure the Cosmos DB account name is correct'))
    }
    
    console.log(chalk.yellow('\n🔍 Debug Information:'))
    console.log(chalk.gray(`   Error code: ${error.code || 'Unknown'}`))
    console.log(chalk.gray(`   Error details: ${error.message}`))
    
    return false
  }
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateCosmosSetup()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error(chalk.red('Unexpected error:'), error)
      process.exit(1)
    })
}

export default validateCosmosSetup
