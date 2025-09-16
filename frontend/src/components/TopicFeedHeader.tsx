import React from 'react';
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Hash, Sparkle as Sparkles, TrendUp as TrendingUp, Gear as Settings, Funnel as Filter } from '@phosphor-icons/react'
import { TopicInterestsSetup } from './TopicInterestsSetup'
import type { User } from '@/types'

interface TopicFeedHeaderProps {
  userTopics: string[]
  availableTopics: string[]
  selectedTopicFilter: string[]
  onTopicFilterChange: (topics: string[]) => void
  onEditTopics: () => void
  postCount: number
}

export const TopicFeedHeader: React.FC<TopicFeedHeaderProps> = ({
  userTopics,
  availableTopics,
  selectedTopicFilter,
  onTopicFilterChange,
  onEditTopics,
  postCount
}) => {
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [showAllTopics, setShowAllTopics] = useState(false)

  const toggleTopicFilter = (topic: string) => {
    if (selectedTopicFilter.includes(topic)) {
      onTopicFilterChange(selectedTopicFilter.filter(t => t !== topic))
    } else {
      onTopicFilterChange([...selectedTopicFilter, topic])
    }
  }

  const clearFilters = () => {
    onTopicFilterChange([])
  }

  const selectAllUserTopics = () => {
    onTopicFilterChange(userTopics)
  }

  const displayTopics = showAllTopics ? availableTopics : availableTopics.slice(0, 12)

  if (userTopics.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Personalize Your Feed</h3>
          <p className="text-muted-foreground mb-4">
            Set your topic interests to see content tailored to your preferences.
          </p>
          <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Set Your Interests
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Set Your Topic Interests</DialogTitle>
              </DialogHeader>
              <TopicInterestsSetup 
                onComplete={() => setIsSetupOpen(false)}
                onSkip={() => setIsSetupOpen(false)}
                showSkip={true}
                user={{ id: '', name: '', email: '', avatar: '', bio: '', joinedAt: Date.now(), following: [], followers: [], karma: 0, karmaHistory: [], achievements: [], status: 'offline' }}
                updateProfile={async (_profile: Partial<User>) => { void _profile }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5 text-accent" />
            Topic-Based Feed
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEditTopics} className="gap-2">
            <Settings className="h-4 w-4" />
            Edit Topics
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            {selectedTopicFilter.length === 0 
              ? `Showing posts for all your ${userTopics.length} interests`
              : `Filtered by ${selectedTopicFilter.length} topics • ${postCount} posts`
            }
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your Topics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Your Interests</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllUserTopics}
                className="h-6 px-2 text-xs"
              >
                Select All
              </Button>
              {selectedTopicFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {userTopics.map((topic) => {
              const isSelected = selectedTopicFilter.includes(topic)
              return (
                <Badge
                  key={topic}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => toggleTopicFilter(topic)}
                >
                  {topic}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Trending Topics */}
        {availableTopics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Active Topics
              </h4>
              {availableTopics.length > 12 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllTopics(!showAllTopics)}
                  className="h-6 px-2 text-xs"
                >
                  {showAllTopics ? 'Show Less' : `+${availableTopics.length - 12} More`}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {displayTopics.map((topic) => {
                const isSelected = selectedTopicFilter.includes(topic)
                const isUserTopic = userTopics.includes(topic)
                return (
                  <Badge
                    key={topic}
                    variant={isSelected ? "default" : isUserTopic ? "secondary" : "outline"}
                    className={`cursor-pointer transition-colors text-xs ${
                      isSelected 
                        ? "bg-accent text-accent-foreground" 
                        : isUserTopic
                        ? "hover:bg-accent hover:text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => toggleTopicFilter(topic)}
                  >
                    {topic}
                    {/* Show count if available */}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Filter Summary */}
        {selectedTopicFilter.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <Filter className="h-3 w-3" />
            <span>
              Filtering by: {selectedTopicFilter.join(', ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}