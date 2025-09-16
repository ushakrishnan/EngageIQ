#!/usr/bin/env node

/**
 * Data Migration Script for Cosmos DB
 * 
 * This script helps migrate existing EngageIQ data to Cosmos DB format
 * and can also seed initial demo data for new installations.
 */

import chalk from 'chalk'
import { CosmosClient } from '@azure/cosmos'

// Import environment variables directly
const getEnvVar = (key, fallback = '') => {
  const value = process.env[key]
  return value || fallback
}

// Create Cosmos DB service class for migration
class CosmosDbMigrationService {
  constructor() {
    this.client = null
    this.database = null
    this.container = null
    this.config = {
      endpoint: getEnvVar('VITE_COSMOS_ENDPOINT'),
      key: getEnvVar('VITE_COSMOS_KEY'),
      databaseName: getEnvVar('VITE_COSMOS_DATABASE_NAME', 'EngageIQ'),
      containerName: getEnvVar('VITE_COSMOS_CONTAINER_NAME', 'data')
    }
  }

  async initialize() {
    if (!this.config.endpoint || !this.config.key) {
      throw new Error('Cosmos DB configuration is missing. Please check your environment variables.')
    }

    this.client = new CosmosClient({
      endpoint: this.config.endpoint,
      key: this.config.key,
      userAgentSuffix: 'EngageIQ-Migration-v1.0.0'
    })

    const { database } = await this.client.databases.createIfNotExists({
      id: this.config.databaseName
    })
    this.database = database

    const { container } = await this.database.containers.createIfNotExists({
      id: this.config.containerName,
      partitionKey: '/partitionKey'
    })
    this.container = container
  }

  async create(item) {
    const { resource } = await this.container.items.create(item)
    return resource
  }

  async queryByType(type) {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.type = @type',
      parameters: [{ name: '@type', value: type }]
    }
    const { resources } = await this.container.items.query(querySpec).fetchAll()
    return resources
  }

  async delete(id, partitionKey) {
    await this.container.item(id, partitionKey).delete()
  }

  async getStats() {
    const countQuery = { query: 'SELECT VALUE COUNT(1) FROM c' }
    const { resources: countResult } = await this.container.items.query(countQuery).fetchAll()
    
    const typeCountQuery = { query: 'SELECT c.type, COUNT(1) as count FROM c GROUP BY c.type' }
    const { resources: typeResult } = await this.container.items.query(typeCountQuery).fetchAll()

    const itemsByType = {}
    typeResult.forEach(item => {
      itemsByType[item.type] = item.count
    })

    return {
      totalItems: countResult[0] || 0,
      itemsByType,
      lastUpdated: Date.now()
    }
  }
}

const cosmosDbService = new CosmosDbMigrationService()

// Demo users with enhanced profiles (matching current App.tsx structure)
const createDemoUsers = () => [
  {
    id: 'demo-user-admin',
    name: 'EngageIQ Admin',
    email: 'engageiq_admin',
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
  },
  {
    id: 'demo-user-1',
    name: 'Alice Johnson',
    email: 'alice@demo.com',
    avatar: '',
    bio: 'Senior Software Engineer passionate about AI and machine learning. Always learning, always building.',
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    following: ['demo-user-2', 'demo-user-4'],
    followers: ['demo-user-5'],
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    experience: [
      { company: 'TechCorp Inc.', position: 'Senior Software Engineer', duration: '2021 - Present' },
      { company: 'StartupXYZ', position: 'Full Stack Developer', duration: '2019 - 2021' }
    ],
    skills: ['React', 'TypeScript', 'Python', 'Machine Learning', 'AWS'],
    karma: 1250,
    karmaHistory: [],
    achievements: ['first_post', 'popular_post'],
    status: 'online',
    statusMessage: 'Building the future 🚀',
    interestedTopics: ['Technology', 'AI & Machine Learning', 'Programming', 'Innovation'],
    onboardingCompleted: true
  },
  // Add more demo users...
]

