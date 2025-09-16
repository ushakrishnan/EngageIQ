/**
 * Database Configuration Component
 * 
 * This component displays the current database configuration and provides
 * helpful information about setup and troubleshooting.
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Warning as AlertTriangle, 
  ArrowRight as ExternalLink,
  Copy,
  Sparkle as Sparkles
} from '@phosphor-icons/react'
import { 
  config, 
  isDatabaseConfigured, 
  isCosmosDbConfigured 
} from '@/lib/config'
import { initializeDatabase, databaseService } from '@/lib/database'
import { toast } from 'sonner'

export function DatabaseConfigCard() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | 'unconfigured'>('checking')
  interface DatabaseStats { totalItems?: number; lastUpdated?: number | string; itemsByType?: Record<string, number> }
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isConfigured = isDatabaseConfigured()

  const checkConnection = useCallback(async () => {
     setConnectionStatus('checking')
     setError(null)

    if (!isConfigured) {
      setConnectionStatus('unconfigured')
      return
    }

    try {
      await initializeDatabase()
      const databaseStats = await databaseService.getStats()
      setStats(databaseStats)
      setConnectionStatus('connected')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Unknown error occurred')
      setConnectionStatus('error')
    }
  }, [isConfigured])

  // Run initial connection check
  useEffect(() => {
    void checkConnection()
  }, [checkConnection])

  const copyEnvTemplate = () => {
    const template = `# Cosmos DB Configuration
DATABASE_PROVIDER=cosmos
COSMOS_DB_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-db-primary-key
COSMOS_DB_DATABASE_NAME=engageiq
COSMOS_DB_CONTAINER_NAME=data`

    navigator.clipboard.writeText(template)
    toast.success('Environment template copied to clipboard!')
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'unconfigured':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Database className="h-5 w-5 text-blue-500 animate-pulse" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'error':
        return 'Connection Error'
      case 'unconfigured':
        return 'Not Configured'
      default:
        return 'Checking...'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'default'
      case 'error':
        return 'destructive'
      case 'unconfigured':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Provider */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Provider:</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              🌐 Cosmos DB
            </Badge>
            {getStatusIcon()}
            <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Configuration Status:</span>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {isCosmosDbConfigured() ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Cosmos DB credentials configured
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  Cosmos DB credentials not configured
                </>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && connectionStatus === 'connected' && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Database Statistics:</span>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Items: <strong>{stats.totalItems}</strong></div>
              <div>Last Updated: <strong>{stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : '—'}</strong></div>
            </div>
            {stats.itemsByType && Object.keys(stats.itemsByType).length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Items by Type:</span>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(stats.itemsByType).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}: {count as number}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && connectionStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Help */}
        {connectionStatus === 'unconfigured' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Database not configured.</strong> Please set up your environment variables.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={checkConnection}
            disabled={connectionStatus === 'checking'}
          >
            {connectionStatus === 'checking' ? 'Checking...' : 'Test Connection'}
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={copyEnvTemplate}
            className="gap-1"
          >
            <Copy className="h-3 w-3" />
            Copy Env Template
          </Button>

          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1"
            onClick={() => window.open('https://portal.azure.com', '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            Azure Portal
          </Button>
        </div>

        {/* Quick Setup Guide */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Quick Setup:</strong></p>
          <p>1. Copy the environment template above</p>
          <p>2. Create a <code>.env</code> file in your project root</p>
          <p>3. Fill in your Cosmos DB credentials</p>
          <p>4. Restart your development server</p>
        </div>

        {/* Development Mode Notice */}
        {config.app.environment === 'development' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <Sparkles className="h-4 w-4" />
              <strong>Development Mode</strong>
            </div>
            <p className="text-blue-600 text-xs mt-1">
              In development, the app will work without a database connection using local storage. 
              Set up a database for persistent storage and real-time features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}