/**
 * Environment Configuration
 *
 * This file centralizes all environment variable access and provides
 * type-safe configuration for the application.
 */

export type DatabaseProvider = 'cosmos'

interface AppConfig {
  name: string
  environment: 'development' | 'production' | 'staging'
}

interface ApiConfig {
  enableAnalytics: boolean
}

interface Config {
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
  app: {
    name: getEnvVar('VITE_APP_NAME', 'EngageIQ'),
    environment: getEnvVar('VITE_ENVIRONMENT', 'development') as 'development' | 'production' | 'staging'
  },
  api: {
    enableAnalytics: getEnvBoolean('VITE_ENABLE_ANALYTICS', false)
  }
}

// No runtime validation is performed here. Backend is authoritative for
// database configuration and secrets. Frontend may include a local
// emulator endpoint (VITE_COSMOS_ENDPOINT) when useful for development,
// but we purposely avoid runtime checks or warnings in the client.

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
// Note: database provider/config checks and any client-side exposure of
// provider-specific secret shapes are intentionally omitted. The backend is
// authoritative for database configuration and secrets; frontend must not
// perform client-side setup or hold production keys.

/**
 * Export individual config sections for convenience
 */
export const appConfig = config.app
export const apiConfig = config.api

export default config
