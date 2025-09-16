import React from 'react';
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sparkle as Sparkles, TrendUp as TrendingUp, Users, Hash, Brain, Target, Lightning, Fire } from '@phosphor-icons/react'

interface Post {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  timestamp: number
  likes: string[]
  // likes used instead
  downvotes: string[]
  // comments structure is not relied upon here; use unknown to avoid explicit any
  comments: unknown[]
  groupId?: string
  editedAt?: number
  type: 'social' | 'professional' | 'discussion'
  category?: string
  tags?: string[]
  isPinned?: boolean
  score?: number
}

interface Group {
  id: string
  name: string
  description: string
  // Only userId is accessed in this component's logic; define minimal shape
  members: { userId: string }[]
  postCount: number
  createdAt: number
  createdBy: string
  privacy: 'public' | 'private'
  avatar?: string
  category: 'professional' | 'social' | 'technical' | 'creative' | 'gaming' | 'news'
  rules: string[]
  moderators: string[]
  topics: string[]
  // channels are not typed elsewhere; use unknown to avoid explicit any
  channels: unknown[]
}

interface User {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  joinedAt: number
  following: string[]
  followers: string[]
  title?: string
  company?: string
  location?: string
  // experience entries aren't consumed here; use unknown instead of any
  experience?: unknown[]
  skills?: string[]
  karma: number
  // karma history entries may vary; unknown preserves type-safety
  karmaHistory: unknown[]
  achievements: string[]
  status: 'online' | 'away' | 'busy' | 'offline'
  statusMessage?: string
  interestedTopics?: string[]
}

interface PersonalizationInsights {
  topicEngagement: Record<string, number>
  recommendedUsers: User[]
  recommendedGroups: Group[]
  trendingInYourTopics: string[]
  personalizedScore: number
  suggestions: {
    type: 'follow_user' | 'join_group' | 'explore_topic' | 'create_content'
    title: string
    description: string
    action?: () => void
    data?: unknown
  }[]
}

interface PersonalizedContentEngineProps {
  currentUser: User
  posts: Post[]
  groups: Group[]
  users: User[]
  onFollowUser: (userId: string) => void
  onJoinGroup: (groupId: string) => void
  onViewUserProfile: (user: User) => void
  onViewGroupPage: (group: Group) => void
  onEditTopics: () => void
}

