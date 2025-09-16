

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Warning as WarningCircle, Spinner, Database, Key, Cloud, ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { testCosmosConnection } from '@/lib/test-cosmos'
import { cosmosConfig } from '@/lib/config'

interface CosmosSetupWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function CosmosSetupWizard({ open, onOpenChange, onComplete }: CosmosSetupWizardProps) {
  const [step, setStep] = useState(0)
  const [endpoint, setEndpoint] = useState(cosmosConfig.endpoint || '')
  const [key, setKey] = useState(cosmosConfig.key || '')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleTestConnection = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const result = await testCosmosConnection(endpoint, key)
      if (result) {
        setSuccess(true)
        toast.success('Connection successful!')
        setStep(1)
      } else {
        setError('Connection failed. Please check your credentials and network.')
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : { message: String(e) }
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    // Save to localStorage for demo/dev; in production, this should be handled securely
    localStorage.setItem('VITE_COSMOS_ENDPOINT', endpoint)
    localStorage.setItem('VITE_COSMOS_KEY', key)
    toast.success('Cosmos DB credentials saved!')
    onComplete()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cosmos DB Setup Wizard
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {step === 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Enter Credentials</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your Azure Cosmos DB endpoint and primary key.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="endpoint">Endpoint</Label>
                  <Input
                    id="endpoint"
                    placeholder="https://your-account.documents.azure.com:443/"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key">Primary Key</Label>
                  <div className="relative">
                    <Input
                      id="key"
                      type={showKey ? 'text' : 'password'}
                      placeholder="Your primary key..."
                      value={key}
                      onChange={e => setKey(e.target.value)}
                      disabled={loading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <WarningCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleTestConnection}
                    disabled={loading || !endpoint.trim() || !key.trim()}
                    className="flex-1"
                  >
                    {loading ? <Spinner className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {step === 1 && success && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Connection Successful</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your Cosmos DB credentials are valid. Save to continue.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    Cosmos DB connection established! You can now use the app with cloud storage.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Save & Continue
                  </Button>
                  <Button variant="outline" onClick={() => setStep(0)}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}