import { useState, useEffect } from 'react'
import { MagnifyingGlass, Users, User as UserIcon, X, Sparkle as Sparkles, Hash } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface User {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  joinedAt: number
  following?: string[]
  followers?: string[]
  title?: string
  company?: string
  skills?: string[]
  interestedTopics?: string[]
  karma?: number
}

interface GroupMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: number
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
  topics?: string[]
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  groups: Group[]
  currentUser: User
  onJoinGroup: (groupId: string) => void
  onLeaveGroup: (groupId: string) => void
  onViewGroupPage: (group: Group) => void
  onViewUserProfile?: (user: User) => void
  onFollowUser: (userId: string) => void
  onUnfollowUser: (userId: string) => void
}

export function SearchDialog({
  open,
  onOpenChange,
  users,
  groups,
  currentUser,
  onJoinGroup,
  onLeaveGroup,
  onViewGroupPage,
  onViewUserProfile,
  onFollowUser,
  onUnfollowUser
}: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setActiveTab('all')
    }
  }, [open])

  // Get smart user suggestions when no search query
  const getSuggestedUsers = () => {
    const currentUserTopics = currentUser.interestedTopics || []
    const currentFollowing = currentUser.following || []
    
    // Filter out current user and already followed users
    const availableUsers = users.filter(user => 
      user.id !== currentUser.id && 
      !currentFollowing.includes(user.id)
    )

    // Score users based on compatibility
    const scoredUsers = availableUsers.map(user => {
      let score = 0
      const reasons: string[] = []

      // Topic similarity
      const userTopics = user.interestedTopics || []
      const commonTopics = userTopics.filter(topic => 
        currentUserTopics.some(currentTopic => 
          currentTopic.toLowerCase() === topic.toLowerCase()
        )
      )
      if (commonTopics.length > 0) {
        score += commonTopics.length * 2
        reasons.push(`${commonTopics.length} shared topic${commonTopics.length > 1 ? 's' : ''}`)
      }

      // Professional similarity
      if (user.company && currentUser.company && 
          user.company.toLowerCase() === currentUser.company.toLowerCase()) {
        score += 2
        reasons.push('same company')
      }

      // High karma users
      if (user.karma && user.karma > 500) {
        score += 1
        reasons.push('top contributor')
      }

      return { user, score, reasons }
    })

    return scoredUsers
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  const suggestedUsers = !searchQuery.trim() ? getSuggestedUsers() : []

  // Filter results based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.bio.toLowerCase().includes(query) ||
      (user.title && user.title.toLowerCase().includes(query)) ||
      (user.company && user.company.toLowerCase().includes(query)) ||
      (user.skills && user.skills.some(skill => skill.toLowerCase().includes(query))) ||
      (user.interestedTopics && user.interestedTopics.some(topic => topic.toLowerCase().includes(query)))
    )
  }).filter(user => user.id !== currentUser.id && user.name !== currentUser.name) // Exclude current user (defensive by name too)

  const filteredGroups = groups.filter(group => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      group.name.toLowerCase().includes(query) ||
      group.description.toLowerCase().includes(query) ||
      (group.topics && group.topics.some(topic => topic.toLowerCase().includes(query)))
    )
  })

  const isUserInGroup = (group: Group) => {
    return Array.isArray(group.members) && group.members.some(member => member.userId === currentUser.id)
  }

  const getUserRole = (group: Group) => {
    const member = Array.isArray(group.members) ? group.members.find(m => m.userId === currentUser.id) : undefined
    return member?.role
  }

  const formatMemberCount = (count: number) => {
    return count === 1 ? '1 member' : `${count} members`
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const UserResult = ({ user, suggestion }: { user: User; suggestion?: { reasons: string[] } }) => {
    const isCurrentUser = user.id === currentUser.id || user.name === currentUser.name
    const isFollowing = currentUser.following?.includes(user.id) || false

    return (
      <Card className="mb-3 hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar 
              className="h-12 w-12 cursor-pointer"
              onClick={() => {
                onViewUserProfile?.(user)
                onOpenChange(false)
              }}
            >
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                onViewUserProfile?.(user)
                onOpenChange(false)
              }}
            >
              <h3 className="font-semibold text-sm truncate">{user.name}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{user.email}</span>
                {user.karma && user.karma > 0 && (
                  <>
                    <span>•</span>
                    <span>{user.karma} karma</span>
                  </>
                )}
              </div>
              {user.title && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {user.title}
                  {user.company && ` at ${user.company}`}
                </p>
              )}
              {user.bio && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>
              )}
              
              {/* Show suggestion reasons */}
              {suggestion?.reasons && suggestion.reasons.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {suggestion.reasons.map((reason, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Sparkles className="h-2 w-2 mr-1" />
                      {reason}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Show topics */}
              {user.interestedTopics && user.interestedTopics.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {user.interestedTopics.slice(0, 3).map((topic, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Hash className="h-2 w-2 mr-1" />
                      {topic}
                    </Badge>
                  ))}
                  {user.interestedTopics.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{user.interestedTopics.length - 3}</span>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-4 mt-2">
                <p className="text-xs text-muted-foreground">
                  Joined {formatTime(user.joinedAt)}
                </p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{(user.followers || []).length} followers</span>
                  <span>{(user.following || []).length} following</span>
                </div>
              </div>
            </div>
            {!isCurrentUser && (
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className="text-xs px-3"
                onClick={(e) => {
                  e.stopPropagation()
                  if (isFollowing) {
                    onUnfollowUser(user.id)
                  } else {
                    onFollowUser(user.id)
                  }
                }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const GroupResult = ({ group }: { group: Group }) => (
    <Card className="mb-3 hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={group.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {group.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{group.name}</h3>
              {group.privacy === 'private' && (
                <Badge variant="secondary" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {group.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{formatMemberCount((group.members || []).length)}</span>
              <span>{group.postCount} posts</span>
              <span>Created {formatTime(group.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onViewGroupPage(group)
                onOpenChange(false)
              }}
              className="text-xs h-8"
            >
              View
            </Button>
            {isUserInGroup(group) ? (
              <div className="flex flex-col gap-1">
                {getUserRole(group) === 'owner' ? (
                  <Badge variant="default" className="text-xs justify-center">
                    Owner
                  </Badge>
                ) : getUserRole(group) === 'admin' ? (
                  <Badge variant="secondary" className="text-xs justify-center">
                    Admin
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLeaveGroup(group.id)
                    }}
                    className="text-xs h-7"
                  >
                    Leave
                  </Button>
                )}
              </div>
            ) : group.privacy === 'public' ? (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onJoinGroup(group.id)
                }}
                className="text-xs h-7"
              >
                Join
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs justify-center">
                Private
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const EmptyState = ({ type, query }: { type: string; query: string }) => (
    <div className="text-center py-8">
      <MagnifyingGlass className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-semibold mb-2">
        {query ? `No ${type} found` : `Search for ${type}`}
      </h3>
      <p className="text-muted-foreground text-sm">
        {query 
          ? `No ${type} match your search "${query}"`
          : `Enter a search term to find ${type}`
        }
      </p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MagnifyingGlass className="h-5 w-5" />
            Search Groups & Users
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 min-h-0">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for groups, users, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Results */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All ({filteredUsers.length + filteredGroups.length})
              </TabsTrigger>
              <TabsTrigger value="groups" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Groups ({filteredGroups.length})
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs">
                <UserIcon className="h-3 w-3 mr-1" />
                Users ({filteredUsers.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 mt-4">
              <TabsContent value="all" className="h-full overflow-y-auto space-y-1">
                {!searchQuery.trim() ? (
                  <div className="space-y-6">
                    {/* Suggested Users */}
                    {suggestedUsers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-accent" />
                          Suggested for You
                        </h4>
                        <div className="space-y-1">
                          {suggestedUsers.map(suggestion => (
                            <UserResult 
                              key={suggestion.user.id} 
                              user={suggestion.user}
                              suggestion={suggestion}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* All Users */}
                    {filteredUsers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          All Users
                        </h4>
                        <div className="space-y-1">
                          {filteredUsers.slice(0, 5).map(user => (
                            <UserResult key={user.id} user={user} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* All Groups */}
                    {filteredGroups.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Groups
                        </h4>
                        <div className="space-y-1">
                          {filteredGroups.slice(0, 3).map(group => (
                            <GroupResult key={group.id} group={group} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {filteredUsers.length === 0 && filteredGroups.length === 0 && suggestedUsers.length === 0 && (
                      <EmptyState type="groups and users" query="" />
                    )}
                  </div>
                ) : filteredGroups.length === 0 && filteredUsers.length === 0 ? (
                  <EmptyState type="results" query={searchQuery} />
                ) : (
                  <div className="space-y-4">
                    {filteredGroups.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Groups ({filteredGroups.length})
                        </h4>
                        {filteredGroups.slice(0, 3).map(group => (
                          <GroupResult key={group.id} group={group} />
                        ))}
                        {filteredGroups.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => setActiveTab('groups')}
                          >
                            View all {filteredGroups.length} groups
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {filteredUsers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Users ({filteredUsers.length})
                        </h4>
                        {filteredUsers.slice(0, 3).map(user => (
                          <UserResult key={user.id} user={user} />
                        ))}
                        {filteredUsers.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => setActiveTab('users')}
                          >
                            View all {filteredUsers.length} users
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groups" className="h-full overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <EmptyState type="groups" query={searchQuery} />
                ) : (
                  <div className="space-y-1">
                    {filteredGroups.map(group => (
                      <GroupResult key={group.id} group={group} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="h-full overflow-y-auto">
                {!searchQuery.trim() && suggestedUsers.length > 0 ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                        Suggested for You
                      </h4>
                      <div className="space-y-1">
                        {suggestedUsers.map(suggestion => (
                          <UserResult 
                            key={suggestion.user.id} 
                            user={suggestion.user}
                            suggestion={suggestion}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {filteredUsers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          All Users
                        </h4>
                        <div className="space-y-1">
                          {filteredUsers.map(user => (
                            <UserResult key={user.id} user={user} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <EmptyState type="users" query={searchQuery} />
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map(user => (
                      <UserResult key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}