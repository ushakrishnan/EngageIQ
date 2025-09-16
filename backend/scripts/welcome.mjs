#!/usr/bin/env node

/**
 * EngageIQ Getting Started Helper
 * 
 * This script provides a simple interface to help users get started
 * with EngageIQ setup and configuration.
 */

import chalk from 'chalk'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

function displayWelcome() {
  console.clear()
  console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════════╗'))
  console.log(chalk.cyan.bold('║                                                              ║'))
  console.log(chalk.cyan.bold('║                    Welcome to EngageIQ!                     ║'))
  console.log(chalk.cyan.bold('║                                                              ║'))
  console.log(chalk.cyan.bold('║            Professional Social Engagement Platform          ║'))
  console.log(chalk.cyan.bold('║                                                              ║'))
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝'))
  console.log()
}

function displayFeatures() {
  console.log(chalk.blue.bold('🌟 What EngageIQ Offers:\n'))
  console.log(chalk.white('• Professional networking and social engagement'))
  console.log(chalk.white('• Reddit-style discussion threads with voting'))
  console.log(chalk.white('• LinkedIn-style professional profiles'))
  console.log(chalk.white('• Discord-style groups and communities'))
  console.log(chalk.white('• Karma system with achievements and rankings'))
  console.log(chalk.white('• Topic-based content discovery'))
  console.log(chalk.white('• Advanced moderation tools'))
  console.log(chalk.white('• Real-time notifications and mentions'))
  console.log()
}

function displaySetupOptions() {
  console.log(chalk.green.bold('🚀 Quick Setup Options:\n'))
  console.log(chalk.white('1. Interactive Setup (Recommended):'))
  console.log(chalk.gray('   npm run setup'))
  console.log(chalk.gray('   • Guided configuration wizard'))
  console.log(chalk.gray('   • Automatic database setup'))
  console.log(chalk.gray('   • Sample data seeding'))
  console.log()
  
  console.log(chalk.white('2. Manual Setup:'))
  console.log(chalk.gray('   cp .env.example .env'))
  console.log(chalk.gray('   # Edit .env with your database credentials'))
  console.log(chalk.gray('   npm run dev'))
  console.log()
  
  console.log(chalk.white('3. Check Current Status:'))
  console.log(chalk.gray('   npm run setup:status'))
  console.log()
}

function displayDatabaseOptions() {
  console.log(chalk.blue.bold('💾 Supported Databases:\n'))
  console.log(chalk.white('🟢 Cosmos DB (Recommended for Development):'))
  console.log(chalk.gray('   • Free tier available'))
  console.log(chalk.gray('   • Built-in authentication'))
  console.log(chalk.gray('   • PostgreSQL with real-time features'))
  console.log(chalk.gray('   • Easy setup and management'))
  console.log()
  
  console.log(chalk.white('🔵 Azure Cosmos DB (Enterprise Scale):'))
  console.log(chalk.gray('   • Global distribution'))
  console.log(chalk.gray('   • Multi-model NoSQL'))
  console.log(chalk.gray('   • Enterprise-grade security'))
  console.log(chalk.gray('   • Automatic scaling'))
  console.log()
}

function displayHelpResources() {
  console.log(chalk.yellow.bold('📖 Help & Resources:\n'))
  console.log(chalk.white('• Setup Guide: SETUP.md'))
  console.log(chalk.white('• Validate Config: npm run setup:validate'))
  console.log(chalk.white('• Test Database: npm run setup:test'))
  console.log(chalk.white('• Force Re-setup: npm run setup:force'))
  console.log()
}

function displayNextSteps() {
  console.log(chalk.magenta.bold('⚡ Ready to Start?\n'))
  console.log(chalk.white('1. Choose your setup method above'))
  console.log(chalk.white('2. Start the development server: npm run dev'))
  console.log(chalk.white('3. Open http://localhost:5173 in your browser'))
  console.log(chalk.white('4. Create your first user account'))
  console.log(chalk.white('5. Start engaging with the community!'))
  console.log()
}

function main() {
  displayWelcome()
  displayFeatures()
  displaySetupOptions()
  displayDatabaseOptions()
  displayHelpResources()
  displayNextSteps()
  
  console.log(chalk.green('Happy coding! 🎉'))
  console.log()
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main as showGettingStarted }