// Demo groups
const createDemoGroups = () => [
  {
    id: 'group-demo-1',
    name: 'Tech Innovators',
    description: 'A community for discussing the latest in technology, programming, and innovation.',
    members: [
      { userId: 'demo-user-1', role: 'owner', joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
      { userId: 'demo-user-2', role: 'admin', joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 20 }
    ],
    postCount: 28,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    createdBy: 'demo-user-1',
    privacy: 'public',
    category: 'technical',
    topics: ['Technology', 'Programming', 'AI & Machine Learning', 'Web Development'],
    rules: [
      'Be respectful and professional',
      'No spam or self-promotion without context',
      'Share resources and help others learn'
    ],
    moderators: ['demo-user-1', 'demo-user-2'],
    channels: [
      { id: 'general', name: 'general', type: 'text', description: 'General tech discussions' },
      { id: 'resources', name: 'resources', type: 'text', description: 'Share learning resources' }
    ]
  }
  // Add more demo groups...
]

// Demo posts
const createDemoPosts = () => [
  {
    id: 'demo-post-1',
    userId: 'demo-user-1',
    userName: 'Alice Johnson',
    userAvatar: '',
    content: 'Just launched a new AI-powered feature at work! The intersection of machine learning and user experience continues to amaze me. #AI #MachineLearning',
    timestamp: Date.now() - 1000 * 60 * 30,
    likes: ['demo-user-4'],
    downvotes: [],
    comments: [],
    groupId: 'group-demo-1',
    type: 'professional',
    category: 'Technology',
    tags: ['AI', 'MachineLearning'],
    score: 2
  }
  // Add more demo posts...
]

/**
 * Convert application data to Cosmos DB format
 */
function convertToCosmosFormat(data, type) {
  return {
    id: data.id,
    partitionKey: type,
    type: type,
    data: data,
    createdAt: data.createdAt || data.joinedAt || Date.now(),
    updatedAt: data.updatedAt || Date.now()
  }
}

/**
 * Migrate or seed data to Cosmos DB
 */
async function migrateData(options = {}) {
  const { seedDemo = false, clearExisting = false } = options
  
  console.log(chalk.blue.bold('\n🚀 EngageIQ Cosmos DB Data Migration\n'))

  try {
    // Initialize Cosmos DB service
    console.log(chalk.blue('Initializing Cosmos DB connection...'))
    await cosmosDbService.initialize()
    console.log(chalk.green('✅ Connected to Cosmos DB'))

    // Clear existing data if requested
    if (clearExisting) {
      console.log(chalk.yellow('\n⚠️  Clearing existing data...'))
      
      const types = ['user', 'post', 'group', 'comment', 'report', 'achievement', 'karma']
      for (const type of types) {
        const items = await cosmosDbService.queryByType(type)
        for (const item of items) {
          await cosmosDbService.delete(item.id, item.partitionKey)
        }
        console.log(chalk.gray(`   Cleared ${items.length} ${type} items`))
      }
      console.log(chalk.green('✅ Existing data cleared'))
    }

    // Seed demo data if requested
    if (seedDemo) {
      console.log(chalk.blue('\n📝 Seeding demo data...'))
      
      // Seed users
      const demoUsers = createDemoUsers()
      for (const user of demoUsers) {
        const cosmosUser = convertToCosmosFormat(user, 'user')
        await cosmosDbService.create(cosmosUser)
      }
      console.log(chalk.green(`✅ Seeded ${demoUsers.length} demo users`))

      // Seed groups
      const demoGroups = createDemoGroups()
      for (const group of demoGroups) {
        const cosmosGroup = convertToCosmosFormat(group, 'group')
        await cosmosDbService.create(cosmosGroup)
      }
      console.log(chalk.green(`✅ Seeded ${demoGroups.length} demo groups`))

      // Seed posts
      const demoPosts = createDemoPosts()
      for (const post of demoPosts) {
        const cosmosPost = convertToCosmosFormat(post, 'post')
        await cosmosDbService.create(cosmosPost)
      }
      console.log(chalk.green(`✅ Seeded ${demoPosts.length} demo posts`))
    }

    // Get final statistics
    console.log(chalk.blue('\n📊 Final Statistics:'))
    const stats = await cosmosDbService.getStats()
    console.log(chalk.green(`   Total items: ${stats.totalItems}`))
    Object.entries(stats.itemsByType).forEach(([type, count]) => {
      console.log(chalk.gray(`   ${type}: ${count}`))
    })

    console.log(chalk.green.bold('\n🎉 Migration completed successfully!\n'))
    
    return true

  } catch (error) {
    console.log(chalk.red(`❌ Migration failed: ${error.message}`))
    console.log(chalk.gray(error.stack))
    return false
  }
}

/**
 * Interactive migration setup
 */
async function interactiveMigration() {
  const inquirer = await import('inquirer')
  
  console.log(chalk.blue.bold('\n🔄 EngageIQ Data Migration Setup\n'))
  
  const answers = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'seedDemo',
      message: 'Would you like to seed demo data for development?',
      default: true
    },
    {
      type: 'confirm', 
      name: 'clearExisting',
      message: 'Clear existing data before migration? (⚠️  This will delete all current data)',
      default: false,
      when: (answers) => answers.seedDemo
    }
  ])

  return migrateData(answers)
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(chalk.blue.bold('\nEngageIQ Cosmos DB Migration Tool\n'))
    console.log('Usage:')
    console.log('  npm run cosmos:migrate              # Interactive migration')
    console.log('  npm run cosmos:migrate -- --seed    # Seed demo data')
    console.log('  npm run cosmos:migrate -- --clear   # Clear existing data')
    console.log('  npm run cosmos:migrate -- --help    # Show this help')
    console.log('')
    process.exit(0)
  }

  const options = {
    seedDemo: args.includes('--seed'),
    clearExisting: args.includes('--clear')
  }

  if (args.length === 0) {
    // Interactive mode
    interactiveMigration()
      .then(success => process.exit(success ? 0 : 1))
      .catch(error => {
        console.error(chalk.red('Unexpected error:'), error)
        process.exit(1)
      })
  } else {
    // Command line mode
    migrateData(options)
      .then(success => process.exit(success ? 0 : 1))
      .catch(error => {
        console.error(chalk.red('Unexpected error:'), error)
        process.exit(1)
      })
  }
}

export { migrateData, convertToCosmosFormat }