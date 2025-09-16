import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Database, Warning as AlertTriangle, Gear as Settings, ArrowRight, X, ArrowClockwise as RefreshCw } from '@phosphor-icons/react'
import { CosmosSetupWizard } from './CosmosSetupWizard'
import { config, isDevelopment, isCosmosDbConfigured } from '@/lib/config'
import { initializeDatabase } from '@/lib/database'
import { useAuth } from '@/hooks/useAuth'

interface DatabaseSetupPromptProps {
  onDismiss?: () => void
}

export function DatabaseSetupPrompt({ onDismiss }: DatabaseSetupPromptProps) {
  const [showWizard, setShowWizard] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [checking, setChecking] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  // Track whether we've completed the initial probe so we don't flash the setup card
  const [probeDone, setProbeDone] = useState(false)
  const { user } = useAuth()
  const isAdmin = !!user && (user.roles || []).includes('engageiq_admin')

  useEffect(() => {
    // Check if user has already dismissed this prompt in this session
    const dismissed = sessionStorage.getItem('cosmos-setup-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Prefer environment-driven config detection first; if present, try an actual connection test.
    let mounted = true
    setChecking(true)
    ;(async () => {
      try {
        if (isCosmosDbConfigured()) {
          try {
            // Prefer backend readiness probe instead of SDK stats, because the frontend
            // uses the REST adapter and databaseService.getStats is not implemented there.
            await initializeDatabase()
            try {
              const res = await fetch('/ready')
              if (res.ok) {
                const json = await res.json()
                if (mounted && json && json.ok) { setIsConfigured(true); return }
              }
            } catch (err) {
              console.warn('[DatabaseSetupPrompt] /ready probe failed', err)
            }
            // fallback: if /ready didn't report ok, mark unreachable
            if (!mounted) return
            setIsConfigured(false)
            setChecking(false)
            setProbeDone(true)
            return
          } catch (err) {
            console.warn('[DatabaseSetupPrompt] initializeDatabase failed', err)
            if (!mounted) return
            setIsConfigured(false)
            setChecking(false)
            setProbeDone(true)
            return
          }
        }

        // Fallback to client-side saved config (setup wizard state in localStorage)
        const localConfigured = isCosmosDbConfigured()
        if (!mounted) return
        setIsConfigured(localConfigured)
      } catch (err) {
        console.error('DatabaseSetupPrompt check failed', err)
      } finally {
        if (mounted) {
          setChecking(false)
          setProbeDone(true)
        }
      }
    })()

    return () => { mounted = false }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('cosmos-setup-dismissed', 'true')
    onDismiss?.()
  }

  const handleWizardComplete = () => {
    setShowWizard(false)
    setIsConfigured(true)
    handleDismiss()
  }

  // Wait for probe to finish to avoid flashing the setup card; then don't show if already configured, dismissed, or not in development
  if (!probeDone) return null
  if (isConfigured || isDismissed || !isDevelopment) {
    return null
  }
  // Only show the database setup prompt to platform admins in dev
  if (!isAdmin) return null

  return (
    <>
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Database Setup Required
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-amber-800 dark:text-amber-200">
              Configure Azure Cosmos DB to store your application data in the cloud with 
              enterprise-grade security and global distribution.
            </p>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white dark:bg-gray-800">
                Current: {config.database.provider.toUpperCase()}
              </Badge>
              {checking ? (
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  Checking...
                </Badge>
              ) : (isCosmosDbConfigured() && !isConfigured) ? (
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  Status: Unreachable
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-white dark:bg-gray-800">
                  Status: Not Configured
                </Badge>
              )}
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <Database className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Benefits:</strong> Global distribution, automatic scaling, 99.999% availability,
              enterprise security, and multiple consistency models.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => setShowWizard(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Setup Cosmos DB
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>

      <CosmosSetupWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
      />
    </>
  )
}