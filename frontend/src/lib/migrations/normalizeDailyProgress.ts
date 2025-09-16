import databaseService from '../database'
import type { DatabaseItem } from '../database'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * Normalize existing daily-progress documents by ensuring the new fields
 * (mentions, follows, groupsJoined) exist and are seeded to 0 if missing.
 *
 * This is intended as a small one-off migration helper that can be run
 * from a Node environment or via a dev script that proxies to the API.
 */
export async function normalizeDailyProgress(options?: { dryRun?: boolean; batchSize?: number; concurrency?: number; backupToFile?: boolean | string }) {
  const dryRun = options?.dryRun ?? false
  const batchSize = options?.batchSize ?? 500
  const concurrency = Math.max(1, Math.floor(options?.concurrency ?? 1))
  const backupToFile = options?.backupToFile ?? false
  console.log(`[migrate] normalizeDailyProgress: options dryRun=${dryRun}, batchSize=${batchSize}, concurrency=${concurrency}`)
  console.log('[migrate] normalizeDailyProgress: starting')
  try {
    const res = await databaseService.getAllByType('daily-progress')
    const items = res.items || []

    let updatedCount = 0

    // helper to process a single item and apply normalization if needed
    async function processItem(item: DatabaseItem) {
      const data = (item.data || {}) as Record<string, unknown>
      const normalized: Record<string, unknown> = { ...data }

      let changed = false
      if (typeof normalized.posts !== 'number') { normalized.posts = 0; changed = true }
      if (typeof normalized.comments !== 'number') { normalized.comments = 0; changed = true }
      if (typeof normalized.likes !== 'number') { normalized.likes = 0; changed = true }
      // Deprecated metric removed; ensure 'likes' exists so the UI has a canonical metric
      if (typeof normalized.likes !== 'number') { normalized.likes = 0; changed = true }
      if (typeof normalized.mentions !== 'number') { normalized.mentions = 0; changed = true }
      if (typeof normalized.follows !== 'number') { normalized.follows = 0; changed = true }
      if (typeof normalized.groupsJoined !== 'number') { normalized.groupsJoined = 0; changed = true }
      if (typeof normalized.karmaEarned !== 'number') { normalized.karmaEarned = 0; changed = true }

      if (!changed) return false

      // collect backups for changed items when requested
      if (backupToFile) {
        try {
          backedUpItems.push({ id: item.id, type: item.type, before: data })
        } catch (e) {
          console.error('[migrate] failed to add item to backup list', item.id, e)
        }
      }

      if (dryRun) {
        console.log(`[migrate][dry-run] would update item ${item.id}`)
        return true
      }

      try {
        await databaseService.update({ ...item, data: normalized })
        console.log(`[migrate] updated ${item.id}`)
        return true
      } catch (e) {
        console.error('[migrate] failed to update item', item.id, e)
        return false
      }
    }

    // simple worker-pool to process an array with limited concurrency
    async function processWithConcurrency<T>(arr: T[], limit: number, fn: (t: T) => Promise<boolean>) {
      let idx = 0
      let localUpdated = 0
      const workers = new Array(Math.min(limit, arr.length)).fill(0).map(async () => {
        while (true) {
          const i = idx++
          if (i >= arr.length) break
          try {
            const updated = await fn(arr[i])
            if (updated) localUpdated++
          } catch (e) {
            console.error('[migrate] worker error', e)
          }
        }
      })
      await Promise.all(workers)
      return localUpdated
    }

    // chunk items into batches
    function chunkArray<T>(arr: T[], size: number) {
      const out: T[][] = []
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
      return out
    }

    const batches = chunkArray(items, batchSize)
    const backedUpItems: Array<{ id: string; type: string; before: Record<string, unknown> }> = []
    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi] as DatabaseItem[]
      console.log(`[migrate] processing batch ${bi + 1}/${batches.length} (${batch.length} items)`)
      const updatedInBatch = await processWithConcurrency(batch, concurrency, processItem)
      updatedCount += updatedInBatch
      // gentle breathing room between batches
      if (!dryRun) await new Promise(res => setTimeout(res, 200))
    }
     
    // if requested, write a backup file containing the 'before' payloads for changed items
    if (backupToFile && backedUpItems.length > 0) {
      try {
        const backupDir = path.resolve(process.cwd(), 'migrations-backup')
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        const filePath = typeof backupToFile === 'string' && backupToFile.length ? backupToFile : path.join(backupDir, `normalizeDailyProgress-backup-${ts}.json`)
        fs.writeFileSync(filePath, JSON.stringify({ createdAt: Date.now(), processed: items.length, updated: updatedCount, items: backedUpItems }, null, 2), 'utf8')
        console.log(`[migrate] wrote backup of ${backedUpItems.length} items to ${filePath}`)
      } catch (e) {
        console.error('[migrate] failed to write backup file', e)
      }
    }

    console.log(`[migrate] normalizeDailyProgress: done — processed ${items.length} items, updated ${updatedCount}`)
    return { processed: items.length, updated: updatedCount }
  } catch (err) {
    console.error('[migrate] normalizeDailyProgress: failed', err)
    throw err
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  // simple CLI arg parsing
  const argv = process.argv.slice(2)
  const hasFlag = (long: string, short?: string) => argv.includes(long) || (short ? argv.includes(short) : false)
  const getArg = (long: string, short?: string) => {
    const i = argv.indexOf(long)
    if (i >= 0 && i < argv.length - 1) return argv[i + 1]
    if (short) {
      const j = argv.indexOf(short)
      if (j >= 0 && j < argv.length - 1) return argv[j + 1]
    }
    return undefined
  }

  const dryRun = hasFlag('--dry-run', '-d')
  const batchSize = parseInt(getArg('--batchSize', '-b') || '500', 10)
  const concurrency = parseInt(getArg('--concurrency', '-c') || '1', 10)
  const backupToFile = hasFlag('--backup-to-file')

  normalizeDailyProgress({ dryRun, batchSize, concurrency, backupToFile }).then(() => process.exit(0)).catch(() => process.exit(1))
}
