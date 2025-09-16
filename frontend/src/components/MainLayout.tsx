import React from 'react';

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Shield, Hash } from '@phosphor-icons/react'
import { LeftSidebar, MobileNavigation } from '@/components/Navigation'
import { RightSidebar } from '@/components/RightSidebar'
import { FeedFilters, EmptyFeedState } from '@/components/FeedFilters'
import { PostCard } from '@/components/PostCard'
import { DatabaseSetupPrompt } from '@/components/DatabaseSetupPrompt'
import { DailyEngagementWidget } from '@/components/DailyEngagementWidget'
// Lazy-load heavier/rarely-used widgets to reduce initial bundle size
const LeaderboardWidget = React.lazy(() => import('@/components/LeaderboardWidget').then(mod => ({ default: mod.LeaderboardWidget })))
const TrendingTopicsWidget = React.lazy(() => import('@/components/TrendingTopicsWidget').then(mod => ({ default: mod.TrendingTopicsWidget })))
import { ContentDiscovery } from '@/components/ContentDiscovery'
import { TopicFeedHeader } from '@/components/TopicFeedHeader'
import { GroupCard } from '@/components/GroupCard'
import { ContentModerationTools } from '@/components/ContentModerationTools'
import { ModerationDashboard } from '@/components/ModerationDashboard'
import type { User, Post, Group, Report } from '@/types'
import type { MentionableUser } from '@/lib/mentions'

// TODO: Define UserRank type and logic elsewhere if not present
// Placeholder UserRank type
type UserRank = { icon: React.ElementType, color: string, title: string }

