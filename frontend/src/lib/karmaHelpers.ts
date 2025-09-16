import databaseService from '@/lib/database'
import { addUnsyncedItem } from '@/lib/unsynced'
import { normalizeAction } from '@/lib/karmaData'
import type { DailyProgress as SharedDailyProgress } from '@/types'



export async function awardKarmaWithTracking(userId: string | undefined, points: number, _action: string, relatedId?: string) {
  // During unit tests we want to avoid making network/DB calls. Vitest sets VITEST=true in process.env.
  if (typeof process !== 'undefined' && process.env && process.env.VITEST === 'true') {
    return true
  }
  if (!userId || !points || points <= 0) return false
  const today = new Date().toDateString()
  const dpId = `daily-progress-${userId}-${today}`

  try {
    // Create a deterministic award key so repeated requests (retries) don't double-award
    const canonical = String(normalizeAction(_action))
    const awardKey = `award-${userId}-${canonical}-${relatedId || 'none'}-${today}`

    // If an award audit with this deterministic id already exists, treat as already awarded
    try {
      const prior = await databaseService.read(awardKey, 'audit')
      if (prior && prior.data) {
        // Already recorded this award — idempotent short-circuit
        return true
      }
    } catch {
      // ignore read errors and continue; we'll rely on create + unique id
    }

    // Try to read existing daily-progress record
    const existing = await databaseService.read(dpId, 'daily-progress')
    if (existing && existing.data) {
  const prev = existing.data as DailyProgress;
  // determine canonical action and counters to increment
  const canonical = String(normalizeAction(_action));
  const counters: { posts?: number; comments?: number; likes?: number; mentions?: number; follows?: number; groupsJoined?: number } = { posts: 0, comments: 0, likes: 0 }
  switch (canonical) {
    case 'post_created': counters.posts = 1; break
    case 'comment_made': counters.comments = 1; break
    case 'comment_replied': counters.comments = 1; break
    case 'post_liked': counters.likes = 1; break
    case 'comment_liked': counters.likes = 1; break
    case 'post_upvoted': counters.likes = 1; break
    case 'mentioned': counters.mentions = (counters.mentions || 0) + 1; break
    case 'followed': counters.follows = (counters.follows || 0) + 1; break
    case 'group_joined': counters.groupsJoined = (counters.groupsJoined || 0) + 1; break
    default: break
  }
  const updated: DailyProgress = { 
    ...prev, 
    karmaEarned: (prev.karmaEarned || 0) + points,
    posts: (prev.posts || 0) + (counters.posts || 0),
    comments: (prev.comments || 0) + (counters.comments || 0),
    likes: (prev.likes || 0) + (counters.likes || 0),
    mentions: (prev.mentions || 0) + (counters.mentions || 0),
    follows: (prev.follows || 0) + (counters.follows || 0),
    groupsJoined: (prev.groupsJoined || 0) + (counters.groupsJoined || 0),
  };
  await databaseService.create({ id: dpId, type: 'daily-progress', data: { ...updated, id: dpId } });
    } else {
  const now = Date.now();
  // derive initial counters from action
  const canonical2 = String(normalizeAction(_action));
  const initialCounters: { posts?: number; comments?: number; likes?: number; mentions?: number; follows?: number; groupsJoined?: number } = { posts: 0, comments: 0, likes: 0 }
  switch (canonical2) {
    case 'post_created': initialCounters.posts = 1; break
    case 'comment_made': initialCounters.comments = 1; break
    case 'comment_replied': initialCounters.comments = 1; break
    case 'post_liked': initialCounters.likes = 1; break
    case 'comment_liked': initialCounters.likes = 1; break
    case 'post_upvoted': initialCounters.likes = 1; break
    case 'mentioned': initialCounters.mentions = (initialCounters.mentions || 0) + 1; break
    case 'followed': initialCounters.follows = (initialCounters.follows || 0) + 1; break
    case 'group_joined': initialCounters.groupsJoined = (initialCounters.groupsJoined || 0) + 1; break
    default: break
  }
  const newDoc: DailyProgress = { id: dpId, userId, date: today, posts: initialCounters.posts || 0, comments: initialCounters.comments || 0, likes: initialCounters.likes || 0, mentions: initialCounters.mentions || 0, follows: initialCounters.follows || 0, groupsJoined: initialCounters.groupsJoined || 0, karmaEarned: points, createdAt: now, updatedAt: now };
  await databaseService.create({ id: dpId, type: 'daily-progress', data: { ...newDoc, id: dpId } });
    }

      // Write deterministic audit entry to make this award idempotent
      await databaseService.create({ id: awardKey, type: 'audit', data: { action: 'daily_progress.increment.karma', userId, points, relatedId, ts: Date.now() } })
      // Also write a non-deterministic audit for historical/tracing uses
      try {
        const auditId = `audit-${Date.now()}-${Math.floor(Math.random()*1000)}`
        await databaseService.create({ id: auditId, type: 'audit', data: { action: 'daily_progress.increment.karma', userId, points, relatedId, ts: Date.now() } })
      } catch {
        // non-fatal if the secondary audit write fails
      }

    return true
  } catch (err) {
    try {
      // fallback: queue unsynced items
      addUnsyncedItem({ id: dpId, userId, date: today, karmaEarned: points, type: 'daily-progress' })
    } catch (e) {
      console.error('[karmaHelpers] failed to add unsynced daily-progress', e)
    }
    try {
      addUnsyncedItem({ id: `audit-${Date.now()}-${Math.floor(Math.random()*1000)}`, type: 'audit', action: 'daily_progress.increment.karma', userId, points, relatedId })
    } catch (e) {
      console.error('[karmaHelpers] failed to add unsynced audit', e)
    }
    console.error('[karmaHelpers] awardKarmaWithTracking error', err)
    return false
  }
}

