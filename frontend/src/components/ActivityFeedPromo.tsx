import { UserPlus, Clock, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface User {
  id: string
  name: string
  avatar: string
  followers?: string[]
  following?: string[]
}

interface ActivityFeedPromoProps {
  currentUser: User
  users: User[]
  onFollowUser: (userId: string) => void
  onSwitchToFollowing: () => void
  onOpenSearch: () => void
}

export function ActivityFeedPromo({
  currentUser,
  users,
  onFollowUser,
  onSwitchToFollowing,
  onOpenSearch
}: ActivityFeedPromoProps) {
  const currentFollowing = currentUser.following || []
  
  // Don't show if user already follows people
  if (currentFollowing.length > 0) {
    return null
  }
  
  // Get top users by follower count
  const topUsers = users
    .filter(user => user.id !== currentUser.id)
    .sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0))
    .slice(0, 3)
  
  if (topUsers.length === 0) {
    return null
  }
  
  return (
    <Card className="mb-4 border-accent/20 bg-gradient-to-r from-accent/5 to-accent/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Create Your Personal Activity Feed
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Follow people to see their posts in a personalized activity feed, just like your favorite social platforms.
            </p>
            
            {/* Quick follow suggestions */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Quick follows:</span>
              {topUsers.map(user => (
                <Button
                  key={user.id}
                  size="sm"
                  variant="outline"
                  onClick={() => onFollowUser(user.id)}
                  className="h-7 px-2 gap-1 text-xs"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs bg-secondary">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {user.name.split(' ')[0]}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onOpenSearch}
                className="gap-1 h-7 text-xs"
              >
                <UserPlus className="h-3 w-3" />
                Find People
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSwitchToFollowing}
                className="gap-1 h-7 text-xs"
              >
                <ArrowRight className="h-3 w-3" />
                View Activity Feed
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}