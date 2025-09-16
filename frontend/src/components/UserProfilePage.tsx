import { useState, useMemo } from 'react'
import { Heart, ChatCircle, Users, ArrowLeft, Calendar, Eye, UserCheck, UserPlus, Trophy, Pulse as Activity, TrendUp, Crown, Fire, Clock, Star, ChartBar } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
// Removed unused import
import { renderContentWithMentions } from '@/components/MentionRenderer'
import type { MentionableUser } from '@/lib/mentions'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  joinedAt: number
  following?: string[]
  followers?: string[]
}

interface Post {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  timestamp: number
  likes: string[]
  comments: Comment[]
  groupId?: string
  editedAt?: number
}

interface Comment {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
  parentId?: string
  replies?: Comment[]
  mentions?: string[]
}

interface Group {
  id: string
  name: string
  description: string
  members: GroupMember[]
  postCount: number
  createdAt: number
  createdBy: string
  privacy: 'public' | 'private'
  avatar?: string
}

interface GroupMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: number
}

interface UserProfilePageProps {
  user: User
  posts: Post[]
  groups: Group[]
  users: User[]
  currentUser: User
  onBack: () => void
  onToggleLike: (postId: string) => void
  onAddComment: (postId: string, content: string, parentId?: string) => void
  onJoinGroup: (groupId: string) => void
  onLeaveGroup: (groupId: string) => void
  onViewGroupPage: (group: Group) => void
  onViewUserProfile: (user: User) => void
  onFollowUser: (userId: string) => void
  onUnfollowUser: (userId: string) => void
  onDeletePost?: (postId: string) => void
}

