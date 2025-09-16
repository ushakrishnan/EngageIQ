import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X,
  Sparkle as Sparkles,
  Heart,
  Trophy,
  Users
} from '@phosphor-icons/react'
import { useAuth } from '@/hooks/useAuth'

interface WelcomeMessageProps {
  onDismiss: () => void
}

export function WelcomeMessage({ onDismiss }: WelcomeMessageProps) {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300)
  }

  if (!user) return null

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <Card className={`max-w-md w-full transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="mb-4">
            <div className="bg-gradient-to-r from-primary to-accent rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
              <Sparkles className="h-8 w-8 text-white" weight="fill" />
            </div>
            <CardTitle className="text-xl">Welcome to EngageIQ!</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              You're all set up and ready to engage with the community, {user.name}!
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-medium">Join Communities</p>
                <p className="text-xs text-muted-foreground">
                  Explore groups that match your interests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Heart className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Share & Connect</p>
                <p className="text-xs text-muted-foreground">
                  Create posts and engage with others
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Earn Karma</p>
                <p className="text-xs text-muted-foreground">
                  Build your reputation by being helpful
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleDismiss}
            className="w-full"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}