import React from 'react';

import { House, Users, Users as UsersIcon, Shield, ChartBar as BarChart3 } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Lazy-load leaderboard and trending widgets to avoid inflating the main bundle
const LeaderboardWidget = React.lazy(() => import('@/components/LeaderboardWidget').then(mod => ({ default: mod.LeaderboardWidget })))
const TrendingTopicsWidget = React.lazy(() => import('@/components/TrendingTopicsWidget').then(mod => ({ default: mod.TrendingTopicsWidget })))
import { ContentDiscovery } from '@/components/ContentDiscovery'
import type { User, Post, Group, Report } from '@/types'

interface NavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isUserModerator: boolean
  reports: Report[]
  users: User[]
  currentUser: User
  posts: Post[]
  groups: Group[]
  setViewingUserProfile: (user: User) => void
  setSelectedTopicFilter: (topics: string[]) => void
  setFeedFilter: (filter: string) => void
  setIsSearchOpen: (open: boolean) => void
  joinGroup: (groupId: string) => void
  followUser: (userId: string) => void
  viewGroup: (group: Group) => void
  viewUserProfile: (user: User) => void
  setIsCreatePostOpen: (open: boolean) => void
}

export const LeftSidebar: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  users,
  currentUser,
  posts,
  groups,
  setViewingUserProfile,
  setSelectedTopicFilter,
  setFeedFilter,
  setIsSearchOpen,
  joinGroup,
  followUser,
  viewGroup,
  viewUserProfile,
  setIsCreatePostOpen
}) => {
  return (
    <aside className="hidden lg:block w-64 xl:w-80 flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Community Navigation */}
        <Card className="p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Community</h3>
          </div>
          <nav className="space-y-2">
            <Button
              variant={activeTab === 'feed' ? 'default' : 'ghost'}
              className="w-full justify-start gap-3"
              onClick={() => setActiveTab('feed')}
            >
              <House className="h-4 w-4" />
              Feed
            </Button>
            <Button
              variant={activeTab === 'groups' ? 'default' : 'ghost'}
              className="w-full justify-start gap-3"
              onClick={() => setActiveTab('groups')}
            >
              <Users className="h-4 w-4" />
              Groups
            </Button>
          </nav>
        </Card>

        {/* Top Contributors Widget - only on feed tab */}
        {activeTab === 'feed' && (
          <React.Suspense fallback={<div className="p-2"><span className="text-sm text-muted-foreground">Loading leaderboard…</span></div>}>
            <LeaderboardWidget
              users={users.map(u => ({ id: u.id, name: u.name, avatar: u.avatar, karma: u.karma || 0 }))}
              currentUserId={currentUser.id}
              onViewUserProfile={(user) => {
                const fullUser = users.find(u => u.id === user.id)
                if (fullUser) {
                  setViewingUserProfile(fullUser)
                }
              }}
            />
          </React.Suspense>
        )}

        {/* Trending Topics Widget - only on feed tab */}
        {activeTab === 'feed' && (
          <React.Suspense fallback={<div className="p-2"><span className="text-sm text-muted-foreground">Loading topics…</span></div>}>
            <TrendingTopicsWidget
              posts={posts}
              groups={groups}
              onTopicClick={(topic) => {
                setSelectedTopicFilter([topic])
                setFeedFilter('topics')
              }}
              onViewAllTopics={() => setIsSearchOpen(true)}
            />
          </React.Suspense>
        )}

        {/* Content Discovery for users without topic interests - only on feed tab */}
        {activeTab === 'feed' && (!currentUser?.interestedTopics || currentUser?.interestedTopics.length === 0) && (
          <ContentDiscovery
            posts={posts}
            groups={groups}
            users={users}
            currentUserId={currentUser.id}
            onJoinGroup={joinGroup}
            onFollowUser={followUser}
            onViewGroup={viewGroup}
            onViewUser={viewUserProfile}
            onCreatePost={() => setIsCreatePostOpen(true)}
          />
        )}
      </div>
    </aside>
  )
}

export const MobileNavigation: React.FC<{
  activeTab: string
  setActiveTab: (tab: string) => void
  isUserModerator: boolean
  reports: Report[]
}> = ({ activeTab, setActiveTab, isUserModerator, reports }) => {
  return (
    <div className="lg:hidden mb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feed" className="gap-2">
            <House className="h-4 w-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Personal Actions - Mobile */}
      <div className="flex gap-2 mt-3 justify-center">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('profile')}
          className="gap-2"
        >
          <UsersIcon className="h-4 w-4" />
          Profile
        </Button>
        {isUserModerator && (
          <>
            <Button
              variant={activeTab === 'moderation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('moderation')}
              className="gap-2 relative"
            >
              <Shield className="h-4 w-4" />
              Mod
              {reports.filter(r => r.status === 'pending').length > 0 && (
                <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                  {reports.filter(r => r.status === 'pending').length > 9 ? '9+' : reports.filter(r => r.status === 'pending').length}
                </div>
              )}
            </Button>
            <Button
              variant={activeTab === 'mod-dashboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('mod-dashboard')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
          </>
        )}
      </div>
    </div>
  )
}