export function UserProfilePage({
  user,
  posts,
  groups,
  users,
  currentUser,
  onBack,
  onToggleLike,
  // Removed unused variables: onAddComment, onJoinGroup, onLeaveGroup
  onViewGroupPage,
  onViewUserProfile,
  onFollowUser,
  onUnfollowUser,
  onDeletePost
}: UserProfilePageProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Calculate comprehensive user statistics
  const userStats = useMemo(() => {
    const userPosts = posts.filter(p => p.userId === user.id)
    const userGroups = groups.filter(g => Array.isArray(g.members) && g.members.some(m => m.userId === user.id))
    const totalLikes = userPosts.reduce((sum, p) => sum + p.likes.length, 0)
    
    // Calculate total comments made by user
    const totalComments = posts.reduce((count, post) => {
      const countCommentsInTree = (comments: Comment[]): number => {
        return comments.reduce((sum, comment) => {
          const isUserComment = comment.userId === user.id ? 1 : 0
          const replyCount = comment.replies ? countCommentsInTree(comment.replies) : 0
          return sum + isUserComment + replyCount
        }, 0)
      }
      return count + countCommentsInTree(post.comments)
    }, 0)

    // Calculate likes given by user to others
    const likesGiven = posts.reduce((count, post) => {
      return count + (post.likes.includes(user.id) ? 1 : 0)
    }, 0)

    // Find most active group
    const groupActivity = userGroups.map(group => ({
      group,
      postCount: userPosts.filter(p => p.groupId === group.id).length
    })).sort((a, b) => b.postCount - a.postCount)

    const mostActiveGroup = groupActivity[0]?.group

    // Time-based activity analysis
    const now = Date.now()
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
  // Removed unused variable: ninetyDaysAgo

    const recentPosts = userPosts.filter(p => p.timestamp >= thirtyDaysAgo)
    const weeklyPosts = userPosts.filter(p => p.timestamp >= sevenDaysAgo)
    
    const recentComments = posts.reduce((count, post) => {
      const countRecentCommentsInTree = (comments: Comment[]): number => {
        return comments.reduce((sum, comment) => {
          const isRecentUserComment = comment.userId === user.id && comment.timestamp >= thirtyDaysAgo ? 1 : 0
          const replyCount = comment.replies ? countRecentCommentsInTree(comment.replies) : 0
          return sum + isRecentUserComment + replyCount
        }, 0)
      }
      return count + countRecentCommentsInTree(post.comments)
    }, 0)

    // Calculate engagement metrics
    const avgLikesPerPost = userPosts.length > 0 ? Math.round(totalLikes / userPosts.length * 10) / 10 : 0
    const mostLikedPost = userPosts.reduce((max, post) => 
      post.likes.length > (max?.likes.length || 0) ? post : max, null as Post | null)

    // Activity patterns
    const firstPost = userPosts.sort((a, b) => a.timestamp - b.timestamp)[0]
    const lastPost = userPosts.sort((a, b) => b.timestamp - a.timestamp)[0]
    const daysSinceFirstPost = firstPost ? Math.floor((now - firstPost.timestamp) / (1000 * 60 * 60 * 24)) : 0
    const daysSinceLastPost = lastPost ? Math.floor((now - lastPost.timestamp) / (1000 * 60 * 60 * 24)) : 0

    // Calculate activity streak (consecutive days with activity)
    const activityDates = [...new Set([
      ...userPosts.map(p => new Date(p.timestamp).toDateString()),
      ...posts.flatMap(post => {
        const getUserCommentDates = (comments: Comment[]): string[] => {
          return comments.flatMap(comment => {
            const dates = comment.userId === user.id ? [new Date(comment.timestamp).toDateString()] : []
            if (comment.replies) {
              dates.push(...getUserCommentDates(comment.replies))
            }
            return dates
          })
        }
        return getUserCommentDates(post.comments)
      })
    ])].sort()

    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    const today = new Date().toDateString()
    
    for (let i = activityDates.length - 1; i >= 0; i--) {
      const date = new Date(activityDates[i])
      const prevDate = i > 0 ? new Date(activityDates[i - 1]) : null
      
      if (activityDates[i] === today || 
          (prevDate && Math.abs(date.getTime() - prevDate.getTime()) <= 24 * 60 * 60 * 1000)) {
        tempStreak++
        if (activityDates[i] === today || i === activityDates.length - 1) {
          currentStreak = tempStreak
        }
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        tempStreak = 1
      }
    }

    // Group leadership stats
    const ownedGroups = userGroups.filter(g => {
      const member = Array.isArray(g.members) ? g.members.find(m => m.userId === user.id) : undefined
      return member?.role === 'owner'
    }).length
    const adminGroups = userGroups.filter(g => {
      const member = Array.isArray(g.members) ? g.members.find(m => m.userId === user.id) : undefined
      return member?.role === 'admin'
    }).length

    return {
      totalPosts: userPosts.length,
      totalLikes,
      totalComments,
      totalGroups: userGroups.length,
      likesGiven,
      avgLikesPerPost,
      mostLikedPost,
      mostActiveGroup,
      recentPosts: recentPosts.length,
      weeklyPosts: weeklyPosts.length,
      recentComments,
      joinedDaysAgo: Math.floor((now - user.joinedAt) / (1000 * 60 * 60 * 24)),
      daysSinceFirstPost,
      daysSinceLastPost,
      currentStreak,
      maxStreak,
      ownedGroups,
      adminGroups,
      activityScore: Math.min(100, Math.round(
        (userPosts.length * 2 + totalComments + totalLikes * 0.5 + userGroups.length * 3) / 
        Math.max(1, Math.floor((now - user.joinedAt) / (1000 * 60 * 60 * 24 * 7)))
      ))
    }
  }, [user, posts, groups])

  // Get user's posts sorted by timestamp
  const userPosts = useMemo(() => {
    return posts
      .filter(p => p.userId === user.id)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [posts, user.id])

  // Get user's groups with role information
  const userGroups = useMemo(() => {
    return groups
      .filter(g => Array.isArray(g.members) && g.members.some(m => m.userId === user.id))
      .map(group => ({
        ...group,
        userRole: group.members.find(m => m.userId === user.id)?.role || 'member',
        joinedAt: group.members.find(m => m.userId === user.id)?.joinedAt || 0
      }))
      .sort((a, b) => b.joinedAt - a.joinedAt)
  }, [groups, user.id])

  // Get recent activity timeline
  const recentActivity = useMemo(() => {
    type Activity =
      | { type: 'post'; timestamp: number; data: Post }
      | { type: 'comment'; timestamp: number; data: { comment: Comment; post: Post } }
      | { type: 'group_join'; timestamp: number; data: Group }
    const activities: Activity[] = []

    // Add posts
    userPosts.slice(0, 10).forEach(post => {
      activities.push({
        type: 'post',
        timestamp: post.timestamp,
        data: post
      })
    })

    // Add comments
    posts.forEach(post => {
      const addCommentsFromTree = (comments: Comment[]) => {
        comments.forEach(comment => {
          if (comment.userId === user.id) {
            activities.push({
              type: 'comment',
              timestamp: comment.timestamp,
              data: { comment, post }
            })
          }
          if (comment.replies) {
            addCommentsFromTree(comment.replies)
          }
        })
      }
      addCommentsFromTree(post.comments)
    })

    // Add group joins (using group creation/join dates)
    userGroups.forEach(group => {
      activities.push({
        type: 'group_join',
        timestamp: group.joinedAt,
        data: group
      })
    })

    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
  }, [userPosts, posts, userGroups, user.id])

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isCurrentUser = user.id === currentUser.id
  const isFollowing = currentUser.following?.includes(user.id) || false

  // Get all mentionable users for rendering mentions
  const allMentionableUsers: MentionableUser[] = [
    ...users.map(u => ({ id: u.id, name: u.name, avatar: u.avatar })),
    { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-primary">{user.name}'s Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24 mx-auto md:mx-0">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-2">{user.name}</h1>
                <p className="text-muted-foreground mb-4">{user.bio}</p>
                
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined {formatDate(user.joinedAt)}
                  </div>
                  {userStats.joinedDaysAgo < 30 && (
                    <Badge variant="secondary" className="text-xs">
                      New Member
                    </Badge>
                  )}
                  {userStats.totalPosts >= 50 && (
                    <Badge variant="secondary" className="text-xs">
                      <Trophy className="h-3 w-3 mr-1" />
                      Active Contributor
                    </Badge>
                  )}
                </div>
              </div>

              {!isCurrentUser && (
                <div className="flex gap-2 justify-center md:justify-start">
                  <Button 
                    size="sm" 
                    className="gap-2"
                    variant={isFollowing ? "outline" : "default"}
                    onClick={() => {
                      if (isFollowing) {
                        onUnfollowUser(user.id)
                      } else {
                        onFollowUser(user.id)
                      }
                    }}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-4 w-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <ChatCircle className="h-4 w-4" />
                    Message
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{userStats.totalPosts}</div>
              <div className="text-sm text-muted-foreground">Posts</div>
              {userStats.weeklyPosts > 0 && (
                <div className="text-xs text-accent mt-1">+{userStats.weeklyPosts} this week</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{userStats.totalLikes}</div>
              <div className="text-sm text-muted-foreground">Likes Received</div>
              {userStats.avgLikesPerPost > 0 && (
                <div className="text-xs text-accent mt-1">{userStats.avgLikesPerPost} avg per post</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{(user.following || []).length}</div>
              <div className="text-sm text-muted-foreground">Following</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{(user.followers || []).length}</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{userStats.totalGroups}</div>
              <div className="text-sm text-muted-foreground">Groups</div>
              {userStats.ownedGroups > 0 && (
                <div className="text-xs text-accent mt-1">{userStats.ownedGroups} owned</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity & Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Fire className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold">{userStats.currentStreak}</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                  {userStats.maxStreak > userStats.currentStreak && (
                    <div className="text-xs text-muted-foreground">Best: {userStats.maxStreak} days</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ChartBar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold">{userStats.activityScore}</div>
                  <div className="text-sm text-muted-foreground">Activity Score</div>
                  <div className="text-xs text-muted-foreground">Weekly average</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {userStats.daysSinceLastPost === 0 ? 'Today' : 
                     userStats.daysSinceLastPost === 1 ? 'Yesterday' : 
                     `${userStats.daysSinceLastPost}d ago`}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Active</div>
                  {userStats.likesGiven > 0 && (
                    <div className="text-xs text-muted-foreground">{userStats.likesGiven} likes given</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <ChatCircle className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Achievements & Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements & Recognition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {userStats.joinedDaysAgo < 30 && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      New Member
                    </Badge>
                  )}
                  {userStats.totalPosts >= 10 && (
                    <Badge variant="secondary" className="gap-1">
                      <ChatCircle className="h-3 w-3" />
                      Contributor
                    </Badge>
                  )}
                  {userStats.totalPosts >= 50 && (
                    <Badge variant="secondary" className="gap-1">
                      <Trophy className="h-3 w-3" />
                      Active Contributor
                    </Badge>
                  )}
                  {userStats.totalPosts >= 100 && (
                    <Badge variant="secondary" className="gap-1">
                      <Fire className="h-3 w-3" />
                      Prolific Poster
                    </Badge>
                  )}
                  {userStats.currentStreak >= 7 && (
                    <Badge variant="secondary" className="gap-1">
                      <Fire className="h-3 w-3" />
                      Week Streak
                    </Badge>
                  )}
                  {userStats.currentStreak >= 30 && (
                    <Badge variant="secondary" className="gap-1">
                      <Fire className="h-3 w-3" />
                      Month Streak
                    </Badge>
                  )}
                  {userStats.ownedGroups > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Group Owner
                    </Badge>
                  )}
                  {userStats.adminGroups > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      Group Admin
                    </Badge>
                  )}
                  {userStats.totalLikes >= 100 && (
                    <Badge variant="secondary" className="gap-1">
                      <Heart className="h-3 w-3" />
                      Well Liked
                    </Badge>
                  )}
                  {userStats.avgLikesPerPost >= 5 && (
                    <Badge variant="secondary" className="gap-1">
                      <TrendUp className="h-3 w-3" />
                      Engaging Content
                    </Badge>
                  )}
                </div>
                {userStats.totalPosts === 0 && userStats.totalComments === 0 && userStats.totalGroups === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {isCurrentUser ? "Start posting and engaging to earn achievements!" : `${user.name} is just getting started!`}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendUp className="h-5 w-5" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{userStats.recentPosts}</div>
                    <div className="text-sm text-muted-foreground">Posts (30d)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{userStats.recentComments}</div>
                    <div className="text-sm text-muted-foreground">Comments (30d)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{userStats.currentStreak}</div>
                    <div className="text-sm text-muted-foreground">Current Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{userStats.activityScore}</div>
                    <div className="text-sm text-muted-foreground">Activity Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Most Liked Post */}
            {userStats.mostLikedPost && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Most Popular Post
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm mb-3 leading-relaxed">{userStats.mostLikedPost.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTime(userStats.mostLikedPost.timestamp)}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-red-500" weight="fill" />
                          {(userStats.mostLikedPost?.likes || []).length}
                        </div>
                        <div className="flex items-center gap-1">
                          <ChatCircle className="h-3 w-3" />
                          {(userStats.mostLikedPost?.comments || []).length}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Most Active Group */}
            {userStats.mostActiveGroup && (
              <Card>
                <CardHeader>
                  <CardTitle>Most Active Group</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={userStats.mostActiveGroup.avatar} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {userStats.mostActiveGroup.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{userStats.mostActiveGroup.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {userStats.mostActiveGroup.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {userPosts.filter(p => p.groupId === userStats.mostActiveGroup!.id).length} posts
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewGroupPage(userStats.mostActiveGroup!)}
                    >
                      View Group
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Posts Preview */}
            {userPosts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Posts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userPosts.slice(0, 3).map(post => (
                    <div key={post.id} className="border rounded-lg p-4">
                      <p className="text-sm mb-2 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatTime(post.timestamp)}</span>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {(post.likes || []).length}
                        </div>
                        <div className="flex items-center gap-1">
                          <ChatCircle className="h-3 w-3" />
                          {(post.comments || []).length}
                        </div>
                      </div>
                    </div>
                  ))}
                  {userPosts.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('posts')}
                      className="w-full"
                    >
                      View All Posts ({userPosts.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            {userPosts.length === 0 ? (
               <Card className="p-8 text-center">
                 <ChatCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                 <h3 className="font-semibold mb-2">No Posts Yet</h3>
                 <p className="text-muted-foreground">
                   {isCurrentUser ? "You haven't posted anything yet." : `${user.name} hasn't posted anything yet.`}
                 </p>
               </Card>
             ) : (
              userPosts.map(post => {
                 const postGroup = post.groupId ? groups.find(g => g.id === post.groupId) : null
                return (
                  <Card key={post.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{formatTime(post.timestamp)}</span>
                          {post.editedAt && (
                            <>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">edited</span>
                            </>
                          )}
                          {postGroup && (
                            <>
                              <span className="text-sm text-muted-foreground">•</span>
                              <Badge variant="secondary" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {postGroup.name}
                              </Badge>
                            </>
                          )}
                        </div>
                        {isCurrentUser && onDeletePost && (
                          <AlertDialog>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete post</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete this post? This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-white" onClick={() => { onDeletePost(post.id); toast.success('Post deleted') }}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>

                      <p className="text-sm leading-relaxed mb-4">{post.content}</p>

                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 px-2 gap-2 ${
                            post.likes.includes(currentUser.id)
                              ? 'text-red-500 hover:text-red-600'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => onToggleLike(post.id)}
                        >
                          <Heart
                            className="h-4 w-4"
                            weight={post.likes.includes(currentUser.id) ? 'fill' : 'regular'}
                          />
                          <span className="text-xs">{post.likes.length}</span>
                        </Button>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ChatCircle className="h-4 w-4" />
                          <span className="text-xs">{post.comments.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
               })
             )}
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            {userGroups.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Groups</h3>
                <p className="text-muted-foreground">
                  {isCurrentUser ? "You haven't joined any groups yet." : `${user.name} isn't a member of any groups.`}
                </p>
              </Card>
            ) : (
              userGroups.map(group => (
                <Card key={group.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={group.avatar} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {group.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{group.name}</h3>
                          <Badge variant={group.userRole === 'owner' ? 'default' : 'secondary'}>
                            {group.userRole === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                            {group.userRole}
                          </Badge>
                          {group.privacy === 'private' && (
                            <Badge variant="outline" className="text-xs">Private</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {group.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{(group.members || []).length} members</span>
                          <span>{group.postCount} posts</span>
                          <span>Joined {formatDate(group.joinedAt)}</span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewGroupPage(group)}
                      >
                        View Group
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {recentActivity.length === 0 ? (
              <Card className="p-8 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Activity</h3>
                <p className="text-muted-foreground">
                  {isCurrentUser ? "You haven't been active yet." : `${user.name} hasn't been active yet.`}
                </p>
              </Card>
            ) : (
              <>
                {/* Activity Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ChartBar className="h-5 w-5" />
                      Activity Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{userStats.daysSinceFirstPost || 0}</div>
                        <div className="text-sm text-muted-foreground">Days Since First Post</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{userStats.maxStreak}</div>
                        <div className="text-sm text-muted-foreground">Longest Streak</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{userStats.weeklyPosts}</div>
                        <div className="text-sm text-muted-foreground">Posts This Week</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{userStats.likesGiven}</div>
                        <div className="text-sm text-muted-foreground">Likes Given</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={`${activity.type}-${activity.timestamp}-${index}`} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {activity.type === 'post' && <ChatCircle className="h-4 w-4 text-primary" />}
                            {activity.type === 'comment' && <ChatCircle className="h-4 w-4 text-accent" />}
                            {activity.type === 'group_join' && <Users className="h-4 w-4 text-secondary-foreground" />}
                          </div>
                          {index < recentActivity.length - 1 && (
                            <div className="w-px h-8 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {activity.type === 'post' && 'Created a post'}
                              {activity.type === 'comment' && 'Commented on a post'}
                              {activity.type === 'group_join' && (activity.data as Group).name && `Joined ${(activity.data as Group).name}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(activity.timestamp)}
                            </span>
                            {activity.type === 'post' && (activity.data as Post).likes?.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Heart className="h-2 w-2 mr-1" />
                                {(activity.data as Post).likes.length}
                              </Badge>
                            )}
                            {activity.type === 'post' && (activity.data as Post).comments?.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <ChatCircle className="h-2 w-2 mr-1" />
                                {(activity.data as Post).comments.length}
                              </Badge>
                            )}
                          </div>
                          {activity.type === 'post' && (
                            <div className="bg-muted/50 rounded-lg p-3 mt-2">
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {(activity.data as Post).content}
                              </p>
                            </div>
                          )}
                          {activity.type === 'comment' && (
                            <div className="bg-muted/50 rounded-lg p-3 mt-2">
                              <div className="text-sm text-muted-foreground">
                                <p className="line-clamp-2 mb-2">
                                  {renderContentWithMentions((activity.data as { comment: Comment; post: Post }).comment.content, allMentionableUsers, (user) => {
                                    const fullUser = users.find(u => u.id === user.id) || (user.id === currentUser.id ? currentUser : null)
                                    if (fullUser) {
                                      onViewUserProfile(fullUser)
                                    }
                                  })}
                                </p>
                                <div className="text-xs text-muted-foreground border-t pt-2">
                                  <strong>On post:</strong> {(activity.data as { comment: Comment; post: Post }).post.content.substring(0, 60)}...
                                </div>
                              </div>
                            </div>
                          )}
                          {activity.type === 'group_join' && (
                            <div className="bg-muted/50 rounded-lg p-3 mt-2 flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={(activity.data as Group).avatar} />
                                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                  {(activity.data as Group).name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{(activity.data as Group).name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {(activity.data as Group).description}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewGroupPage(activity.data as Group)}
                                className="text-xs px-2 h-6"
                              >
                                View
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
