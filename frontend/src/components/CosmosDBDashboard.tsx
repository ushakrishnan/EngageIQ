// ...existing code...
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Database, CheckCircle, XCircle, Warning as AlertTriangle, Cloud, ArrowSquareOut as ExternalLink } from '@phosphor-icons/react'
import { isCosmosDbConfigured, config as appConfigExport } from '@/lib/config'
// ...existing code...

export function CosmosDBDashboard() {
  // Only environment-driven config is supported; no client-side setup
  const isConfigured = isCosmosDbConfigured()
  const config = isConfigured ? appConfigExport.database.cosmos : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Azure Cosmos DB
          </h2>
          <p className="text-muted-foreground">
            Configure and manage your Cosmos DB connection
          </p>
        </div>
        {isConfigured ? (
          <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Connected</Badge>
        ) : (
          <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />Not Configured</Badge>
        )}
      </div>

      {!isConfigured ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold">Cosmos DB Not Configured</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Set up Azure Cosmos DB to store your application data in the cloud with 
              global distribution, automatic scaling, and enterprise-grade security.
            </p>
            <Alert>
              <Cloud className="h-4 w-4" />
              <AlertDescription>
                <strong>Benefits of using Cosmos DB:</strong><br />
                • Global distribution with multi-region writes<br />
                • Automatic scaling based on demand<br />
                • 99.999% availability SLA<br />
                • Multiple consistency models<br />
                • Enterprise-grade security
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => window.open('https://portal.azure.com', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Azure Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">Configuration Details</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
                <div className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  {config?.endpoint || 'Not configured'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Database Name</label>
                <div className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  {config?.databaseName || 'Not configured'}
                </div>
              </div>
            </div>
            {config?.containerName && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Container Name</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="font-mono">
                    {config.containerName}
                  </Badge>
                </div>
              </div>
            )}
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open('https://portal.azure.com', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Azure Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}