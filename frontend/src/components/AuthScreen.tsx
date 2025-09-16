import { useState } from 'react'
import { Eye, EyeSlash, UserPlus, SignIn, Users, Brain, Lightning, Sparkle as Sparkles, TrendUp as TrendingUp, Shield, Hash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import databaseService from '@/lib/database'
import { toast } from 'sonner'

export const AuthScreen = () => {
  const { login, register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      const success = await login(loginEmail, loginPassword)
      if (success) {
        toast.success('Welcome back!')
      } else {
        toast.error('Invalid email or password')
      }
    } catch (error) {
      toast.error('Login failed. Please try again.')
      try { await databaseService.logError('AuthScreen.handleLogin', error, { loginEmail }) } catch (e) { console.error('[AuthScreen] failed to log error', e) }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerName || !registerEmail || !registerPassword || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (registerPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      const success = await register(registerName, registerEmail, registerPassword)
      if (success) {
        toast.success('Account created successfully!')
      } else {
        toast.error('User with this email already exists')
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.')
      try { await databaseService.logError('AuthScreen.handleRegister', error, { registerEmail }) } catch (e) { console.error('[AuthScreen] failed to log error', e) }
    } finally {
      setIsLoading(false)
    }
  }

  const createDemoUsers = async () => {
    setIsLoading(true)
    try {
      const demoUsers = [
        { name: 'EngageIQ Admin', email: 'engageiq_admin@demo.com', password: 'password123' },
        { name: 'Alice Johnson', email: 'alice@demo.com', password: 'password123' },
        { name: 'Bob Smith', email: 'bob@demo.com', password: 'password123' },
        { name: 'Carol Davis', email: 'carol@demo.com', password: 'password123' }
      ]

      let created = 0
      for (const user of demoUsers) {
        const success = await register(user.name, user.email, user.password)
        if (success) created++
      }

      if (created > 0) {
        toast.success(`Created ${created} demo users! Try logging in with engageiq_admin@demo.com, alice@demo.com, bob@demo.com, or carol@demo.com (password: password123)`) 
      } else {
        toast.info('Demo users already exist. Try logging in with engageiq_admin@demo.com, alice@demo.com, bob@demo.com, or carol@demo.com (password: password123)')
      }
    } catch (error) {
      toast.error('Failed to create demo users')
      try { await databaseService.logError('AuthScreen.createDemoUsers', error, {}) } catch (e) { console.error('[AuthScreen] failed to log error', e) }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Welcome Content */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              <div className="relative flex items-center">
                <span className="text-3xl font-bold text-primary">E</span>
                <div className="relative ml-1">
                  <div className="border-2 border-primary rounded w-10 h-8 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">IQ</span>
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-primary">EngageIQ</h1>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              Where Professionals 
              <span className="text-accent"> Connect</span> & 
              <span className="text-accent"> Collaborate</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Join a thriving community of tech professionals, creators, and innovators. 
              Share insights, discover opportunities, and build meaningful connections.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0">
            <div className="text-center p-4 rounded-lg bg-card/50 border border-border/50">
              <Brain className="h-8 w-8 text-accent mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Smart Content</h3>
              <p className="text-xs text-muted-foreground">Personalized feeds based on your interests</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-card/50 border border-border/50">
              <Users className="h-8 w-8 text-accent mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Expert Network</h3>
              <p className="text-xs text-muted-foreground">Connect with industry leaders</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-card/50 border border-border/50">
              <Lightning className="h-8 w-8 text-accent mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Real-time Insights</h3>
              <p className="text-xs text-muted-foreground">Stay updated with trending topics</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-card/50 border border-border/50">
              <Shield className="h-8 w-8 text-accent mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Professional Focus</h3>
              <p className="text-xs text-muted-foreground">Quality discussions & content</p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium">A</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-accent/20 border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium">B</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium">C</span>
                </div>
              </div>
              <span>Join 1000+ professionals</span>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border-2 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Welcome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="gap-2">
                    <SignIn className="h-4 w-4" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Join Now
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4 mt-6">
                  <div className="space-y-3">
                    <div className="text-center">
                      <h3 className="font-semibold mb-1">Welcome Back!</h3>
                      <p className="text-sm text-muted-foreground">
                        Continue your professional journey
                      </p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeSlash className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Signing in...
                        </div>
                      ) : (
                        <>
                          <SignIn className="h-4 w-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or try demo</span>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="text-center">
                        <h4 className="font-medium text-sm mb-2">Demo Accounts</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Explore the platform with pre-configured accounts
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div>
                            <div className="font-medium">EngageIQ Admin</div>
                            <div className="text-muted-foreground">Platform Administrator</div>
                          </div>
                          <Badge variant="outline" className="text-xs">engageiq_admin@demo.com</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div>
                            <div className="font-medium">Alice Johnson</div>
                            <div className="text-muted-foreground">Senior Software Engineer</div>
                          </div>
                          <Badge variant="outline" className="text-xs">alice@demo.com</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div>
                            <div className="font-medium">Bob Smith</div>
                            <div className="text-muted-foreground">Creative Director</div>
                          </div>
                          <Badge variant="outline" className="text-xs">bob@demo.com</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div>
                            <div className="font-medium">Carol Davis</div>
                            <div className="text-muted-foreground">Product Manager</div>
                          </div>
                          <Badge variant="outline" className="text-xs">carol@demo.com</Badge>
                        </div>
                      </div>
                      <div className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          Password: password123
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2" 
                        onClick={createDemoUsers}
                        disabled={isLoading}
                      >
                        <Users className="h-4 w-4" />
                        Create Demo Users
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="register" className="space-y-4 mt-6">
                  <div className="space-y-3">
                    <div className="text-center">
                      <h3 className="font-semibold mb-1">Join EngageIQ</h3>
                      <p className="text-sm text-muted-foreground">
                        Start building your professional network today
                      </p>
                    </div>
                    
                    {/* Registration Benefits */}
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">What you'll get:</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-center gap-2">
                          <Hash className="h-3 w-3 text-accent" />
                          Personalized content feeds
                        </li>
                        <li className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-accent" />
                          Professional networking opportunities
                        </li>
                        <li className="flex items-center gap-2">
                          <Brain className="h-3 w-3 text-accent" />
                          AI-powered recommendations
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your work email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeSlash className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Creating account...
                        </div>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </form>
                  
                  <div className="text-center text-xs text-muted-foreground">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}