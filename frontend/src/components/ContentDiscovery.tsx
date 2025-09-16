import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lightbulb, TrendUp as TrendingUp, Users, Hash, Star, Clock, ArrowRight } from '@phosphor-icons/react'

import type { User, Post, Group } from '@/types'

type ContentSuggestion = {
  type: 'trending_topic' | 'active_group' | 'popular_user' | 'discussion_starter'
  title: string
  description: string
  // data holds different shapes depending on suggestion type; use unknown and narrow where needed
  data: unknown
  score: number
}

interface ContentDiscoveryProps {
  posts: Post[]
  groups: Group[]
  users: User[]
  currentUserId: string
  onJoinGroup: (groupId: string) => void
  onFollowUser: (userId: string) => void
  onViewGroup: (group: Group) => void
  onViewUser: (user: User) => void
  onCreatePost: () => void
}

export const ContentDiscovery: React.FC<ContentDiscoveryProps> = ({
  posts,
  groups,
  users,
  currentUserId,
  onJoinGroup,
  onFollowUser,
  onViewGroup,
  onViewUser,
  onCreatePost
}) => {
  // Generate content suggestions
  const generateSuggestions = (): ContentSuggestion[] => {
    const suggestions: ContentSuggestion[] = []
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    // Find trending topics
    const topicCounts: Record<string, number> = {}
    posts
      .filter(p => p.timestamp > oneWeekAgo)
      .forEach(post => {
        if (post.tags) {
          post.tags.forEach(tag => {
            topicCounts[tag] = (topicCounts[tag] || 0) + 1
          })
        }
      })

    Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .forEach(([topic, count]) => {
        suggestions.push({
          type: 'trending_topic',
          title: `#${topic} is trending`,
          description: `${count} new posts this week`,
          data: { topic, count },
          score: count * 2
        })
      })

    // Find active groups
    const groupActivity = groups
      .filter(g => !(Array.isArray(g.members) && g.members.some(m => m.userId === currentUserId)))
      .map(group => {
        const memberCount = Array.isArray(group.members) ? group.members.length : 0
        const recentPosts = posts.filter(p => 
          p.groupId === group.id && 
          p.timestamp > oneWeekAgo
        ).length
        return { group, activity: recentPosts + memberCount * 0.1, memberCount }
      })
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 2)

    groupActivity.forEach(({ group, activity, memberCount }) => {
      suggestions.push({
        type: 'active_group',
        title: `Join ${group.name}`,
        description: `${memberCount} members • ${group.topics?.slice(0, 2).join(', ')}`,
        data: group,
        score: activity
      })
    })

    // Find popular users to follow
    const userPopularity = users
      .filter(u => u.id !== currentUserId)
      .filter(u => !u.followers?.includes(currentUserId))
      .map(user => {
        const userPosts = posts.filter(p => p.userId === user.id)
        const totalEngagement = userPosts.reduce((sum, p) => 
          sum + (p.likes || []).length + (p.comments || []).length, 0
        )
        return { user, popularity: (user.karma || 0) + totalEngagement }
      })
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 2)

    userPopularity.forEach(({ user, popularity }) => {
      suggestions.push({
        type: 'popular_user',
        title: `Follow ${user.name}`,
        description: user.title ? `${user.title} • ${user.karma || 0} karma` : `${user.karma || 0} karma`,
        data: user,
        score: popularity * 0.1
      })
    })

    // Find discussion starters
    const discussionTopics = [
      'What are your thoughts on the future of remote work?',
      'Share your favorite productivity tips',
      'What technology trend excites you most?',
      'How do you stay motivated in your career?',
      'What book changed your perspective recently?'
    ]

    suggestions.push({
      type: 'discussion_starter',
      title: 'Start a discussion',
      description: discussionTopics[Math.floor(Math.random() * discussionTopics.length)],
      data: { prompt: 'discussion' },
      score: 50
    })

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 4)
  }

  const suggestions = generateSuggestions()

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'trending_topic': return TrendingUp
      case 'active_group': return Users
      case 'popular_user': return Star
      case 'discussion_starter': return Lightbulb
      default: return Hash
    }
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'trending_topic': return 'text-orange-500'
      case 'active_group': return 'text-blue-500'
      case 'popular_user': return 'text-purple-500'
      case 'discussion_starter': return 'text-green-500'
      default: return 'text-muted-foreground'
    }
  }

  const handleSuggestionAction = (suggestion: ContentSuggestion) => {
    switch (suggestion.type) {
      case 'active_group': {
        const group = suggestion.data as Group
        onJoinGroup(group.id)
        break
      }
      case 'popular_user': {
        const user = suggestion.data as User
        onFollowUser(user.id)
        break
      }
      case 'discussion_starter':
        onCreatePost()
        break
      default:
        // For trending topics, could filter or navigate
        break
    }
  }

  if (suggestions.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-accent" />
          Discover Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {suggestions.map((suggestion, index) => {
            const Icon = getSuggestionIcon(suggestion.type)
            const colorClass = getSuggestionColor(suggestion.type)
            
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <div>
                    <p className="font-medium text-sm">{suggestion.title}</p>
                    <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {suggestion.type === 'trending_topic' && (
                    <Badge variant="outline" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Hot
                    </Badge>
                  )}
                  {suggestion.type === 'active_group' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSuggestionAction(suggestion)}
                        className="h-7 px-2 text-xs"
                      >
                        Join
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewGroup(suggestion.data as Group)}
                        className="h-7 px-2 text-xs"
                      >
                        View
                      </Button>
                    </>
                  )}
                  {suggestion.type === 'popular_user' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSuggestionAction(suggestion)}
                        className="h-7 px-2 text-xs"
                      >
                        Follow
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewUser(suggestion.data as User)}
                        className="h-7 px-2 text-xs"
                      >
                        View
                      </Button>
                    </>
                  )}
                  {suggestion.type === 'discussion_starter' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleSuggestionAction(suggestion)}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      Try it
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Call to action */}
        <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            <Clock className="h-4 w-4 inline mr-1" />
            Content refreshes as you engage with the community
          </p>
        </div>
      </CardContent>
    </Card>
  )
}