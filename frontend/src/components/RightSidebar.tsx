import React from 'react';

import { Shield } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DailyEngagementWidget } from '@/components/DailyEngagementWidget'
import { FollowSuggestions } from '@/components/FollowSuggestions'
import type { User, Post } from '@/types'

type RankInfo = {
  icon: React.ElementType
  color: string
  title: string
}

interface RightSidebarProps {
  currentUser: User
  users: User[]
  posts: Post[]
  isUserModerator: boolean
  activeTab: string
  getUserRank: (karma: number) => RankInfo
  setIsCreatePostOpen: (open: boolean) => void
  viewUserProfile: (user: User) => void
  followUser: (userId: string) => void
  unfollowUser: (userId: string) => void
  setIsSearchOpen: (open: boolean) => void
}

export const RightSidebar: React.FC<RightSidebarProps> = (props) => {
  const { currentUser, users, posts, isUserModerator, activeTab, getUserRank, setIsCreatePostOpen, viewUserProfile, followUser, setIsSearchOpen } = props
  return (
    <aside className="hidden xl:block w-80 flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Current User Profile Card */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{currentUser.name}</h3>
              <div className="flex items-center gap-1">
                {(() => {
                  const rank = getUserRank(currentUser.karma || 0)
                  return (
                    <>
                      <rank.icon className={`h-3 w-3 ${rank.color}`} />
                      <span className={`text-xs ${rank.color}`}>{rank.title}</span>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="font-semibold text-sm">{currentUser.karma || 0}</div>
              <div className="text-xs text-muted-foreground">Karma</div>
            </div>
            <div>
              <div className="font-semibold text-sm">{posts.filter(p => p.userId === currentUser.id).length}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
          </div>

          {/* Moderator Badge */}
          {isUserModerator && (
            <div className="mt-3 text-center">
              <Badge variant="default" className="gap-1">
                <Shield className="h-3 w-3" />
                Moderator
              </Badge>
            </div>
          )}
        </Card>

        {/* Daily Engagement Widget - only on feed tab */}
        {activeTab === 'feed' && (
          <DailyEngagementWidget
            userId={currentUser.id}
            userName={currentUser.name}
            onCreatePost={() => setIsCreatePostOpen(true)}
          />
        )}

        {/* Follow Suggestions - only on feed tab */}
        {activeTab === 'feed' && (
          <FollowSuggestions
            users={users}
            currentUser={currentUser}
            posts={posts}
            onFollowUser={followUser}
            onViewUserProfile={viewUserProfile}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}
      </div>
    </aside>
  )
}