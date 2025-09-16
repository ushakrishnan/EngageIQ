#!/usr/bin/env node
import { spawnSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

const projectRoot = process.cwd()
const outPath = path.resolve(projectRoot, 'server.log')
const errPath = path.resolve(projectRoot, 'server.err.log')

console.log('Building TypeScript...')
const tscBin = path.resolve(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc')
const build = spawnSync(process.execPath, [tscBin, '-p', 'tsconfig.json'], { cwd: projectRoot, stdio: 'inherit' })
if (build.status !== 0) {
  console.error('tsc build failed')
  process.exit(build.status || 1)
}

try { fs.closeSync(fs.openSync(outPath, 'a')) } catch (err) { console.debug('[ts-detach] failed to touch outPath', err) }
try { fs.closeSync(fs.openSync(errPath, 'a')) } catch (err) { console.debug('[ts-detach] failed to touch errPath', err) }

const outFd = fs.openSync(outPath, 'a')
const errFd = fs.openSync(errPath, 'a')

const child = spawn(process.execPath, ['dist/index.js'], {
  cwd: projectRoot,
  detached: true,
  stdio: ['ignore', outFd, errFd]
})
child.unref()
console.log(`Started detached TypeScript server (pid: ${child.pid}). Logs: ${outPath} / ${errPath}`)
process.exit(0)
