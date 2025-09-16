import { useState } from 'react';
import { UserPlus, Sparkle as Sparkles, Users, ArrowRight, X } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import type { User } from '@/types'

interface Post {
  id: string
  userId: string
  tags?: string[]
  type: 'social' | 'professional' | 'discussion'
}

interface FollowSuggestionsProps {
  users: User[]
  currentUser: User
  posts: Post[]
  onFollowUser: (userId: string) => void
  onViewUserProfile: (user: User) => void
  onOpenSearch: () => void
}

export function FollowSuggestions({
  users,
  currentUser,
  posts,
  onFollowUser,
  onViewUserProfile,
  onOpenSearch
}: FollowSuggestionsProps) {
  const [dismissedUsers, setDismissedUsers] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)

  // Get smart suggestions based on various factors
  const getSuggestedUsers = () => {
    const currentUserTopics = currentUser.interestedTopics || []
    const currentUserSkills = currentUser.skills || []
    const currentFollowing = currentUser.following || []
    
    // Filter out current user, already followed users, and dismissed users
    const availableUsers = users.filter(user => 
      user.id !== currentUser.id && 
      user.name !== currentUser.name &&
      !currentFollowing.includes(user.id) &&
      !dismissedUsers.includes(user.id)
    )

    // Score users based on compatibility
    const scoredUsers = availableUsers.map(user => {
      let score = 0
  const reasons: string[] = []

      // Topic similarity (highest weight)
      const userTopics = user.interestedTopics || []
      const commonTopics = userTopics.filter(topic => 
        currentUserTopics.some(currentTopic => 
          currentTopic.toLowerCase() === topic.toLowerCase()
        )
      )
      if (commonTopics.length > 0) {
        score += commonTopics.length * 3
        reasons.push(`${commonTopics.length} shared topic${commonTopics.length > 1 ? 's' : ''}`)
      }

      // Skill overlap
      const userSkills = user.skills || []
      const commonSkills = userSkills.filter(skill =>
        currentUserSkills.some(currentSkill =>
          currentSkill.toLowerCase() === skill.toLowerCase()
        )
      )
      if (commonSkills.length > 0) {
        score += commonSkills.length * 2
        reasons.push(`${commonSkills.length} shared skill${commonSkills.length > 1 ? 's' : ''}`)
      }

      // Professional similarity
      if (user.company && currentUser.company && 
          user.company.toLowerCase() === currentUser.company.toLowerCase()) {
        score += 3
        reasons.push('same company')
      }

      // Activity level (users who post in relevant topics)
      const userPosts = posts.filter(post => post.userId === user.id)
      const relevantPosts = userPosts.filter(post => {
        if (!post.tags) return false
        return post.tags.some(tag =>
          currentUserTopics.some(topic =>
            topic.toLowerCase() === tag.toLowerCase()
          )
        )
      })
      if (relevantPosts.length > 0) {
        score += Math.min(relevantPosts.length, 3)
        reasons.push('posts about your interests')
      }

      // Karma score (engagement quality)
      if (user.karma && user.karma > 100) {
        score += 1
        reasons.push('active contributor')
      }

      // Mutual connections (users followed by people you follow)
      const mutualConnections = currentFollowing.filter(followedId => {
        const followedUser = users.find(u => u.id === followedId)
        return followedUser?.following?.includes(user.id)
      })
      if (mutualConnections.length > 0) {
        score += mutualConnections.length
        reasons.push(`${mutualConnections.length} mutual connection${mutualConnections.length > 1 ? 's' : ''}`)
      }

      // Recently joined users (welcome new members)
      const daysSinceJoined = (Date.now() - user.joinedAt) / (1000 * 60 * 60 * 24)
      if (daysSinceJoined <= 7 && score > 0) {
        score += 1
        reasons.push('new member')
      }

      return {
        user,
        score,
        reasons: reasons.slice(0, 2) // Show top 2 reasons
      }
    })

    // Sort by score and return top suggestions
    return scoredUsers
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, showAll ? 10 : 4)
  }

  const suggestions = getSuggestedUsers()

  const dismissUser = (userId: string) => {
    setDismissedUsers(prev => [...prev, userId])
  }

  const UserSuggestionCard = ({ 
    suggestion 
  }: { 
    suggestion: { user: User; score: number; reasons: string[] } 
  }) => {
    const { user, reasons } = suggestion

    return (
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar 
              className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => onViewUserProfile(user)}
            >
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 
                    className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors truncate"
                    onClick={() => onViewUserProfile(user)}
                  >
                    {user.name}
                  </h4>
                  {user.title && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.title}
                      {user.company && ` at ${user.company}`}
                    </p>
                  )}
                  {user.bio && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {user.bio}
                    </p>
                  )}
                  
                  {/* Show a small preview of user's interested topics / tags */}
                  {user.interestedTopics && user.interestedTopics.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {user.interestedTopics.slice(0, 3).map(topic => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {user.interestedTopics.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{user.interestedTopics.length - 3}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Suggestion reasons */}
                  {reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {reasons.map((reason, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="sm"
                    onClick={() => onFollowUser(user.id)}
                    className="text-xs px-3 h-7 gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    Follow
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissUser(user.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{(user.followers || []).length} followers</span>
                <span>{posts.filter(p => p.userId === user.id).length} posts</span>
                {user.karma && user.karma > 0 && (
                  <span>{user.karma} karma</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No Suggestions Available</h3>
          <p className="text-muted-foreground text-sm mb-4">
            We couldn't find users with similar interests. Try searching for specific people or topics.
          </p>
          <Button onClick={onOpenSearch} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Search for People
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Suggested for You
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Follow these users to see their posts in your activity feed
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map(suggestion => (
          <UserSuggestionCard key={suggestion.user.id} suggestion={suggestion} />
        ))}
        
        {/* Show more/less toggle */}
        {getSuggestedUsers().length > 4 && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full gap-2"
            >
              {showAll ? (
                <>Show Less</>
              ) : (
                <>
                  Show More Suggestions
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Search button */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSearch}
            className="w-full gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Find More People
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}