import React from 'react';
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseConfigCard } from './DatabaseConfigCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Users, 
  Gear,
  CheckCircle,
  Sparkle as Sparkles,
  Play
} from '@phosphor-icons/react'
import { config, isDevelopment } from '@/lib/config'
import databaseService from '@/lib/database'

// Demo component to create sample users for testing and show database configuration
export const DemoUserSetup: React.FC = () => {
  const { register, user, updateProfile } = useAuth()
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [demoUsersCreated, setDemoUsersCreated] = useState(false)

  useEffect(() => {
    if (!isDevelopment) return // Only run demo user setup in dev mode
    const setupDemoUsers = async () => {
      // Create a few demo users if they don't exist
      try {
        // Create a dedicated admin demo user
        await register('EngageIQ Admin', 'engageiq_admin', 'password123')
        try {
          // Make this account a platform admin
          await updateProfile({ roles: ['engageiq_admin'] })
        } catch (e) {
          // ignore local update errors, but log for debug
          try { await databaseService.logError('DemoUserSetup.updateProfile', e, {}) } catch (err) { console.error('[DemoUserSetup] failed to log error', err) }
        }

        await register('Alice Johnson', 'alice@demo.com', 'password123')
        // (Note: engageiq_admin user is seeded above as admin)
        await register('Bob Smith', 'bob@demo.com', 'password123')
        await register('Carol Davis', 'carol@demo.com', 'password123')
        setDemoUsersCreated(true)
      } catch (error) {
        // Users might already exist, which is fine
        setDemoUsersCreated(true)
        // Persist a diagnostic so we know if a creation attempt is failing in production
        try { databaseService.logError('DemoUserSetup.setupDemoUsers', error, {}) } catch (e) { console.error('[DemoUserSetup] failed to log error', e) }
      }
    }

    // Only run once on component mount
    setupDemoUsers()
  }, [register, updateProfile])

  const triggerOnboarding = () => {
    if (user) {
      updateProfile({ onboardingCompleted: false })
      window.location.reload() // Simple way to trigger onboarding
    }
  }

  // Show database configuration dialog in development mode
  if (isDevelopment && demoUsersCreated) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 bg-background/80 backdrop-blur-sm border-dashed"
            >
              <Database className="h-4 w-4" />
              DB Config
              <Badge variant="secondary" className="ml-1 text-xs">
                {config.database.provider.toUpperCase()}
              </Badge>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gear className="h-5 w-5" />
                Database Configuration
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <DatabaseConfigCard />
              
              {/* Demo Users Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Demo Users Available
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <strong>engageiq_admin</strong> - password123
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <strong>alice@demo.com</strong> - password123
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <strong>bob@demo.com</strong> - password123  
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <strong>carol@demo.com</strong> - password123
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use these accounts to test the application features.
                  </p>
                </CardContent>
              </Card>

              {/* Onboarding Testing */}
              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4" />
                      Development Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Test the onboarding flow for new users.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={triggerOnboarding}
                      className="w-full gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Trigger Onboarding Flow
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Current status: {user.onboardingCompleted ? 'Completed' : 'Not completed'}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return null // This component doesn't render anything in production or before demo users are created
}