interface MainLayoutProps {
  currentUser: User
  users: User[]
  followUser: (userId: string) => void
  unfollowUser: (userId: string) => void
  editPost: (postId: string, content: string, tags?: string[]) => void
  deletePost: (postId: string) => void
  onToggleUpvote?: (postId: string) => void
  onToggleDownvote?: (postId: string) => void
  posts: Post[]
  groups: Group[]
  allMentionableUsers: MentionableUser[]
  filteredAndSortedPosts: Post[]
  activeTab: string
  setActiveTab: (tab: string) => void
  feedFilter: string // unified to string for compatibility
  setFeedFilter: (filter: string) => void // unified to string for compatibility
  sortBy: 'new' | 'hot' | 'top'
  setSortBy: (sort: 'new' | 'hot' | 'top') => void
  selectedTopicFilter: string[]
  setSelectedTopicFilter: (topics: string[]) => void
  isUserModerator: boolean
  reports: Report[]
  getUserRank: (karma: number) => UserRank
  setIsCreatePostOpen: (open: boolean) => void
  setViewingUserProfile: (user: User) => void
  setIsSearchOpen: (open: boolean) => void
  setShowTopicSetup: (show: boolean) => void
  toggleLike: (postId: string) => void
  addComment: (postId: string, content: string, parentId?: string) => void
  // Add other handlers as needed
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentUser,
  users,
  followUser,
  unfollowUser,
  editPost,
  deletePost,
  onToggleUpvote,
  onToggleDownvote,
  posts,
  groups,
  allMentionableUsers,
  filteredAndSortedPosts,
  activeTab,
  setActiveTab,
  feedFilter,
  setFeedFilter,
  sortBy,
  setSortBy,
  selectedTopicFilter,
  setSelectedTopicFilter,
  isUserModerator,
  reports,
  getUserRank,
  setIsCreatePostOpen,
  setViewingUserProfile,
  setIsSearchOpen,
  setShowTopicSetup,
  toggleLike,
  addComment
}) => {
  return (
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex gap-6 lg:gap-8">
        {/* Left Sidebar */}
        <LeftSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUserModerator={isUserModerator}
          reports={reports}
          users={users}
          currentUser={currentUser}
          posts={posts}
          groups={groups}
          setViewingUserProfile={setViewingUserProfile}
          setSelectedTopicFilter={setSelectedTopicFilter}
          setFeedFilter={setFeedFilter}
          setIsSearchOpen={setIsSearchOpen}
          joinGroup={() => {}} // Implement these handlers
          followUser={followUser}
          viewGroup={() => {}}
          viewUserProfile={setViewingUserProfile}
          setIsCreatePostOpen={setIsCreatePostOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <MobileNavigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isUserModerator={isUserModerator}
            reports={reports}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="feed" className="space-y-4">
              <DatabaseSetupPrompt />
              
              {/* Mobile Widgets */}
              <div className="lg:hidden space-y-4">
                <DailyEngagementWidget
                  userId={currentUser.id}
                  userName={currentUser.name}
                  onCreatePost={() => setIsCreatePostOpen(true)}
                />
                
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
                  
                  {isUserModerator && (
                    <div className="mt-3 text-center">
                      <Badge variant="default" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Moderator
                      </Badge>
                    </div>
                  )}
                </Card>
                
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

                {(!currentUser?.interestedTopics || currentUser?.interestedTopics.length === 0) && (
                  <ContentDiscovery
                    posts={posts}
                    groups={groups}
                    users={users}
                    currentUserId={currentUser.id}
                    onJoinGroup={() => {}}
                    onFollowUser={followUser}
                    onViewGroup={() => {}}
                    onViewUser={setViewingUserProfile as (user: User) => void}
                    onCreatePost={() => setIsCreatePostOpen(true)}
                  />
                )}
              </div>
              
              <FeedFilters
                feedFilter={feedFilter}
                setFeedFilter={setFeedFilter}
                currentUser={currentUser}
                posts={posts}
                setShowTopicSetup={setShowTopicSetup}
              />
              
              {feedFilter === 'topics' && (
                <TopicFeedHeader
                  userTopics={currentUser?.interestedTopics || []}
                  availableTopics={(() => {
                    const topicCounts = posts.reduce((acc, post) => {
                      if (post.tags) {
                        post.tags.forEach(tag => {
                          acc[tag] = (acc[tag] || 0) + 1
                        })
                      }
                      return acc
                    }, {} as Record<string, number>)

                    groups.forEach(group => {
                      if (group.topics) {
                        group.topics.forEach(topic => {
                          topicCounts[topic] = (topicCounts[topic] || 0) + group.postCount
                        })
                      }
                    })

                    return Object.entries(topicCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([topic]) => topic)
                  })()}
                  selectedTopicFilter={selectedTopicFilter}
                  onTopicFilterChange={setSelectedTopicFilter}
                  onEditTopics={() => {}} // Implement this
                  postCount={filteredAndSortedPosts.length}
                />
              )}

              {feedFilter !== 'topics' && (() => {
                const topicCounts = posts.reduce((acc, post) => {
                  if (post.tags) {
                    post.tags.forEach(tag => {
                      acc[tag] = (acc[tag] || 0) + 1
                    })
                  }
                  return acc
                }, {} as Record<string, number>)

                const popularTopics = Object.entries(topicCounts)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 8)
                  .map(([topic]) => topic)

                if (popularTopics.length > 0) {
                  return (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Popular Topics:</p>
                      <div className="flex gap-2 flex-wrap">
                        {popularTopics.map(topic => (
                          <Button
                            key={topic}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => {
                              setFeedFilter('topics')
                              setSelectedTopicFilter([topic])
                            }}
                          >
                            <Hash className="h-3 w-3" />
                            {topic}
                            <span className="text-xs text-muted-foreground ml-1">
                              {topicCounts[topic]}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              <div className="flex gap-2 mb-4">
                <span className="text-sm text-muted-foreground flex items-center">Sort by:</span>
                <Button
                  variant={sortBy === 'new' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('new')}
                  className="h-7 px-2 text-xs"
                >
                  New
                </Button>
                <Button
                  variant={sortBy === 'hot' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('hot')}
                  className="h-7 px-2 text-xs"
                >
                  Hot
                </Button>
                <Button
                  variant={sortBy === 'top' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('top')}
                  className="h-7 px-2 text-xs"
                >
                  Top
                </Button>
              </div>

              {posts.length === 0 ? (
                <Card className="p-8 text-center">
                  <h3 className="font-semibold mb-2">Welcome to EngageIQ!</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your thoughts and connect with others. Create your first post to get started.
                  </p>
                  <Button onClick={() => setIsCreatePostOpen(true)}>Create First Post</Button>
                </Card>
              ) : filteredAndSortedPosts.length === 0 ? (
                <EmptyFeedState
                  feedFilter={feedFilter}
                  setFeedFilter={setFeedFilter}
                  setIsSearchOpen={setIsSearchOpen}
                  users={users}
                  currentUser={currentUser}
                  posts={posts}
                  followUser={followUser}
                  viewUserProfile={setViewingUserProfile}
                />
              ) : (
                filteredAndSortedPosts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser}
                    users={users}
                    groups={groups}
                    allMentionableUsers={allMentionableUsers}
                    onToggleUpvote={onToggleUpvote}
                    onToggleDownvote={onToggleDownvote}
                    toggleLike={toggleLike}
                    addComment={addComment}
                    editComment={() => {}}
                    deleteComment={() => {}}
                    editPost={editPost}
                    deletePost={deletePost}
                    setViewingUserProfile={setViewingUserProfile}
                    handleContentAction={() => {}}
                    handleUserAction={() => {}}
                    handleReportContent={() => {}}
                    isUserModerator={isUserModerator}
                    getUserRank={getUserRank}
                    followUser={followUser}
                    unfollowUser={unfollowUser}
                  />
                ))
              )}
            </TabsContent>

            {/* Groups Tab */}
            <TabsContent value="groups" className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Groups</h2>
                {/* <CreateGroupDialog
                  open={false}
                  onOpenChange={() => {}}
                  onCreateGroup={() => {}}
                /> */}
              </div>
              {groups.length === 0 ? (
                <Card className="p-8 text-center">
                  <h3 className="font-semibold mb-2">No Groups Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create or join groups to connect with communities around your interests.
                  </p>
                  <Button>Create Your First Group</Button>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {groups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onJoinGroup={() => {}}
                      onLeaveGroup={() => {}}
                      onViewGroup={() => {}}
                      onViewGroupPage={() => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card className="p-8 text-center">
                <h3 className="font-semibold mb-2">Your Profile</h3>
                <p className="text-muted-foreground mb-4">
                  Profile content would be rendered here.
                </p>
              </Card>
            </TabsContent>

            {/* Moderation Tabs */}
            {isUserModerator && (
              <>
                <TabsContent value="moderation" className="space-y-4">
                  <React.Suspense fallback={<div className="p-2"><span className="text-sm text-muted-foreground">Loading moderation tools…</span></div>}>
                    <ContentModerationTools
                     currentUser={currentUser}
                     users={users}
                     posts={posts}
                     groups={groups}
                     onUpdateUserStatus={() => {}}
                     onContentAction={() => {}}
                     isUserModerator={isUserModerator}
                   />
                  </React.Suspense>
                </TabsContent>

                <TabsContent value="mod-dashboard" className="space-y-4">
                  <React.Suspense fallback={<div className="p-2"><span className="text-sm text-muted-foreground">Loading moderation dashboard…</span></div>}>
                    <ModerationDashboard
                     currentUser={currentUser}
                     isUserModerator={isUserModerator}
                   />
                  </React.Suspense>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <RightSidebar
          currentUser={currentUser}
          users={users}
          posts={posts}
          isUserModerator={isUserModerator}
          activeTab={activeTab}
          getUserRank={getUserRank}
          setIsCreatePostOpen={setIsCreatePostOpen}
          viewUserProfile={setViewingUserProfile}
          followUser={followUser}
          unfollowUser={unfollowUser}
          setIsSearchOpen={setIsSearchOpen}
        />
      </div>
    </main>
  )
}