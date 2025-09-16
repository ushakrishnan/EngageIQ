import { useState, useEffect, useCallback, useMemo } from 'react'
import { Fire, Target, Trophy, Lightning, Info } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useDataStore } from '@/lib/useDataStore'
import type { DailyProgress } from '@/types'

interface DailyEngagementWidgetProps {
  userId: string
  userName: string
  onCreatePost: () => void
}

export function DailyEngagementWidget({ userId, userName, onCreatePost }: DailyEngagementWidgetProps) {
  const [dailyProgressAll, setDailyProgressAll] = useDataStore<DailyProgress>('daily-progress', 'daily-progress')
  const dailyProgress = ((dailyProgressAll || []) as DailyProgress[]).filter(d => d.userId === userId)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const today = new Date().toDateString()
  const todayProgress: DailyProgress = useMemo(() => {
    const found = (dailyProgress || []).find(p => p.date === today) as DailyProgress | undefined
    if (found) return found
    return {
      id: `daily-progress-${userId}-${today}`,
      userId: userId,
      date: today,
      posts: 0,
      comments: 0,
      likes: 0,
      mentions: 0,
      follows: 0,
      groupsJoined: 0,
      karmaEarned: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as DailyProgress
  }, [dailyProgress, today, userId])

  // Daily goals
  const goals = {
    posts: 1,
    comments: 3,
    likes: 5,
    karmaEarned: 10
  }
  
  // Add goals for new counters
  const extendedGoals = {
    ...goals,
    mentions: 1,
    follows: 1,
    groupsJoined: 1
  }

  const updateDailyProgress = useCallback((activity: keyof Omit<DailyProgress, 'date'>, increment: number = 1) => {
    setDailyProgressAll(current => {
      const cs = current || []
      const userEntries = cs.filter(p => p.userId === userId)
      const existing = userEntries.find(p => p.date === today)

      if (existing) {
        return cs.map(p => {
          if (p.userId === userId && p.date === today) {
            const updated = { ...p } as DailyProgress
            switch (activity) {
              case 'posts': updated.posts = (updated.posts || 0) + increment; break
              case 'comments': updated.comments = (updated.comments || 0) + increment; break
              case 'likes': updated.likes = (updated.likes || 0) + increment; break
              case 'karmaEarned': updated.karmaEarned = (updated.karmaEarned || 0) + increment; break
              case 'mentions': updated.mentions = (updated.mentions || 0) + increment; break
              case 'follows': updated.follows = (updated.follows || 0) + increment; break
              case 'groupsJoined': updated.groupsJoined = (updated.groupsJoined || 0) + increment; break
              default: break
            }
            return updated
          }
          return p
        })
      } else {
        const id = `daily-progress-${userId}-${today}`
        const now = Date.now()
        const newProgress: DailyProgress & { id: string; userId: string } = { ...todayProgress, [activity]: increment, id, userId, createdAt: now, updatedAt: now }
        return [...cs, newProgress]
      }
    })
  }, [userId, today, setDailyProgressAll, todayProgress])

  // Calculate completion percentage
  // Recompute completion percentage including extended goals
  const completionPercentage = Math.round(
    (Object.keys(extendedGoals) as Array<keyof typeof extendedGoals>).reduce((sum, key) => {
      const progress = Math.min(getCounter(todayProgress, key) / extendedGoals[key], 1)
      return sum + progress
    }, 0) / Object.keys(extendedGoals).length * 100
  )

  const isGoalComplete = (activity: keyof typeof goals) => getCounter(todayProgress, activity as keyof typeof extendedGoals) >= goals[activity]
  const allGoalsComplete = Object.keys(goals).every(key => isGoalComplete(key as keyof typeof goals))
  
  // Streak calculation
  const getStreak = () => {
    let streak = 0
    const sortedProgress = [...dailyProgress].sort((a: DailyProgress, b: DailyProgress) => new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime())
    
    for (const progress of sortedProgress) {
      const progressGoals = {
        posts: progress.posts >= goals.posts,
        comments: progress.comments >= goals.comments,
        likes: progress.likes >= goals.likes,
        karmaEarned: progress.karmaEarned >= goals.karmaEarned
      }
      
      const completedGoals = Object.values(progressGoals).filter(Boolean).length
      if (completedGoals >= 3) { // At least 3 goals met
        streak++
      } else {
        break
      }
    }
    
    return streak
  }

  const currentStreak = getStreak()

  // Expose update function globally (would be better with proper state management)
  useEffect(() => {
    ;(window as unknown as { updateDailyProgress?: typeof updateDailyProgress }).updateDailyProgress = updateDailyProgress
  }, [updateDailyProgress])

  // Modal state for viewing recent history of a counter
  const [modalOpen, setModalOpen] = useState(false)
  const [modalActivity, setModalActivity] = useState<keyof typeof extendedGoals | null>(null)

  const openModal = (activity: keyof typeof extendedGoals) => {
    setModalActivity(activity)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalActivity(null)
    setModalOpen(false)
  }

  // helper to safely read numeric counters from DailyProgress
  function getCounter(progress: DailyProgress, key: keyof typeof extendedGoals): number {
    const v = (progress as unknown as Record<string, number | undefined>)[key]
    return typeof v === 'number' ? v : 0
  }

  return (
    <Card className={`mb-4 ${allGoalsComplete ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Daily Goals
            {allGoalsComplete && (
              <Badge className="bg-green-500 text-white gap-1">
                <Trophy className="h-3 w-3" />
                Complete!
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Fire className="h-4 w-4 text-orange-500" />
                <span className="text-orange-500 font-medium">{currentStreak}</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Toggle details</span>
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          
          {isExpanded && (
            <div className="space-y-3 pt-2 border-t">
              {/* Individual goals */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Posts" value={todayProgress.posts} goal={goals.posts} onDetails={() => openModal('posts')} />
                <StatCard label="Comments" value={todayProgress.comments} goal={goals.comments} onDetails={() => openModal('comments')} />
                <StatCard label="Likes" value={todayProgress.likes} goal={goals.likes} onDetails={() => openModal('likes')} />
                <StatCard label="Mentions" value={getCounter(todayProgress, 'mentions' as keyof typeof extendedGoals)} goal={extendedGoals.mentions} onDetails={() => openModal('mentions' as keyof typeof extendedGoals)} />
                <StatCard label="Follows" value={getCounter(todayProgress, 'follows' as keyof typeof extendedGoals)} goal={extendedGoals.follows} onDetails={() => openModal('follows' as keyof typeof extendedGoals)} />
                <StatCard label="Groups Joined" value={getCounter(todayProgress, 'groupsJoined' as keyof typeof extendedGoals)} goal={extendedGoals.groupsJoined} onDetails={() => openModal('groupsJoined' as keyof typeof extendedGoals)} />
              </div>
              
              <div className={`flex items-center justify-between p-2 rounded-lg ${
                isGoalComplete('karmaEarned') ? 'bg-green-100 text-green-800' : 'bg-muted'
              }`}>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">Karma Earned</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{todayProgress.karmaEarned}/{goals.karmaEarned}</span>
                  {isGoalComplete('karmaEarned') && <Lightning className="h-3 w-3" />}
                </div>
              </div>

              {/* Quick actions for incomplete goals */}
              {!allGoalsComplete && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                  <div className="flex gap-2 flex-wrap">
                    {!isGoalComplete('posts') && (
                      <Button size="sm" variant="outline" onClick={onCreatePost} className="text-xs">
                        Create Post
                      </Button>
                    )}
                    {!isGoalComplete('comments') && (
                      <Badge variant="outline" className="text-xs">
                        Comment on posts below
                      </Badge>
                    )}
                    {!isGoalComplete('likes') && (
                      <Badge variant="outline" className="text-xs">
                        Like posts you enjoy
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {allGoalsComplete && (
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <Trophy className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Great job, {userName}!</p>
                  <p className="text-xs text-green-600">You've completed all daily goals!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Details modal for selected activity */}
      <Dialog open={modalOpen} onOpenChange={(val: boolean) => { if (!val) closeModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalActivity ? `${String(modalActivity)} — recent activity` : 'Activity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {modalActivity && (
              <div>
                <ul className="text-sm space-y-1">
                  {(() => {
                    // Show last 7 days for the selected activity
                    const last7: { date: string, value: number }[] = []
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date()
                      d.setDate(d.getDate() - i)
                      const dateStr = d.toDateString()
                      const entry = dailyProgress.find(p => p.date === dateStr)
                      const value = entry ? getCounter(entry, modalActivity as keyof typeof extendedGoals) : 0
                      last7.push({ date: dateStr, value })
                    }
                    return last7.map((row) => (
                      <li key={row.date} className="flex justify-between">
                        <span className="text-xs text-muted-foreground">{new Date(row.date).toLocaleDateString()}</span>
                        <span className="font-medium">{row.value}</span>
                      </li>
                    ))
                  })()}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
   )
 }

function StatCard({ label, value, goal, onDetails }: { label: string, value: number, goal: number, onDetails: () => void }) {
  const isComplete = value >= goal
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${
      isComplete ? 'bg-green-100 text-green-800' : 'bg-muted'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{value}/{goal}</span>
        {isComplete && <Lightning className="h-3 w-3" />}
        <Button size="sm" variant="ghost" onClick={onDetails} className="h-6 w-6 p-0" aria-label={`Details for ${label}`}>
          <span className="sr-only">Details</span>
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}