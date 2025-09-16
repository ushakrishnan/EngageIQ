import React from 'react';

import { Clock, TrendUp as TrendingUp, Fire, Hash, House, Briefcase } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FollowSuggestions } from '@/components/FollowSuggestions'
import type { User, Post } from '@/types'

interface FeedFiltersProps {
  feedFilter: string // unified to string for compatibility
  setFeedFilter: (filter: string) => void // unified to string for compatibility
  currentUser: User
  posts: Post[]
  setShowTopicSetup: (show: boolean) => void
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({
  feedFilter,
  setFeedFilter,
  currentUser,
  posts,
  setShowTopicSetup
}) => {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      <Button
        variant={feedFilter === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setFeedFilter('all')}
        className="gap-2"
      >
        <House className="h-4 w-4" />
        All
      </Button>
      <Button
        variant={feedFilter === 'following' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setFeedFilter('following')}
        className="gap-2 relative"
      >
        <Clock className="h-4 w-4" />
        Following
        {(() => {
          const followingUserIds = currentUser?.following || []
          if (followingUserIds.length > 0) {
            const followingPosts = posts.filter(post => 
              followingUserIds.includes(post.userId) && post.userId !== currentUser.id
            )
            if (followingPosts.length > 0) {
              return (
                <div className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {followingPosts.length > 9 ? '9+' : followingPosts.length}
                </div>
              )
            }
          }
          return null
        })()}
      </Button>
      <Button
        variant={feedFilter === 'professional' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setFeedFilter('professional')}
        className="gap-2"
      >
        <Briefcase className="h-4 w-4" />
        Professional
      </Button>
      <Button
        variant={feedFilter === 'topics' ? 'default' : 'outline'}
        size="sm"
        onClick={() => {
          if (!currentUser?.interestedTopics || currentUser?.interestedTopics.length === 0) {
            setShowTopicSetup(true)
          } else {
            setFeedFilter('topics')
          }
        }}
        className="gap-2"
        title="Posts matching your interested topics"
      >
        <Hash className="h-4 w-4" />
        Topics
        {(!currentUser?.interestedTopics || currentUser?.interestedTopics.length === 0) && (
          <Badge variant="secondary" className="ml-1 text-xs px-1">
            Setup
          </Badge>
        )}
      </Button>
      <Button
        variant={feedFilter === 'trending' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setFeedFilter('trending')}
        className="gap-2"
      >
        <TrendingUp className="h-4 w-4" />
        Trending
      </Button>
      <Button
        variant={feedFilter === 'hot' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setFeedFilter('hot')}
        className="gap-2"
      >
        <Fire className="h-4 w-4" />
        Hot
      </Button>
    </div>
  )
}

interface EmptyFeedStateProps {
  feedFilter: string // unified to string for compatibility
  setFeedFilter: (filter: string) => void // unified to string for compatibility
  setIsSearchOpen: (open: boolean) => void
  users: User[]
  currentUser: User
  posts: Post[]
  followUser: (userId: string) => void
  viewUserProfile: (user: User) => void
}

export const EmptyFeedState: React.FC<EmptyFeedStateProps> = ({
  feedFilter,
  setFeedFilter,
  setIsSearchOpen,
  users,
  currentUser,
  posts,
  followUser,
  viewUserProfile
}) => {
  if (feedFilter === 'following') {
    return (
      <div className="space-y-6">
        <Card className="p-6 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No posts from people you follow</h3>
          <p className="text-muted-foreground mb-4">
            Follow other users to see their posts in your activity feed, or switch to "All Posts" to see everything.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setFeedFilter('all')}>
              View All Posts
            </Button>
            <Button variant="outline" onClick={() => setIsSearchOpen(true)}>
              Find People to Follow
            </Button>
          </div>
        </Card>
        
        {/* Follow Suggestions */}
        <FollowSuggestions
          users={users}
          currentUser={currentUser}
          posts={posts}
          onFollowUser={followUser}
          onViewUserProfile={viewUserProfile}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      </div>
    )
  }

  return (
    <Card className="p-8 text-center">
      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-semibold mb-2">No posts found</h3>
      <p className="text-muted-foreground mb-4">
        Try switching to a different filter or create some content to get started.
      </p>
      <Button onClick={() => setFeedFilter('all')}>
        View All Posts
      </Button>
    </Card>
  )
}