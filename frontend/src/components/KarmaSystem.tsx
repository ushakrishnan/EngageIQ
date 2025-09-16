import type { User } from '@/types/index';
import { useState } from 'react'
import { Trophy, Star, Crown, Gift, Fire, Lightning, Target, Medal, TrendUp as TrendingUp, Heart, ChatCircle, ArrowUp, Users } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { KarmaAction } from '@/lib/karmaTypes'
import { ACHIEVEMENTS, USER_RANKS, getUserRank, getNextRank } from '@/lib/karmaData'

interface KarmaSystemProps {
  userKarma: number
  userAchievements: string[]
  karmaHistory: KarmaAction[]
  users: User[]
  currentUserId: string
}

export function KarmaSystem({ userKarma, userAchievements, karmaHistory, users, currentUserId }: KarmaSystemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentRank = getUserRank(userKarma)
  const nextRank = getNextRank(userKarma)
  
  const unlockedAchievements = ACHIEVEMENTS.filter(achievement => 
    userAchievements.includes(achievement.id)
  )
  
  const lockedAchievements = ACHIEVEMENTS.filter(achievement => 
    !userAchievements.includes(achievement.id)
  )

  // Calculate progress to next rank
  const progressToNextRank = nextRank 
    ? ((userKarma - currentRank.minKarma) / (nextRank.minKarma - currentRank.minKarma)) * 100
    : 100

  const karmaToNextRank = nextRank ? nextRank.minKarma - userKarma : 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Trophy className="h-4 w-4" />
          {userKarma} Karma
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Karma & Achievements
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Current Rank Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <currentRank.icon className={`h-6 w-6 ${currentRank.color}`} />
                  {currentRank.title}
                  <Badge variant="secondary" className="ml-auto">
                    Rank {USER_RANKS.findIndex(r => r.title === currentRank.title) + 1}/{USER_RANKS.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Karma</span>
                  <span className="text-2xl font-bold text-primary">{userKarma.toLocaleString()}</span>
                </div>
                
                {nextRank ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress to {nextRank.title}</span>
                        <span className="font-medium">{karmaToNextRank.toLocaleString()} karma needed</span>
                      </div>
                      <Progress value={progressToNextRank} className="h-3" />
                      <div className="text-xs text-muted-foreground">
                        {Math.round(progressToNextRank)}% complete
                      </div>
                    </div>
                    
                    {/* Next Rank Benefits Preview */}
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <nextRank.icon className={`h-4 w-4 ${nextRank.color}`} />
                        <span className="text-sm font-medium">Next Rank Benefits:</span>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {nextRank.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">You've reached the highest rank!</p>
                    <p className="text-xs text-yellow-600">You are a Platform Legend 🎉</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <span className="text-sm font-medium">Current Rank Benefits:</span>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {currentRank.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Medal className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-lg font-bold">{unlockedAchievements.length}</div>
                  <div className="text-xs text-muted-foreground">Achievements</div>
                  <div className="text-xs text-primary font-medium mt-1">
                    {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}% unlocked
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="text-lg font-bold">
                    #{users.sort((a, b) => (b.karma || 0) - (a.karma || 0)).findIndex(u => u.id === currentUserId) + 1}
                  </div>
                  <div className="text-xs text-muted-foreground">Global Rank</div>
                  <div className="text-xs text-green-600 font-medium mt-1">
                    of {users.filter(u => (u.karma || 0) > 0).length} users
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Fire className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-lg font-bold">
                    {karmaHistory.filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Weekly Actions</div>
                  <div className="text-xs text-orange-600 font-medium mt-1">
                    +{karmaHistory
                      .filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
                      .reduce((sum, h) => sum + Math.max(0, h.points), 0)} karma
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Lightning className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <div className="text-lg font-bold">
                    {karmaHistory.length > 0 
                      ? Math.floor((Date.now() - Math.min(...karmaHistory.map(h => h.timestamp))) / (24 * 60 * 60 * 1000))
                      : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Days Active</div>
                  <div className="text-xs text-yellow-600 font-medium mt-1">
                    {karmaHistory.length} total actions
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Summary */}
            {karmaHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {/* Best day */}
                    {(() => {
                      const dailyKarma: { [date: string]: number } = {}
                      karmaHistory.forEach(action => {
                        const date = new Date(action.timestamp).toDateString()
                        dailyKarma[date] = (dailyKarma[date] || 0) + Math.max(0, action.points)
                      })
                      const bestDay = Object.entries(dailyKarma).sort((a, b) => b[1] - a[1])[0]
                      
                      if (bestDay && bestDay[1] > 0) {
                        return (
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Best day</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-600">+{bestDay[1]} karma</div>
                              <div className="text-xs text-green-600">{new Date(bestDay[0]).toLocaleDateString()}</div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                    
                    {/* Most recent achievement */}
                    {unlockedAchievements.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Medal className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Latest achievement</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">{unlockedAchievements[unlockedAchievements.length - 1]?.name}</div>
                          <div className="text-xs text-blue-600">+{unlockedAchievements[unlockedAchievements.length - 1]?.karmaReward} karma</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Current streak */}
                    {(() => {
                      const recentActions = karmaHistory.filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
                      if (recentActions.length > 5) {
                        return (
                          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2">
                              <Fire className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium">Weekly streak</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-purple-600">{recentActions.length} actions</div>
                              <div className="text-xs text-purple-600">Keep it up! 🔥</div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-4">
            {/* Achievement Summary */}
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{unlockedAchievements.length}</div>
                  <div className="text-sm text-muted-foreground">Unlocked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">{lockedAchievements.length}</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {unlockedAchievements.reduce((sum, a) => sum + a.karmaReward, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Karma Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Complete</div>
                </div>
              </div>
            </Card>

            {/* Achievement Categories */}
            <Tabs defaultValue="unlocked" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unlocked">Unlocked ({unlockedAchievements.length})</TabsTrigger>
                <TabsTrigger value="available">Available ({lockedAchievements.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="unlocked" className="space-y-4">
                {unlockedAchievements.length === 0 ? (
                  <Card className="p-6 text-center">
                    <Gift className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Start participating to unlock achievements!</p>
                  </Card>
                ) : (
                  <>
                    {/* Group by category */}
                    {['milestone', 'engagement', 'content', 'community', 'special'].map(category => {
                      const categoryAchievements = unlockedAchievements.filter(a => a.category === category)
                      if (categoryAchievements.length === 0) return null
                      
                      return (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                            {category} ({categoryAchievements.length})
                          </h4>
                          <div className="grid gap-2">
                            {categoryAchievements
                              .sort((a, b) => (b.karmaReward || 0) - (a.karmaReward || 0))
                              .map(achievement => (
                                <Card key={achievement.id} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${
                                      achievement.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-600' :
                                      achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-600' :
                                      achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-600' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      <achievement.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm">{achievement.name}</h4>
                                        <Badge variant={
                                          achievement.rarity === 'legendary' ? 'default' :
                                          achievement.rarity === 'epic' ? 'secondary' :
                                          achievement.rarity === 'rare' ? 'outline' : 'secondary'
                                        } className={`text-xs ${
                                          achievement.rarity === 'legendary' ? 'bg-yellow-500 text-white' :
                                          achievement.rarity === 'epic' ? 'bg-purple-500 text-white' :
                                          achievement.rarity === 'rare' ? 'border-blue-500 text-blue-600' :
                                          ''
                                        }`}>
                                          {achievement.rarity}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-green-600">+{achievement.karmaReward}</div>
                                      <div className="text-xs text-muted-foreground">karma</div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="available" className="space-y-4">
                {/* Group by category */}
                {['milestone', 'engagement', 'content', 'community', 'special'].map(category => {
                  const categoryAchievements = lockedAchievements.filter(a => a.category === category)
                  if (categoryAchievements.length === 0) return null
                  
                  return (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        {category} ({categoryAchievements.length})
                      </h4>
                      <div className="grid gap-2">
                        {categoryAchievements
                          .sort((a, b) => (b.karmaReward || 0) - (a.karmaReward || 0))
                          .map(achievement => (
                            <Card key={achievement.id} className="p-3 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-gray-100 text-gray-400">
                                  <achievement.icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm text-muted-foreground">{achievement.name}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      {achievement.rarity}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                                    Goal: {achievement.condition}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-muted-foreground">+{achievement.karmaReward}</div>
                                  <div className="text-xs text-muted-foreground">karma</div>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="leaderboard" className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold">Top Contributors</h3>
              <div className="space-y-2">
                {users
                  .filter(u => u.karma && u.karma > 0)
                  .sort((a, b) => (b.karma || 0) - (a.karma || 0))
                  .slice(0, 20)
                  .map((user, index) => {
                    const rank = getUserRank(user.karma || 0)
                    const isCurrentUser = user.id === currentUserId
                    
                    return (
                      <Card key={user.id} className={`p-3 ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`text-sm font-bold w-6 text-center ${
                              index === 0 ? 'text-yellow-500' :
                              index === 1 ? 'text-gray-400' :
                              index === 2 ? 'text-orange-600' :
                              'text-muted-foreground'
                            }`}>
                              #{index + 1}
                            </span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="text-xs">
                                {user.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${isCurrentUser ? 'text-primary' : ''}`}>
                                  {user.name}
                                </span>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <rank.icon className={`h-3 w-3 ${rank.color}`} />
                                <span className="text-xs text-muted-foreground">{rank.title}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-primary">
                              {(user.karma || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">karma</div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Karma Activity History</h3>
                <div className="text-sm text-muted-foreground">
                  Total: {karmaHistory.reduce((sum, action) => sum + action.points, 0).toLocaleString()} karma
                </div>
              </div>
              
              {karmaHistory.length === 0 ? (
                <Card className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No karma activity yet. Start participating!</p>
                </Card>
              ) : (
                <>
                  {/* Weekly Summary */}
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">This Week's Activity</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          +{karmaHistory
                            .filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
                            .reduce((sum, h) => sum + Math.max(0, h.points), 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Karma Gained</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-primary">
                          {karmaHistory.filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Actions</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-500">
                          {karmaHistory
                            .filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
                            .filter(h => ['post_created', 'comment_made'].includes(h.type)).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Posts & Comments</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-500">
                          {karmaHistory
                            .filter(h => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
                            .filter(h => ['post_liked', 'post_upvoted'].includes(h.type)).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Interactions</div>
                      </div>
                    </div>
                  </Card>

                  {/* Activity Timeline */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Recent Activity</h4>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {karmaHistory
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, 100)
                        .map((action, index) => (
                          <Card key={index} className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-full ${getActionColor(action.type)}`}>
                                  {getActionIcon(action.type)}
                                </div>
                                <div>
                                  <span className="text-sm font-medium">{action.description}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimeDetailed(action.timestamp)}
                                    </span>
                                    {action.relatedId && (
                                      <Badge variant="outline" className="text-xs h-4">
                                        ID: {action.relatedId.slice(-4)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-sm font-bold ${
                                  action.points > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {action.points > 0 ? '+' : ''}{action.points}
                                </span>
                                <div className="text-xs text-muted-foreground">karma</div>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                    
                    {karmaHistory.length > 100 && (
                      <div className="text-center py-2">
                        <span className="text-xs text-muted-foreground">
                          Showing latest 100 activities • Total: {karmaHistory.length} activities
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Helpers for rendering activity icons/colors and formatting time — hoisted to avoid redeclaration inside the map
const getActionIcon = (type: string) => {
  switch (type) {
    case 'post_created': return <Medal className="h-3 w-3" />
    case 'post_liked': return <Heart className="h-3 w-3" />
    case 'post_upvoted': return <ArrowUp className="h-3 w-3" />
    case 'comment_made': return <ChatCircle className="h-3 w-3" />
    case 'comment_replied': return <Lightning className="h-3 w-3" />
    case 'followed': return <Users className="h-3 w-3" />
    case 'streak_bonus': return <Fire className="h-3 w-3" />
    case 'quality_post': return <Star className="h-3 w-3" />
    case 'discussion_participation': return <Target className="h-3 w-3" />
    default: return <TrendingUp className="h-3 w-3" />
  }
}

const getActionColor = (type: string) => {
  switch (type) {
    case 'post_created': return 'text-blue-600 bg-blue-100'
    case 'post_liked': return 'text-red-600 bg-red-100'
    case 'post_upvoted': return 'text-orange-600 bg-orange-100'
    case 'comment_made': return 'text-green-600 bg-green-100'
    case 'comment_replied': return 'text-purple-600 bg-purple-100'
    case 'followed': return 'text-indigo-600 bg-indigo-100'
    case 'streak_bonus': return 'text-yellow-600 bg-yellow-100'
    case 'quality_post': return 'text-pink-600 bg-pink-100'
    case 'discussion_participation': return 'text-teal-600 bg-teal-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

const formatTimeDetailed = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const date = new Date(timestamp)
  
  if (diff < 60 * 1000) return 'Just now'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`
  
  return date.toLocaleDateString()
}