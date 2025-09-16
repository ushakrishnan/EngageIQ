import { useEffect, useState } from 'react'
import { config } from '@/lib/config'

// Simple validation function that narrows unknown to a config-like object
const validateConfig = (cfg: unknown): cfg is { app: Record<string, unknown>, database: Record<string, unknown>, api: Record<string, unknown> } => {
  return typeof cfg === 'object' && cfg !== null && 'app' in cfg && 'database' in cfg && 'api' in cfg
}

/**
 * Hook to access application configuration
 * Provides reactive access to config and validation status
 */
export function useAppConfig() {
  const [isValid, setIsValid] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Validate configuration on mount
    const valid = validateConfig(config)
    setIsValid(valid)
    setLoading(false)

    // Log configuration status in development
    if (config.app.environment === 'development') {
      console.log('App Configuration:', {
        name: config.app.name,
        environment: config.app.environment,
        databaseProvider: config.database.provider,
        cosmosConfigured: !!(config.database.cosmos.endpoint && config.database.cosmos.key),
      })
    }
  }, [])

  return {
    config,
    isValid,
    loading,
    isDevelopment: config.app.environment === 'development',
    isProduction: config.app.environment === 'production',
  }
}

/**
 * Hook for feature flags based on environment
 */
export function useFeatureFlags() {
  const { config } = useAppConfig()

  return {
    analyticsEnabled: config.api.enableAnalytics,
    debugMode: config.app.environment === 'development',
    betaFeatures: config.app.environment !== 'production',
    // Add more feature flags as needed
  }
}

/**
 * Hook to get environment-specific settings
 */
export function useEnvironmentSettings() {
  const { config } = useAppConfig()

  return {
    appName: config.app.name,
    environment: config.app.environment,
    // Provide common environment settings the UI expects
    apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) || '',
    appVersion: (import.meta.env.VITE_APP_VERSION as string) || 'dev'
  }
}