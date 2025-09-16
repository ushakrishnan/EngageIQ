import { useDataStore } from '@/lib/useDataStore'
import { awardKarmaWithTracking } from '@/lib/karmaHelpers'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import type { DailyProgress } from '@/types'
import { ACHIEVEMENTS, USER_RANKS, calculateKarmaForAction, getUserRank, getNextRank, normalizeAction } from '@/lib/karmaData'
import { checkAchievements } from '@/lib/karmaLogic'

export function useKarmaSystem() {
  const [_dailyProgressAll, setDailyProgressAll] = useDataStore<DailyProgress>('daily-progress', 'daily-progress')
  void _dailyProgressAll
  // access auth context so we can update the current user's karma locally
  const { user: authUser, updateProfile } = useAuth()

  const awardKarma = (userId: string, action: string, description: string, relatedId?: string) => {
    const points = calculateKarmaForAction(action)

    // Protect against gaming: if action is 'followed', ensure we only award once per (userId -> relatedId) per day.
    // Use an in-memory Set for session-scoped deduplication keyed by `${userId}|${relatedId}|${date}`.
    try {
      if (action === 'followed' && relatedId) {
        const today = new Date().toDateString()
        const key = `${userId}|${relatedId}|${today}`
        // store a small session-scoped Set on the function to dedupe follow awards
        type AwardCache = { _recentFollowAwards?: Set<string> }
  const fn = awardKarma as unknown as AwardCache
        if (!fn._recentFollowAwards) fn._recentFollowAwards = new Set<string>()
        const recent = fn._recentFollowAwards
        if (recent.has(key)) {
          // Already awarded for this follow today — skip awarding again to prevent abuse
          return null
        }
        recent.add(key)
      }
    } catch (e) {
      // non-fatal — continue to award if cache access fails
      console.debug('[useKarmaSystem] follow dedupe check failed', e)
    }

    if (points > 0) {
      toast.success(`+${points} karma: ${description}`)

      // Normalize action (accept aliases) and map to daily-progress counters
      const canonical = String(normalizeAction(action))
      const counters: { posts: number; comments: number; likes: number; mentions?: number; follows?: number; groupsJoined?: number } = { posts: 0, comments: 0, likes: 0 }
      switch (canonical) {
        case 'post_created': counters.posts = 1; break
        case 'comment_made': counters.comments = 1; break
        case 'comment_replied': counters.comments = 1; break
        case 'post_liked': counters.likes = 1; break
        case 'comment_liked': counters.likes = 1; break
        case 'post_upvoted': counters.likes = 1; break
        case 'discussion_participation': counters.posts = 1; break
        case 'quality_post': counters.posts = 1; break
        case 'mentioned': counters.mentions = (counters.mentions || 0) + 1; break
        case 'followed': counters.follows = (counters.follows || 0) + 1; break
        case 'group_joined': counters.groupsJoined = (counters.groupsJoined || 0) + 1; break
        // other action types (mentioned, followed, group_joined, etc.) do not increment primary counters
        default: break
      }

      try {
        const today = new Date().toDateString()
        const dpId = `daily-progress-${userId}-${today}`
        setDailyProgressAll(prev => {
          const prevList = prev || []
          const existing = prevList.find((p) => p.id === dpId)
          if (existing) {
              return prevList.map((p) => p.id === dpId ? { 
                ...p, 
                karmaEarned: (p.karmaEarned || 0) + points, 
                posts: (p.posts || 0) + (counters.posts || 0),
                comments: (p.comments || 0) + (counters.comments || 0),
                likes: (p.likes || 0) + (counters.likes || 0),
                mentions: (p.mentions || 0) + (counters.mentions || 0),
                follows: (p.follows || 0) + (counters.follows || 0),
                groupsJoined: (p.groupsJoined || 0) + (counters.groupsJoined || 0),
                updatedAt: Date.now() 
              } : p)
            }
            const newDoc = { id: dpId, userId, date: today, posts: counters.posts || 0, comments: counters.comments || 0, likes: counters.likes || 0, mentions: counters.mentions || 0, follows: counters.follows || 0, groupsJoined: counters.groupsJoined || 0, karmaEarned: points, createdAt: Date.now(), updatedAt: Date.now() }
            return [...prevList, newDoc]
        })
      } catch (e) {
        console.error('[useKarmaSystem] failed to update local daily-progress for karma', e)
      }

      // Optimistically update the authenticated user's karma & karmaHistory so UI updates immediately
      try {
        if (authUser && authUser.id === userId && typeof updateProfile === 'function') {
          const prevKarma = typeof authUser.karma === 'number' ? authUser.karma : 0
          const newKarma = prevKarma + points
          const prevHistory = Array.isArray(authUser.karmaHistory) ? authUser.karmaHistory : []
          const entry = { date: new Date().toISOString(), delta: points, reason: description }
          // call updateProfile but don't await to avoid blocking
          void updateProfile({ karma: newKarma, karmaHistory: [...prevHistory, entry] })
        }
      } catch (e) {
        // non-fatal
        console.debug('[useKarmaSystem] failed to optimistically update auth user karma', e)
      }

      ;(async () => {
        try {
          await awardKarmaWithTracking(userId, points, action, relatedId)
        } catch (err) {
          console.error('[awardKarma] awardKarmaWithTracking failed', err)
        }
      })()

      return {
        type: action as string,
        points,
        description,
        timestamp: Date.now(),
        relatedId
      }
    }

    return null
  }

  // use the shared pure logic implementation
  // (this function is kept in a separate module to allow unit testing)
  // checkAchievements is imported from '@/lib/karmaLogic'

  return {
    awardKarma,
    checkAchievements,
    getUserRank,
    getNextRank,
    ACHIEVEMENTS,
    USER_RANKS
  }
}