export const PersonalizedContentEngine: React.FC<PersonalizedContentEngineProps> = ({
  currentUser,
  posts,
  groups,
  users,
  onFollowUser,
  onJoinGroup,
  onViewUserProfile,
  onViewGroupPage,
  onEditTopics
}) => {
  const insights = useMemo(() => {
    const userTopics = currentUser.interestedTopics || []
    if (userTopics.length === 0) return null

    // Calculate topic engagement based on user's interactions
    const topicEngagement: Record<string, number> = {}
    
    // Score based on user's posts in topics
    posts.filter(p => p.userId === currentUser.id).forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => {
          if (userTopics.some(topic => topic.toLowerCase() === tag.toLowerCase())) {
            topicEngagement[tag] = (topicEngagement[tag] || 0) + 3
          }
        })
      }
    })

    // Score based on liked/upvoted posts in topics
    posts.forEach(post => {
      if ((post.likes || []).includes(currentUser.id)) {
        if (post.tags) {
          post.tags.forEach(tag => {
            if (userTopics.some(topic => topic.toLowerCase() === tag.toLowerCase())) {
              topicEngagement[tag] = (topicEngagement[tag] || 0) + 1
            }
          })
        }
      }
    })

    // Find recommended users (similar interests, not already following)
    const recommendedUsers = users
      .filter(user => 
        user.id !== currentUser.id && 
        !((currentUser.following || []).includes(user.id)) &&
        user.interestedTopics?.some(topic => 
          userTopics.some(userTopic => 
            userTopic.toLowerCase() === topic.toLowerCase()
          )
        )
      )
      .map(user => ({
        ...user,
        matchScore: user.interestedTopics?.filter(topic =>
          userTopics.some(userTopic =>
            userTopic.toLowerCase() === topic.toLowerCase()
          )
        ).length || 0
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)

    // Find recommended groups (similar topics, not already member)
    const recommendedGroups = groups
      .filter(group => 
        !(Array.isArray(group.members) && group.members.some(m => m.userId === currentUser.id)) &&
        group.topics?.some(topic =>
          userTopics.some(userTopic =>
            userTopic.toLowerCase() === topic.toLowerCase()
          )
        )
      )
      .map(group => ({
        ...group,
        matchScore: group.topics?.filter(topic =>
          userTopics.some(userTopic =>
            userTopic.toLowerCase() === topic.toLowerCase()
          )
        ).length || 0
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)

    // Find trending topics in user's interests
    const topicCounts: Record<string, number> = {}
    const recentPosts = posts.filter(p => Date.now() - p.timestamp < 7 * 24 * 60 * 60 * 1000) // Last week
    
    recentPosts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => {
          if (userTopics.some(topic => topic.toLowerCase() === tag.toLowerCase())) {
            topicCounts[tag] = (topicCounts[tag] || 0) + 1
          }
        })
      }
    })

    const trendingInYourTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic)

    // Calculate personalization score (0-100)
    const personalizedScore = Math.min(100, 
      (userTopics.length * 10) + // 10 points per topic
      (Object.keys(topicEngagement).length * 5) + // 5 points per engaged topic
      (recommendedUsers.length * 3) + // 3 points per potential connection
      (recommendedGroups.length * 3) // 3 points per relevant group
    )

    // Generate smart suggestions
    const suggestions: PersonalizationInsights['suggestions'] = []

    if (recommendedUsers.length > 0) {
      suggestions.push({
        type: 'follow_user',
        title: `Follow ${recommendedUsers[0].name}`,
        description: `${recommendedUsers[0].matchScore} shared interests: ${recommendedUsers[0].interestedTopics?.filter(t => userTopics.includes(t)).slice(0, 2).join(', ')}`,
        action: () => onFollowUser(recommendedUsers[0].id),
        data: recommendedUsers[0]
      })
    }

    if (recommendedGroups.length > 0) {
      suggestions.push({
        type: 'join_group',
        title: `Join ${recommendedGroups[0].name}`,
        description: `${(recommendedGroups[0].members || []).length} members discussing ${recommendedGroups[0].topics?.slice(0, 2).join(', ')}`,
        action: () => onJoinGroup(recommendedGroups[0].id),
        data: recommendedGroups[0]
      })
    }

    if (trendingInYourTopics.length > 0) {
      suggestions.push({
        type: 'explore_topic',
        title: `Explore trending: ${trendingInYourTopics[0]}`,
        description: `${topicCounts[trendingInYourTopics[0]]} new posts this week`,
        data: { topic: trendingInYourTopics[0] }
      })
    }

    if (Object.keys(topicEngagement).length < userTopics.length) {
      const unusedTopics = userTopics.filter(topic => !topicEngagement[topic])
      if (unusedTopics.length > 0) {
        suggestions.push({
          type: 'create_content',
          title: `Create content about ${unusedTopics[0]}`,
          description: 'Share your knowledge and connect with others interested in this topic',
          data: { topic: unusedTopics[0] }
        })
      }
    }

    return {
      topicEngagement,
      recommendedUsers,
      recommendedGroups,
      trendingInYourTopics,
      personalizedScore,
      suggestions
    }
  }, [currentUser, posts, groups, users, onFollowUser, onJoinGroup])

  if (!insights) return null

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'follow_user': return Users
      case 'join_group': return Users
      case 'explore_topic': return TrendingUp
      case 'create_content': return Lightning
      default: return Sparkles
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          Personalized Insights
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Personalization Score:</span>
            <div className="flex items-center gap-2">
              <Progress value={insights.personalizedScore} className="w-20 h-2" />
              <Badge variant={insights.personalizedScore >= 70 ? "default" : "outline"} className="text-xs">
                {insights.personalizedScore}%
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEditTopics} className="gap-1">
            <Target className="h-3 w-3" />
            Tune
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Smart Suggestions */}
        {insights.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Smart Suggestions
            </h4>
            <div className="grid gap-3">
              {insights.suggestions.slice(0, 2).map((suggestion, index) => {
                const Icon = getSuggestionIcon(suggestion.type)
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-accent" />
                      <div>
                        <p className="font-medium text-sm">{suggestion.title}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                      </div>
                    </div>
                    {suggestion.action && (
                      <Button size="sm" variant="outline" onClick={suggestion.action}>
                        Try it
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Topic Engagement */}
        {Object.keys(insights.topicEngagement).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Fire className="h-4 w-4" />
              Your Most Engaged Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(insights.topicEngagement)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([topic, score]) => (
                  <Badge key={topic} variant="default" className="gap-1">
                    <Hash className="h-3 w-3" />
                    {topic}
                    <span className="text-xs opacity-70">({score})</span>
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Trending in Your Topics */}
        {insights.trendingInYourTopics.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending in Your Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {insights.trendingInYourTopics.map((topic) => (
                <Badge key={topic} variant="outline" className="gap-1 cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  <Hash className="h-3 w-3" />
                  {topic}
                  <TrendingUp className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Connections */}
        {insights.recommendedUsers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recommended Connections
            </h4>
            <div className="space-y-2">
              {insights.recommendedUsers.slice(0, 2).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => onViewUserProfile(user)}
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.matchScore} shared interests
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onFollowUser(user.id)}>
                    Follow
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Groups */}
        {insights.recommendedGroups.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recommended Groups
            </h4>
            <div className="space-y-2">
              {insights.recommendedGroups.slice(0, 2).map((group) => (
                <div key={group.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => onViewGroupPage(group)}
                  >
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-xs text-accent-foreground font-medium">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(group.members || []).length} members
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onJoinGroup(group.id)}>
                    Join
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}