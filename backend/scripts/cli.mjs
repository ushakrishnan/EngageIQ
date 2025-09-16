#!/usr/bin/env node
// Minimal CLI wrapper for common backend scripts
const [,, cmd, ...args] = process.argv
const spawn = (cmd, args) => {
  const cp = require('child_process')
  const child = cp.spawn(cmd, args, { stdio: 'inherit', shell: false })
  child.on('exit', code => process.exit(code))
}

const fs = require('fs')
const path = require('path')

function usage() {
  console.error('Usage: node ./scripts/cli.mjs <command> [args]\n')
  console.error('Commands:')
  console.error('  seed                 Run the seed script (fresh-seed-all.mjs)')
  console.error('  compute-vectors      Run compute-vectors helper (executes compiled ai.js)')
  console.error('  validate-cosmos      Run the Cosmos validation script')
  console.error('  migrate              Run ./scripts/migrate.mjs if it exists')
  console.error('  run <script> [args]  Run a specific script file from ./scripts (e.g. run myscript.mjs)')
  console.error('  list                 List available scripts in ./scripts')
  process.exit(1)
}

switch ((cmd || '').toLowerCase()) {
  case 'seed': {
    const p = './scripts/fresh-seed-all.mjs'
    if (!fs.existsSync(p)) return console.error('Seed script not found:', p)
    spawn(process.execPath, [p, ...args])
    break
  }
  case 'compute-vectors': {
    const p = './dist/ai.js'
    if (!fs.existsSync(p)) return console.error('Compiled ai.js not found. Please build with npm run ts:build')
    spawn(process.execPath, [p, ...args])
    break
  }
  case 'validate-cosmos': {
    const p = './scripts/validate-cosmos.mjs'
    if (!fs.existsSync(p)) return console.error('validate-cosmos script not found:', p)
    spawn(process.execPath, [p, ...args])
    break
  }
  case 'migrate': {
    const pjs = './scripts/migrate.mjs'
    const pjs2 = './scripts/migrate.js'
    if (fs.existsSync(pjs)) {
      spawn(process.execPath, [pjs, ...args])
    } else if (fs.existsSync(pjs2)) {
      spawn(process.execPath, [pjs2, ...args])
    } else {
      console.error('No migrate script found at ./scripts/migrate.mjs or ./scripts/migrate.js')
      process.exit(1)
    }
    break
  }
  case 'run': {
    if (!args || args.length === 0) usage()
    let script = args.shift()
    let scriptPath = path.isAbsolute(script) ? script : path.join('.', 'scripts', script)
    // try common extensions if missing
    if (!path.extname(scriptPath)) {
      if (fs.existsSync(scriptPath + '.mjs')) scriptPath += '.mjs'
      else if (fs.existsSync(scriptPath + '.js')) scriptPath += '.js'
      else if (fs.existsSync(scriptPath + '.ts')) scriptPath += '.ts'
    }
    if (!fs.existsSync(scriptPath)) {
      console.error('Script not found:', scriptPath)
      process.exit(1)
    }
    const ext = path.extname(scriptPath).toLowerCase()
    if (ext === '.mjs' || ext === '.js') {
      spawn(process.execPath, [scriptPath, ...args])
    } else if (ext === '.ts') {
      console.error('TypeScript script detected. Please compile or run via ts-node. Example: npm run ts:build && node', scriptPath)
      process.exit(1)
    } else {
      console.error('Unsupported script extension:', ext)
      process.exit(1)
    }
    break
  }
  case 'list': {
    try {
      const items = fs.readdirSync('./scripts').filter(f => /\.(mjs|js|ts)$/.test(f)).sort()
      console.log('Available scripts:')
      items.forEach(f => console.log('  -', f))
    } catch (e) {
      console.error('Failed to list scripts:', e && e.message)
    }
    break
  }
  default:
    usage()
}
