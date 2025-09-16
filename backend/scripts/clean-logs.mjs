#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const files = ['server.log', 'server.err.log', 'server-tail.log']
const projectRoot = process.cwd()

for (const f of files) {
  const p = path.resolve(projectRoot, f)
  try {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p)
      console.log(`Removed ${p}`)
    } else {
      console.log(`Not present: ${p}`)
    }
  } catch (e) {
    console.error(`Failed to remove ${p}:`, e.message || e)
  }
}
