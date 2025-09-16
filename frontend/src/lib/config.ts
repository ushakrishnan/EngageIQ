/**
 * Environment Configuration
 *
 * This file centralizes all environment variable access and provides
 * type-safe configuration for the application.
 */

export type DatabaseProvider = 'cosmos'

interface DatabaseConfig {
  provider: DatabaseProvider
  cosmos: {
    endpoint: string
    key: string
    databaseName: string
    containerName: string
  }
}

interface AppConfig {
  name: string
  environment: 'development' | 'production' | 'staging'
}

interface ApiConfig {
  enableAnalytics: boolean
}

interface Config {
  database: DatabaseConfig
  app: AppConfig
  api: ApiConfig
}

/**
 * Helper function to get environment variables with fallback
 */

const getEnvVar = (key: string, fallback: string = ''): string => {
  // Support both Vite (import.meta.env) and Node (process.env) environments
  let envValue: string | undefined = undefined;
  try {
    if (typeof import.meta.env !== 'undefined' && import.meta.env[key] !== undefined) {
      envValue = import.meta.env[key];
    }
  } catch {
    // ignore, will try process.env
  }
  if (envValue === undefined && typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    envValue = process.env[key];
  }
  if (envValue === undefined && !fallback) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return envValue !== undefined ? envValue : fallback;
}

/**
 * Helper function to get boolean environment variables
 */
const getEnvBoolean = (key: string, fallback: boolean = false): boolean => {
  let envValue: string | undefined = undefined;
  try {
    if (typeof import.meta.env !== 'undefined' && import.meta.env[key] !== undefined) {
      envValue = import.meta.env[key];
    }
  } catch {
    // ignore, will try process.env
  }
  if (envValue === undefined && typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    envValue = process.env[key];
  }
  return envValue?.toLowerCase() === 'true' || fallback;
}

/**
 * Main configuration object
 */
export const config: Config = {
  database: {
    provider: (getEnvVar('VITE_DATABASE_PROVIDER', 'cosmos') as DatabaseProvider),
    cosmos: {
      endpoint: getEnvVar('VITE_COSMOS_ENDPOINT'),
      key: getEnvVar('VITE_COSMOS_KEY'),
      databaseName: getEnvVar('VITE_COSMOS_DATABASE_NAME', 'EngageIQ'),
      containerName: getEnvVar('VITE_COSMOS_CONTAINER_NAME', 'data')
    }
  },
  app: {
    name: getEnvVar('VITE_APP_NAME', 'EngageIQ'),
    environment: getEnvVar('VITE_ENVIRONMENT', 'development') as 'development' | 'production' | 'staging'
  },
  api: {
    enableAnalytics: getEnvBoolean('VITE_ENABLE_ANALYTICS', false)
  }
}

/**
 * Validate database configuration (Cosmos only)
 */
const validateDatabaseConfig = (): boolean => {
  const provider = config.database.provider

  if (provider === 'cosmos') {
    const requiredVars = [
      'VITE_COSMOS_ENDPOINT',
      'VITE_COSMOS_KEY'
    ]
    const missing = requiredVars.filter(varName => !getEnvVar(varName))
    if (missing.length > 0) {
      console.error('Missing required Cosmos DB environment variables:', missing)
      console.error('Please check your .env file and ensure all Cosmos DB variables are set')
      return false
    }
  } else {
    console.error('Please set VITE_DATABASE_PROVIDER to a supported provider (currently: "cosmos")')
    return false
  }
  return true
}

// Validate configuration on module load (only in development)
if (config.app.environment === 'development') {
  validateDatabaseConfig()
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = config.app.environment === 'development'

/**
 * Check if we're in production mode
 */
export const isProduction = config.app.environment === 'production'

/**
 * Database helper
 */
export const isCosmosDbConfigured = () => {
  return !!(config.database.cosmos.endpoint && config.database.cosmos.key)
}

export const isDatabaseConfigured = () => isCosmosDbConfigured()

/**
 * Export individual config sections for convenience
 */
export const databaseConfig = config.database
export const cosmosConfig = config.database.cosmos
export const appConfig = config.app
export const apiConfig = config.api

export default config