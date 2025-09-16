import { Users, Lock, Globe, Crown, Shield, User, Hash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
// ...existing code...

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
  category: 'professional' | 'social' | 'technical' | 'creative' | 'gaming' | 'news'
  topics: string[]
}

interface GroupCardProps {
  group: Group
  onJoinGroup: (groupId: string) => void
  onLeaveGroup: (groupId: string) => void
  onViewGroup: (group: Group) => void
  onViewGroupPage: (group: Group) => void
}

export function GroupCard({ group, onJoinGroup, onLeaveGroup, onViewGroup, onViewGroupPage }: GroupCardProps) {
  // const { user } = useAuth() // Not defined
  
  // User context unavailable; skip user checks

  const userMember = Array.isArray(group.members) ? group.members[0] : undefined
  const isMember = !!userMember
  const isOwner = userMember?.role === 'owner'
  // ...existing code...

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-500" />
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />
      default:
        return <User className="h-3 w-3 text-muted-foreground" />
    }
  }

  const formatMemberCount = (count: number) => {
    if (count === 1) return '1 member'
    return `${count} members`
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'professional':
        return 'border-blue-200 text-blue-700'
      case 'technical':
        return 'border-purple-200 text-purple-700'
      case 'creative':
        return 'border-pink-200 text-pink-700'
      case 'gaming':
        return 'border-green-200 text-green-700'
      case 'news':
        return 'border-orange-200 text-orange-700'
      default:
        return 'border-gray-200 text-gray-700'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewGroupPage(group)}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={group.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {group.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{group.name}</h3>
              {group.privacy === 'private' ? (
                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <Badge variant="outline" className={`text-xs ${getCategoryColor(group.category)}`}>
                {group.category}
              </Badge>
              {isMember && (
                <Badge variant="secondary" className="text-xs">
                  {getRoleIcon(userMember.role)}
                  <span className="ml-1 capitalize">{userMember.role}</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {group.description || 'No description'}
            </p>
            
            {/* Topics */}
            {Array.isArray(group.topics) && group.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {group.topics.slice(0, 3).map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs gap-1">
                    <Hash className="h-2 w-2" />
                    {topic}
                  </Badge>
                ))}
                {group.topics.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{group.topics.length - 3}</span>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatMemberCount((group.members || []).length)}
              </span>
              <span>{group.postCount ?? 0} posts</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Created {new Date(group.createdAt).toLocaleDateString()}
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {isMember ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewGroup(group)}
                  className="text-xs h-7"
                >
                  Settings
                </Button>
                {!isOwner && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onLeaveGroup(group.id)}
                    className="text-xs h-7"
                  >
                    Leave
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => onJoinGroup(group.id)}
                className="text-xs h-7"
                disabled={group.privacy === 'private'}
              >
                {group.privacy === 'private' ? 'Private' : 'Join'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}