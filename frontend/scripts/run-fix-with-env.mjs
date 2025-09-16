#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

async function run() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8')
    const lines = text.split(/\r?\n/)
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        let val = m[2].trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[m[1]] = val
      }
    }
  } else {
    console.warn('.env not found; falling back to environment variables')
  }

  // Allow self-signed certs for local emulator (dev only)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const { fixMissingPartitionKey } = await import('./fix-missing-partitionkey.mjs')
  const apply = process.argv.includes('--apply')
  await fixMissingPartitionKey({ apply })
}

run().catch(err => {
  console.error('ERR:', err)
  process.exit(1)
})
