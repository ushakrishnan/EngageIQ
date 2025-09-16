#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const cwd = process.cwd()
const envPath = path.join(cwd, '.env')
const examplePath = path.join(cwd, '.env.example')

function ensureEnv() {
  try {
    if (fs.existsSync(envPath)) {
      console.log('.env already exists — skipping creation.')
      return
    }

    if (!fs.existsSync(examplePath)) {
      console.log('.env.example not found — skipping .env creation.')
      return
    }

    fs.copyFileSync(examplePath, envPath)
    console.log('Created .env file from .env.example. Please edit it with your values.')
  } catch (err) {
    console.error('Error while creating .env from .env.example:', err)
    // Don't fail the install on errors — postinstall should be non-fatal
  }
}

// Run
ensureEnv()
