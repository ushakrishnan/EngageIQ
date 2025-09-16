#!/usr/bin/env node

/**
 * fix-missing-partitionkey.mjs
 *
 * Small migration script to fix documents that are missing top-level `partitionKey`
 * or `type` properties (or where partitionKey !== type). This script performs a
 * dry-run by default and will only apply changes when run with `--apply`.
 *
 * Usage:
 *   node ./scripts/fix-missing-partitionkey.mjs       # DRY RUN (no writes)
 *   node ./scripts/fix-missing-partitionkey.mjs --apply # Apply fixes
 *
 * Environment variables (same as other scripts):
 *   VITE_COSMOS_ENDPOINT, VITE_COSMOS_KEY, VITE_COSMOS_DATABASE_NAME, VITE_COSMOS_CONTAINER_NAME
 */

import chalk from 'chalk'
import { CosmosClient } from '@azure/cosmos'

const getEnvVar = (key, fallback = '') => {
  const value = process.env[key]
  return value || fallback
}

class FixMissingPartitionService {
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

    this.client = new CosmosClient({ endpoint: this.config.endpoint, key: this.config.key, userAgentSuffix: 'EngageIQ-Migration-FixPK-v1.0.0' })

    const { database } = await this.client.databases.createIfNotExists({ id: this.config.databaseName })
    this.database = database

    const { container } = await this.database.containers.createIfNotExists({ id: this.config.containerName, partitionKey: '/partitionKey' })
    this.container = container
  }

  async fetchAllItems() {
    // Intentionally fetch all documents and filter in JS to avoid relying on SQL IS_DEFINED semantics.
    const querySpec = { query: 'SELECT * FROM c' }
    const { resources } = await this.container.items.query(querySpec, { maxItemCount: 1000 }).fetchAll()
    return resources || []
  }

  async upsert(item) {
    return this.container.items.upsert(item)
  }
}

function deduceTypeFromData(data) {
  if (!data || typeof data !== 'object') return null

  if (data.email && data.name) return 'user'
  if (data.members || data.postCount || data.createdBy) return 'group'
  if (data.content || data.userId || data.timestamp) return 'post'
  if (data.parentId || Array.isArray(data.replies)) return 'comment'
  if (data.karma !== undefined) return 'user'

  return null
}

async function fixMissingPartitionKey({ apply = false } = {}) {
  const service = new FixMissingPartitionService()
  console.log(chalk.blue('Initializing Cosmos DB connection...'))
  await service.initialize()
  console.log(chalk.green('Connected to Cosmos DB'), `DB=${service.config.databaseName}`, `Container=${service.config.containerName}`)

  console.log(chalk.blue('Fetching all items (this may take a moment)...'))
  const all = await service.fetchAllItems()
  console.log(chalk.gray(`Retrieved ${all.length} total documents from the container`))

  // Filter items missing partitionKey/type or where pk !== type
  const candidates = all.filter(item => {
    const hasPK = Object.prototype.hasOwnProperty.call(item, 'partitionKey') && item.partitionKey
    const hasType = Object.prototype.hasOwnProperty.call(item, 'type') && item.type
    const mismatch = hasPK && hasType && item.partitionKey !== item.type
    return !hasPK || !hasType || mismatch
  })

  console.log(chalk.yellow(`Found ${candidates.length} documents that may need fixes`))
  if (candidates.length === 0) return true

  console.log(chalk.blue('\nSample of documents that need fixing:'))
  candidates.slice(0, 5).forEach(item => {
    console.log('- id:', item.id, 'partitionKey:', item.partitionKey, 'type:', item.type, 'data.id:', item?.data?.id)
  })

  if (!apply) {
    console.log(chalk.yellow('\nDRY RUN: no changes will be made. Run with --apply to apply fixes.'))
    return true
  }

  let successes = 0
  let failures = []

  for (const item of candidates) {
    try {
      const updated = { ...item }

      // Deduce type
      let deduced = updated.type || (updated.data && updated.data.type) || null
      if (!deduced) deduced = deduceTypeFromData(updated.data) || 'post'

      // Ensure id is present inside data
      if (!updated.data) updated.data = {}
      if (!updated.data.id) updated.data.id = updated.id

      updated.type = deduced
      updated.partitionKey = deduced

      // upsert will write the document with the new partitionKey
      await service.upsert(updated)
      successes += 1
      console.log(chalk.green(`Updated ${updated.id} -> type=${deduced}`))
    } catch (err) {
      failures.push({ id: item.id, err })
      console.error(chalk.red(`Failed to update item ${item.id}: ${err?.message || err}`))
    }
  }

  console.log(chalk.green(`\nMigration complete. ${successes} updated, ${failures.length} failed.`))
  if (failures.length > 0) {
    console.log(chalk.red('Failures:'))
    failures.forEach(f => console.log('-', f.id, f.err && f.err.message))
  }

  return failures.length === 0
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')

  fixMissingPartitionKey({ apply })
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error(chalk.red('Unexpected error during migration:'), err)
      process.exit(1)
    })
}

export { fixMissingPartitionKey }
