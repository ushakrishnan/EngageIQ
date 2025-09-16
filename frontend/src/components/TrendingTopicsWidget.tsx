import { useState } from 'react'
import { Hash, TrendUp as TrendingUp, Clock, Fire, Sparkle as Sparkles, ArrowUpRight } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Post {
  id: string
  userId: string
  content: string
  timestamp: number
  tags?: string[]
  score?: number
  groupId?: string
}

interface Group {
  id: string
  name: string
  topics: string[]
  postCount: number
  members: Array<{ userId: string }>
}

interface TrendingTopic {
  name: string
  postCount: number
  recentActivity: number
  growthRate: number
  isHot: boolean
  isNew: boolean
}

interface TrendingTopicsWidgetProps {
  posts: Post[]
  groups: Group[]
  onTopicClick: (topic: string) => void
  onViewAllTopics: () => void
}

export function TrendingTopicsWidget({ posts, groups, onTopicClick, onViewAllTopics }: TrendingTopicsWidgetProps) {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | 'all'>('24h')

  // Calculate trending topics based on posts and groups
  const getTrendingTopics = (): TrendingTopic[] => {
    const now = Date.now()
    const timeframeMs = timeframe === '24h' ? 24 * 60 * 60 * 1000 : 
                       timeframe === '7d' ? 7 * 24 * 60 * 60 * 1000 : 
                       Number.MAX_SAFE_INTEGER

    const cutoffTime = now - timeframeMs

    // Count topic mentions from posts
    const topicCounts: Record<string, { 
      total: number, 
      recent: number, 
      lastSeen: number,
      scores: number[]
    }> = {}

    const safePosts = posts || []
    const safeGroups = groups || []

    // Process post tags
    safePosts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => {
          if (!topicCounts[tag]) {
            topicCounts[tag] = { total: 0, recent: 0, lastSeen: 0, scores: [] }
          }
          topicCounts[tag].total++
          topicCounts[tag].lastSeen = Math.max(topicCounts[tag].lastSeen, post.timestamp)
          topicCounts[tag].scores.push(post.score || 0)
          
          if (post.timestamp >= cutoffTime) {
            topicCounts[tag].recent++
          }
        })
      }
    })

    // Process group topics (weighted by member count and activity)
    safeGroups.forEach(group => {
      if (group.topics) {
        group.topics.forEach(topic => {
          if (!topicCounts[topic]) {
            topicCounts[topic] = { total: 0, recent: 0, lastSeen: 0, scores: [] }
          }
          
          // Weight group topics by member count and post count
          const memberCount = Array.isArray(group.members) ? group.members.length : 0
          const groupPostCount = typeof group.postCount === 'number' ? group.postCount : 0
          const groupWeight = Math.min(memberCount * 0.5, 10) + Math.min(groupPostCount * 0.1, 5)
           topicCounts[topic].total += groupWeight
           topicCounts[topic].recent += groupWeight * 0.5 // Groups contribute to recent activity
         })
       }
     })

    // Convert to trending topics with analysis
    const trendingTopics: TrendingTopic[] = Object.entries(topicCounts)
      .map(([name, data]) => {
        const avgScore = Array.isArray(data.scores) && data.scores.length > 0 ?
          data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length : 0
        
        const recentActivity = data.recent
        const growthRate = data.total > 0 ? (data.recent / data.total) * 100 : 0
        const isHot = avgScore > 1 && recentActivity >= 2
        const isNew = data.lastSeen > (now - 3 * 24 * 60 * 60 * 1000) && data.total <= 3 // New if seen in last 3 days and low total count

        return {
          name,
          postCount: Math.round(data.total),
          recentActivity,
          growthRate,
          isHot,
          isNew
        }
      })
      .filter(topic => topic.postCount > 0)
      .sort((a, b) => {
        // Sort by recent activity first, then by total count
        if (a.recentActivity !== b.recentActivity) {
          return b.recentActivity - a.recentActivity
        }
        return b.postCount - a.postCount
      })
      .slice(0, 8) // Show top 8 trending topics

    return trendingTopics
  }

  const trendingTopics = getTrendingTopics()

  const getTopicIcon = (topic: TrendingTopic) => {
    if (topic.isHot) return <Fire className="h-3 w-3 text-orange-500" />
    if (topic.isNew) return <Sparkles className="h-3 w-3 text-blue-500" />
    return <Hash className="h-3 w-3 text-muted-foreground" />
  }

  const getTopicBadge = (topic: TrendingTopic) => {
    if (topic.isHot) return <Badge variant="destructive" className="text-xs px-1">Hot</Badge>
    if (topic.isNew) return <Badge variant="secondary" className="text-xs px-1">New</Badge>
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h3 className="font-medium text-sm">Trending Topics</h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant={timeframe === '24h' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setTimeframe('24h')}
            >
              24h
            </Button>
            <Button
              variant={timeframe === '7d' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setTimeframe('7d')}
            >
              7d
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {trendingTopics.length === 0 ? (
          <div className="text-center py-4">
            <Hash className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No trending topics yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Topics will appear as users add hashtags to posts
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {trendingTopics.map((topic, index) => (
              <div
                key={topic.name}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onTopicClick(topic.name)}
              >
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs font-medium text-muted-foreground w-4 text-center">
                    {index + 1}
                  </span>
                  {getTopicIcon(topic)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      #{topic.name}
                    </span>
                    {getTopicBadge(topic)}
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{topic.postCount} posts</span>
                    {topic.recentActivity > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{Math.round(topic.recentActivity)} recent</span>
                        </div>
                      </>
                    )}
                    {topic.growthRate > 50 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-2.5 w-2.5 text-green-500" />
                          <span className="text-green-600">+{Math.round(topic.growthRate)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {trendingTopics.length >= 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 h-8 text-xs gap-2"
                onClick={onViewAllTopics}
              >
                View All Topics
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}