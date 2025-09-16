import { Trophy, Crown, Medal, Star } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getUserRank } from '@/lib/karmaData'

interface User {
  id: string
  name: string
  avatar: string
  karma: number
}

interface LeaderboardWidgetProps {
  users: User[]
  currentUserId: string
  onViewUserProfile: (user: User) => void
}

export function LeaderboardWidget({ users, currentUserId, onViewUserProfile }: LeaderboardWidgetProps) {
  const topUsers = users
    .filter(u => u.karma && u.karma > 0)
    .sort((a, b) => (b.karma || 0) - (a.karma || 0))
    .slice(0, 5)

  if (topUsers.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Top Contributors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topUsers.map((user, index) => {
          const rank = getUserRank(user.karma || 0)
          const isCurrentUser = user.id === currentUserId
          
          return (
            <div 
              key={user.id} 
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                isCurrentUser ? 'bg-primary/10 border border-primary/20' : ''
              }`}
              onClick={() => onViewUserProfile(user)}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`text-xs font-bold w-4 text-center ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-orange-600' :
                  'text-muted-foreground'
                }`}>
                  {index === 0 ? <Crown className="h-3 w-3" /> :
                   index === 1 ? <Medal className="h-3 w-3" /> :
                   index === 2 ? <Star className="h-3 w-3" /> :
                   `#${index + 1}`}
                </span>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className={`font-medium text-xs truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                      {user.name}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs px-1 py-0">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <rank.icon className={`h-2 w-2 ${rank.color}`} />
                    <span className="text-xs text-muted-foreground">{rank.title}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-primary">
                  {(user.karma || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}