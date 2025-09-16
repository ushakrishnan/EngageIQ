import { describe, it, expect, vi } from 'vitest'
import * as karmaHelpers from '@/lib/karmaHelpers'
import type { DailyProgress } from '@/types'

describe('daily progress updates', () => {
  it('creates new daily-progress when none exist and increments posts & karma', async () => {
    let store: DailyProgress[] = []
    const mockSet = vi.fn((updater: (prev: DailyProgress[]) => DailyProgress[]) => { store = updater(store) })

    // Stub awardKarmaWithTracking to avoid side effects
    const trackingSpy = vi.spyOn(karmaHelpers, 'awardKarmaWithTracking').mockResolvedValue(true)

    const result = await karmaHelpers.awardKarmaWithLocal(mockSet as unknown as (updater: (prev: DailyProgress[]) => DailyProgress[]) => void, 'user-1', 5, 'post_created', 'rel-1')
    expect(result).toBe(true)
    expect(mockSet).toHaveBeenCalled()

    expect(store.length).toBe(1)
    const doc = store[0]
    expect(doc.userId).toBe('user-1')
    expect(doc.posts).toBe(1)
    expect(doc.karmaEarned).toBe(5)

    trackingSpy.mockRestore()
  })

  it('updates existing daily-progress and increments mentions/follows/groupsJoined', async () => {
    const today = new Date().toDateString()
    let store: DailyProgress[] = [{ id: `daily-progress-user-2-${today}`, userId: 'user-2', date: today, posts: 0, comments: 0, likes: 0, mentions: 0, follows: 0, groupsJoined: 0, karmaEarned: 0, createdAt: Date.now(), updatedAt: Date.now() }]
    const mockSet = vi.fn((updater: (prev: DailyProgress[]) => DailyProgress[]) => { store = updater(store) })
    const trackingSpy = vi.spyOn(karmaHelpers, 'awardKarmaWithTracking').mockResolvedValue(true)

    // Mention action
    const resMention = await karmaHelpers.awardKarmaWithLocal(mockSet as unknown as (updater: (prev: DailyProgress[]) => DailyProgress[]) => void, 'user-2', 2, 'mentioned', 'rel')
    expect(resMention).toBe(true)
    expect(store[0].mentions).toBe(1)
    expect(store[0].karmaEarned).toBe(2)

    // Follow action
    const resFollow = await karmaHelpers.awardKarmaWithLocal(mockSet as unknown as (updater: (prev: DailyProgress[]) => DailyProgress[]) => void, 'user-2', 1, 'followed')
    expect(resFollow).toBe(true)
    expect(store[0].follows).toBe(1)

    // Group joined action
    const resGroup = await karmaHelpers.awardKarmaWithLocal(mockSet as unknown as (updater: (prev: DailyProgress[]) => DailyProgress[]) => void, 'user-2', 5, 'group_joined')
    expect(resGroup).toBe(true)
    expect(store[0].groupsJoined).toBe(1)

    trackingSpy.mockRestore()
  })
})
