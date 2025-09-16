import type { User } from '../types'
import React from 'react';
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Hash, Plus, X, Sparkle as Sparkles, Check, Brain, Target, TrendUp as TrendingUp, Users, BookOpen, Lightbulb } from '@phosphor-icons/react'
// Removed unused import
import { toast } from 'sonner'

interface TopicInterestsSetupProps {
  onComplete?: () => void
  onSkip?: () => void
  showSkip?: boolean
}

// Categories with curated topics and descriptions
const TOPIC_CATEGORIES = {
  'Technology': {
    icon: Brain,
    description: 'Programming, AI, and digital innovation',
    topics: [
      'Programming', 'AI & Machine Learning', 'Web Development', 'Mobile Development',
      'Data Science', 'Cybersecurity', 'Cloud Computing', 'DevOps', 'Blockchain'
    ]
  },
  'Design & Creative': {
    icon: Sparkles,
    description: 'Visual design, user experience, and creative arts',
    topics: [
      'UI/UX', 'Graphic Design', 'Product Design', 'Art & Illustration', 'Photography'
    ]
  },
  'Business': {
    icon: Target,
    description: 'Entrepreneurship, leadership, and professional growth',
    topics: [
      'Entrepreneurship', 'Marketing', 'Finance', 'Leadership', 'Startups'
    ]
  },
  'Lifestyle': {
    icon: Users,
    description: 'Personal interests and lifestyle topics',
    topics: [
      'Health & Fitness', 'Travel', 'Cooking', 'Books', 'Photography'
    ]
  },
  'Science & Education': {
    icon: BookOpen,
    description: 'Research, learning, and scientific discovery',
    topics: [
      'Science', 'Environment', 'Education', 'Research', 'Psychology'
    ]
  },
  'Entertainment': {
    icon: TrendingUp,
    description: 'Gaming, media, and entertainment content',
    topics: [
      'Gaming', 'Music', 'Movies & TV', 'Sports', 'Art'
    ]
  }
}

export const TopicInterestsSetup: React.FC<TopicInterestsSetupProps & { user: User, updateProfile: (profile: Partial<User>) => Promise<void> }> = ({
  onComplete, 
  onSkip, 
  showSkip = true,
  user,
  updateProfile
}) => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>(user?.interestedTopics || [])
  const [customTopic, setCustomTopic] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getPersonalizationLevel = () => {
    if (selectedTopics.length === 0) return { level: 'None', color: 'text-muted-foreground', description: 'No personalization yet' }
    if (selectedTopics.length < 3) return { level: 'Basic', color: 'text-orange-500', description: 'Getting started' }
    if (selectedTopics.length < 6) return { level: 'Good', color: 'text-yellow-500', description: 'Decent personalization' }
    if (selectedTopics.length < 10) return { level: 'Great', color: 'text-green-500', description: 'Strong personalization' }
    return { level: 'Excellent', color: 'text-blue-500', description: 'Highly personalized' }
  }

  const personalizationLevel = getPersonalizationLevel()
  const personalizationScore = Math.min(100, (selectedTopics.length / 10) * 100)

  const addTopic = (topic: string) => {
    const trimmedTopic = topic.trim()
    if (trimmedTopic && !selectedTopics.includes(trimmedTopic) && selectedTopics.length < 15) {
      setSelectedTopics(prev => [...prev, trimmedTopic])
    }
  }

  const removeTopic = (topicToRemove: string) => {
    setSelectedTopics(prev => prev.filter(topic => topic !== topicToRemove))
  }

  const addCustomTopic = () => {
    if (customTopic.trim()) {
      addTopic(customTopic)
      setCustomTopic('')
    }
  }

  const handleCustomTopicKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomTopic()
    }
  }

  const addCategoryTopics = (categoryTopics: string[]) => {
    const newTopics = categoryTopics.filter(topic => 
      !selectedTopics.includes(topic) && 
      selectedTopics.length + categoryTopics.filter(t => !selectedTopics.includes(t)).length <= 15
    )
    setSelectedTopics(prev => [...prev, ...newTopics.slice(0, 15 - prev.length)])
  }

  const handleSave = async () => {
    if (selectedTopics.length === 0) {
      toast.error('Please select at least one topic to get personalized content')
      return
    }

    setIsSubmitting(true)

    try {
  await updateProfile({
        interestedTopics: selectedTopics
      })
      
      toast.success(`Great! You'll now see personalized content for ${selectedTopics.length} topics`)
      onComplete?.()
    } catch {
      toast.error('Failed to save topic preferences')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onSkip?.()
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          Personalize Your Experience
        </CardTitle>
        <CardDescription>
          Select topics you're interested in to see relevant posts, groups, and people in your feeds.
          You can always change these later in your profile.
        </CardDescription>
        
        {/* Personalization Score */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Personalization Level</span>
            <Badge variant="outline" className={personalizationLevel.color}>
              {personalizationLevel.level}
            </Badge>
          </div>
          <Progress value={personalizationScore} className="mb-2" />
          <p className="text-xs text-muted-foreground">{personalizationLevel.description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Topics Display */}
        {selectedTopics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Your Interests ({selectedTopics.length})
              </h4>
              {selectedTopics.length >= 3 && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Ready for personalized content!
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              {selectedTopics.map((topic) => (
                <Badge key={topic} variant="default" className="gap-1">
                  {topic}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeTopic(topic)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Benefits of Personalization */}
        {selectedTopics.length < 3 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              What you'll get with personalized content:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Relevant posts in your feed</li>
              <li>• Recommended groups to join</li>
              <li>• Suggested people to follow</li>
              <li>• Trending topics in your areas of interest</li>
            </ul>
          </div>
        )}

        {/* Topic Categories */}
        {selectedTopics.length < 15 && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Browse by Category</h4>
            {Object.entries(TOPIC_CATEGORIES).map(([category, { icon: Icon, description, topics }]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <h5 className="text-sm font-medium">{category}</h5>
                    <span className="text-xs text-muted-foreground">— {description}</span>
                  </div>
                  {topics.some(topic => !selectedTopics.includes(topic)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addCategoryTopics(topics)}
                      className="h-6 px-2 text-xs"
                    >
                      Add All
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {topics
                    .filter(topic => !selectedTopics.includes(topic))
                    .map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => addTopic(topic)}
                      >
                        {topic}
                        <Plus className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Topic Input */}
        {selectedTopics.length < 15 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Add Custom Topic</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Type any topic you're interested in..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyPress={handleCustomTopicKeyPress}
                maxLength={30}
              />
              <Button
                type="button"
                size="sm"
                onClick={addCustomTopic}
                disabled={!customTopic.trim()}
                className="px-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {showSkip && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSave}
              disabled={selectedTopics.length === 0 || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <Hash className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Saving...' : `Save ${selectedTopics.length} Topics`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}