#!/usr/bin/env node

/**
 * Development Server Launcher
 * 
 * This script handles the development server startup with optional setup check.
 * It ensures the database is configured before starting the Vite dev server.
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

class DevServerLauncher {
  constructor() {
    this.envPath = path.join(projectRoot, '.env')
    this.setupStatePath = path.join(projectRoot, '.setup-complete')
  }

  async isConfigured() {
    try {
      // Check if .env exists and has basic configuration
      const envContent = await fs.readFile(this.envPath, 'utf-8')
      const hasProvider = envContent.includes('VITE_DATABASE_PROVIDER=')
      const hasCredentials = envContent.includes('VITE_COSMOS_ENDPOINT=')
      
      return hasProvider && hasCredentials
    } catch {
      return false
    }
  }

  async promptSetup() {
    console.log(chalk.yellow('\n⚠️  Database configuration not found.'))
    console.log(chalk.cyan('Would you like to run the interactive setup? (y/n)'))
    
    return new Promise((resolve) => {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.on('data', (key) => {
        const char = key.toString().toLowerCase()
        if (char === 'y' || char === '\r' || char === '\n') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          console.log(chalk.green('y'))
          resolve(true)
        } else if (char === 'n' || char === '\x03') { // 'n' or Ctrl+C
          process.stdin.setRawMode(false)
          process.stdin.pause()
          console.log(chalk.red('n'))
          resolve(false)
        }
      })
    })
  }

  async runSetup() {
    console.log(chalk.blue('\n🔧 Starting interactive setup...\n'))
    
    return new Promise((resolve, reject) => {
      const setupProcess = spawn('node', ['scripts/setup.mjs'], {
        cwd: projectRoot,
        stdio: 'inherit'
      })
      
      setupProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true)
        } else {
          reject(new Error(`Setup failed with exit code ${code}`))
        }
      })
      
      setupProcess.on('error', (error) => {
        reject(error)
      })
    })
  }

  async startViteServer() {
    console.log(chalk.green('\n🚀 Starting development server...\n'))
    
    const viteProcess = spawn('npx', ['vite'], {
      cwd: projectRoot,
      stdio: 'inherit'
    })
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n👋 Shutting down gracefully...'))
      viteProcess.kill('SIGINT')
      process.exit(0)
    })
    
    process.on('SIGTERM', () => {
      viteProcess.kill('SIGTERM')
      process.exit(0)
    })
    
    return new Promise((resolve, reject) => {
      viteProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true)
        } else {
          reject(new Error(`Vite server exited with code ${code}`))
        }
      })
      
      viteProcess.on('error', (error) => {
        reject(error)
      })
    })
  }

  async run() {
    console.log(chalk.cyan.bold('🎯 EngageIQ Development Server\n'))
    
    // Check command line arguments
    const args = process.argv.slice(2)
    const skipSetup = args.includes('--skip-setup') || args.includes('-s')
    
    if (skipSetup) {
      console.log(chalk.yellow('⏭️  Skipping setup check...'))
      await this.startViteServer()
      return
    }
    
    // Check if configuration exists
    const isConfigured = await this.isConfigured()
    
    if (!isConfigured) {
      const shouldSetup = await this.promptSetup()
      
      if (shouldSetup) {
        try {
          await this.runSetup()
          console.log(chalk.green('\n✅ Setup completed successfully!'))
        } catch (error) {
          console.error(chalk.red('\n❌ Setup failed:'), error.message)
          console.log(chalk.yellow('\nYou can:'))
          console.log(chalk.white('- Run setup manually: npm run setup'))
          console.log(chalk.white('- Skip setup and start anyway: npm run dev:skip-setup'))
          process.exit(1)
        }
      } else {
        console.log(chalk.yellow('\n⚠️  Starting without database configuration.'))
        console.log(chalk.yellow('Some features may not work properly.'))
        console.log(chalk.cyan('\nRun "npm run setup" later to configure the database.\n'))
      }
    } else {
      console.log(chalk.green('✅ Configuration found'))
    }
    
    // Start the development server
    await this.startViteServer()
  }
}

// CLI entry point
async function main() {
  const launcher = new DevServerLauncher()
  await launcher.run()
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red.bold('Failed to start development server:'), error)
    process.exit(1)
  })
}

export { DevServerLauncher }
