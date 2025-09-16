import type { User } from '../types'
import React from 'react';
import { useState } from 'react'
import { Button } from '@/components/ui/button'
// ...existing code...
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Briefcase, Hash, Users, CheckCircle, ArrowRight, ArrowLeft, Sparkle as Sparkles, Brain, Target, Lightning, Trophy } from '@phosphor-icons/react'
// ...existing code...
import { TopicInterestsSetup } from '@/components/TopicInterestsSetup'
import { toast } from 'sonner'

interface OnboardingFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  user: User
  updateProfile: (profile: Partial<User>) => Promise<void>
}

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  required: boolean
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with EngageIQ',
    icon: Sparkles,
    required: true
  },
  {
    id: 'profile',
    title: 'Professional Profile',
    description: 'Tell us about your professional background',
    icon: UserPlus,
    required: true
  },
  {
    id: 'interests',
    title: 'Topic Interests',
    description: 'Choose topics that interest you',
    icon: Hash,
    required: true
  },
  {
    id: 'discover',
    title: 'Discover',
    description: 'Find people and groups to follow',
    icon: Users,
    required: false
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Your profile is ready',
    icon: Trophy,
    required: true
  }
]

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Real Estate', 'Media', 'Non-profit', 'Government', 'Other'
]

// Removed unused JOB_LEVELS

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ 
  open, 
  onOpenChange, 
  onComplete,
  user,
  updateProfile
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  // Removed unused completedSteps and setCompletedSteps

  // Profile form state
  const [profileData, setProfileData] = useState({
  title: user?.title || '',
  company: user?.company || '',
  location: user?.location || '',
  bio: user?.bio || '',
  industry: '',
  jobLevel: '',
  skills: user?.skills || []
  })
  const [newSkill, setNewSkill] = useState('')

  // Calculate progress
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100

  // Removed completedSteps logic; onboarding step completion is now handled by canProceed and local state only

  // Removed unused isStepCompleted
  const canProceed = () => {
    const step = ONBOARDING_STEPS[currentStep]
    if (!step.required) return true
    
    switch (step.id) {
      case 'welcome':
        return true
      case 'profile':
        return profileData.title.trim() && profileData.company.trim()
      case 'interests':
        return user?.interestedTopics && user.interestedTopics.length > 0
      case 'discover':
        return true
      case 'complete':
        return true
      default:
        return true
    }
  }

  const handleNext = async () => {
    const step = ONBOARDING_STEPS[currentStep]
    
    // Save step data if needed
    if (step.id === 'profile') {
      await handleSaveProfile()
    }
    
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
  try {
  await updateProfile({
        title: profileData.title,
        company: profileData.company,
        location: profileData.location,
        bio: profileData.bio,
        skills: profileData.skills
      })
      
  // Removed setCompletedSteps; onboarding step completion handled by local state only
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error('Failed to update profile')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    toast.success('Welcome to EngageIQ! Your profile is all set.')
    onComplete()
    onOpenChange(false)
  }

  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim()) && profileData.skills.length < 10) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter((skill: string) => skill !== skillToRemove)
    }))
  }

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  const renderStepContent = () => {
    const step = ONBOARDING_STEPS[currentStep]

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome to EngageIQ, {user?.name}!</h2>
                <p className="text-muted-foreground">
                  Let's set up your profile in just a few steps to help you get the most out of our platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="text-center p-4 rounded-lg bg-card border">
                <Brain className="h-6 w-6 text-accent mx-auto mb-2" />
                <h3 className="font-medium text-sm">Smart Content</h3>
                <p className="text-xs text-muted-foreground">Personalized feeds</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-card border">
                <Users className="h-6 w-6 text-accent mx-auto mb-2" />
                <h3 className="font-medium text-sm">Professional Network</h3>
                <p className="text-xs text-muted-foreground">Connect with experts</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-card border">
                <Lightning className="h-6 w-6 text-accent mx-auto mb-2" />
                <h3 className="font-medium text-sm">Real-time Updates</h3>
                <p className="text-xs text-muted-foreground">Stay informed</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-card border">
                <Target className="h-6 w-6 text-accent mx-auto mb-2" />
                <h3 className="font-medium text-sm">Career Growth</h3>
                <p className="text-xs text-muted-foreground">Advance your career</p>
              </div>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                This setup takes about 2-3 minutes and will help us personalize your experience.
              </p>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                <UserPlus className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-xl font-bold">Build Your Professional Profile</h2>
              <p className="text-sm text-muted-foreground">
                Help others discover your expertise and connect with the right opportunities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Software Engineer"
                  value={profileData.title}
                  onChange={(e) => setProfileData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  placeholder="e.g. TechCorp Inc."
                  value={profileData.company}
                  onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. San Francisco, CA"
                  value={profileData.location}
                  onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={profileData.industry} onValueChange={(value: string) => setProfileData(prev => ({ ...prev, industry: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(industry => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself, your interests, and what you're passionate about..."
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-3">
              <Label>Skills (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={handleSkillKeyPress}
                  maxLength={30}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addSkill}
                  disabled={!newSkill.trim() || profileData.skills.length >= 10}
                >
                  Add
                </Button>
              </div>
              {profileData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill: string) => (
                    <Badge key={skill} variant="outline" className="gap-1">
                      {skill}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeSkill(skill)}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                💡 A complete profile helps you connect with relevant professionals and opportunities.
              </p>
            </div>
          </div>
        )

      case 'interests':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                <Hash className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-xl font-bold">What Are You Interested In?</h2>
              <p className="text-sm text-muted-foreground">
                Select topics to get personalized content recommendations.
              </p>
            </div>
            <TopicInterestsSetup
              user={user}
              updateProfile={updateProfile}
              onComplete={handleNext}
              onSkip={handleSkipStep}
              showSkip={false}
            />
          </div>
        )

      case 'discover':
        return (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-xl font-bold">Discover Your Community</h2>
              <p className="text-sm text-muted-foreground">
                You can explore groups and connect with professionals once you're in the main app.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-sm">Professional Groups</h3>
                    <p className="text-xs text-muted-foreground">Join industry-specific discussions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                    <Lightning className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-sm">Trending Topics</h3>
                    <p className="text-xs text-muted-foreground">Stay updated with latest trends</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <Brain className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-sm">Expert Network</h3>
                    <p className="text-xs text-muted-foreground">Connect with industry leaders</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                We'll suggest relevant groups and people based on your interests and profile.
              </p>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto">
                <Trophy className="h-8 w-8 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
                <p className="text-muted-foreground">
                  Your EngageIQ profile is complete and ready to help you connect with the professional community.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Profile completed</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Interests selected</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Ready to engage</span>
              </div>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <h3 className="font-medium mb-2">Next Steps:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Explore personalized content in your feed</li>
                <li>• Join relevant professional groups</li>
                <li>• Start following industry experts</li>
                <li>• Share your first post or insight</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Onboarding Flow</DialogTitle>
        </DialogHeader>
        
        {/* Progress Header */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </div>
            <div className="text-sm font-medium">
              {Math.round(progress)}% Complete
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {ONBOARDING_STEPS[currentStep].id !== 'interests' && ONBOARDING_STEPS[currentStep].id !== 'complete' && (
              <Button
                variant="ghost"
                onClick={handleSkipStep}
                disabled={ONBOARDING_STEPS[currentStep].required}
              >
                Skip
              </Button>
            )}
            
            {currentStep < ONBOARDING_STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Get Started
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}