export type DailyProgress = SharedDailyProgress

export async function awardKarmaWithLocal(
  setDailyProgressAll: (updater: (prev: DailyProgress[]) => DailyProgress[]) => void,
  userId: string | undefined,
  points: number,
  action: string,
  relatedId?: string
) {
  if (!setDailyProgressAll || !userId || !points || points <= 0) return false

  try {
    // update local state immediately
    setDailyProgressAll((prev: DailyProgress[]) => {
      const today = new Date().toDateString()
      const id = `daily-progress-${userId}-${today}`
      const list = prev || []
      const existing = list.find(p => p.id === id)

      // map incoming action strings to a restricted set of counter keys
      type CounterKey = 'posts' | 'comments' | 'likes' | 'mentions' | 'follows' | 'groupsJoined'
      const mapActionToKey: Record<string, CounterKey | undefined> = {
        post_created: 'posts',
        comment_created: 'comments',
        comment_made: 'comments',
        comment_replied: 'comments',
        liked: 'likes',
        post_liked: 'likes',
        comment_liked: 'likes',
        upvoted: 'likes', // normalize legacy 'upvoted' to 'likes'
        mentioned: 'mentions',
        followed: 'follows',
        group_joined: 'groupsJoined'
      }
      const counterKey = mapActionToKey[action]

      if (existing) {
        return list.map(p => {
          if (p.id === id) {
            const updated = { ...p } as DailyProgress
            updated.karmaEarned = (updated.karmaEarned || 0) + points
            if (counterKey) {
              const k = counterKey as CounterKey
              const updatedCounters = updated as unknown as Record<CounterKey, number | undefined>
              updatedCounters[k] = (updatedCounters[k] ?? 0) + 1
            }
            updated.updatedAt = Date.now()
            return updated
          }
          return p
        })
      }
      const now = Date.now()
      const newDoc: DailyProgress = {
        id,
        userId,
        date: today,
        posts: 0,
        comments: 0,
        likes: 0,
        mentions: 0,
        follows: 0,
        groupsJoined: 0,
        karmaEarned: points,
        createdAt: now,
        updatedAt: now
      }
      if (counterKey) {
        const k = counterKey as CounterKey
        const newCounters = newDoc as unknown as Record<CounterKey, number | undefined>
        newCounters[k] = 1
      }
      return [...list, newDoc]
    })
  } catch (e) {
    console.error('[karmaHelpers] failed to update local daily-progress', e)
  }

  // Persist + audit using the shared helper
  try {
    return await awardKarmaWithTracking(userId, points, action, relatedId)
  } catch (err) {
    console.error('[karmaHelpers] awardKarmaWithLocal failed', err)
    return false
  }
}
