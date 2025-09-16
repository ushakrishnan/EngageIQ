import { useAppConfig, useFeatureFlags, useEnvironmentSettings } from '@/hooks/useConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Warning as AlertTriangle } from '@phosphor-icons/react'

/**
 * Environment Configuration Demo Component
 * 
 * This component demonstrates how to use environment variables
 * in your React components. It shows configuration status,
 * feature flags, and environment-specific settings.
 */
export function EnvironmentDemo() {
  const { config, isValid, loading, isDevelopment } = useAppConfig()
  const featureFlags = useFeatureFlags()
  const settings = useEnvironmentSettings()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Environment Configuration</h2>
        <p className="text-muted-foreground">
          Current configuration status and settings from environment variables
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" weight="fill" />
            )}
            Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cosmos Endpoint</span>
              <Badge variant={config.database?.cosmos?.endpoint ? "default" : "destructive"}>
                {config.database?.cosmos?.endpoint ? "Configured" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cosmos Key</span>
              <Badge variant={config.database?.cosmos?.key ? "default" : "destructive"}>
                {config.database?.cosmos?.key ? "Configured" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">App Name</span>
              <Badge variant="outline">{config.app.name}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Environment</span>
              <Badge 
                variant={
                  config.app.environment === 'production' ? 'default' :
                  config.app.environment === 'development' ? 'secondary' : 'outline'
                }
              >
                {config.app.environment.toUpperCase()}
              </Badge>
            </div>
          </div>

          {!isValid && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Configuration Issues Detected</p>
                <p className="text-red-600 mt-1">
                  Some required environment variables are missing. Please check your .env file.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Analytics</span>
              <Badge variant={featureFlags.analyticsEnabled ? "default" : "secondary"}>
                {featureFlags.analyticsEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Debug Mode</span>
              <Badge variant={featureFlags.debugMode ? "default" : "secondary"}>
                {featureFlags.debugMode ? "On" : "Off"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Beta Features</span>
              <Badge variant={featureFlags.betaFeatures ? "default" : "secondary"}>
                {featureFlags.betaFeatures ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">API Base URL</label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {settings.apiBaseUrl}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">App Version</label>
              <p className="text-sm">{settings.appVersion}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development Tools */}
      {isDevelopment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Development</Badge>
              Developer Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These tools are only available in development mode.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.log('Full config:', config)}
              >
                Log Config to Console
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.table(Object.entries(import.meta.env))}
              >
                Log All Env Vars
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}