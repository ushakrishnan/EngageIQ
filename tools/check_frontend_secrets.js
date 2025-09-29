#!/usr/bin/env node
// Simple checker to find accidental secret exposure in frontend source/files.
// Scans frontend/src and frontend env files for COSMOS_* assignments and '@azure/cosmos'.
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const frontend = path.join(root, 'frontend')

// For env files: detect un-commented assignments like COSMOS_KEY=... or COSMOS_ENDPOINT=... (not commented)
const envAssignmentRe = /^\s*(?:COSMOS_KEY|COSMOS_ENDPOINT|COSMOS_DATABASE_NAME|COSMOS_CONTAINER_NAME)\s*=.*$/m

// For source files: detect dangerous imports or attempts to use the SDK in the browser
const sourcePatterns = [
  /@azure\/cosmos/, // direct SDK import in frontend code — bad
  /localStorage\.setItem\(['\"]COSMOS_KEY['\"]/, // writes to localStorage
]

function walk(dir, cb) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, cb)
    else cb(p)
  }
}

let found = []

// Check env files in frontend root for actual secret assignments
const envFiles = ['.env', '.env.development', '.env.production', '.env.example', '.env.safe']
for (const f of envFiles) {
  const p = path.join(frontend, f)
  if (fs.existsSync(p)) {
    const txt = fs.readFileSync(p, 'utf8')
    const lines = txt.split(/\r?\n/)
    lines.forEach((ln, idx) => {
      if (envAssignmentRe.test(ln) && !ln.trim().startsWith('#')) {
        found.push(`${p}:${idx+1}: un-commented COSMOS_* assignment`) 
      }
    })
  }
}

// Walk frontend/src and check for risky imports or localStorage writes
const srcDir = path.join(frontend, 'src')
if (fs.existsSync(srcDir)) {
  walk(srcDir, (file) => {
    try {
      // skip TypeScript declaration files and src/types (they may declare modules)
      if (file.endsWith('.d.ts') || file.includes(path.join('src', 'types'))) return
      const txt = fs.readFileSync(file, 'utf8')
      sourcePatterns.forEach((pat) => { if (pat.test(txt)) found.push(`${file}: matches ${pat}`) })
    } catch (e) {}
  })
}

if (found.length) {
  console.error('\nFrontend secret check failed — potential exposures found:')
  found.forEach((l) => console.error('  ' + l))
  console.error('\nPlease move secrets to backend/.env and remove any COSMOS_* assignments from frontend env files before committing.')
  process.exitCode = 2
} else {
  console.log('Frontend secret check passed — no COSMOS_* or @azure/cosmos imports found in frontend sources or env files')
}
