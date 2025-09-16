import { describe, it, expect } from 'vitest'
import { calculateKarmaForAction, getUserRank } from '@/lib/karmaData'
import { checkAchievements } from '@/lib/karmaLogic'
import type { User, Post, Group } from '@/types'

describe('karma utilities', () => {
  it('calculateKarmaForAction returns expected values', () => {
    expect(calculateKarmaForAction('post_created')).toBe(5)
    expect(calculateKarmaForAction('post_liked')).toBe(1)
    expect(calculateKarmaForAction('nonexistent')).toBe(0)
  })

  it('getUserRank returns correct rank for karma thresholds', () => {
    const r0 = getUserRank(0)
    expect(r0.title).toBe('Newcomer')

    const r1500 = getUserRank(1500)
    expect(r1500.title).toBe('Influencer')

    const r10000 = getUserRank(10000)
    expect(r10000.title).toBe('Legend')
  })

  it('checkAchievements detects basic achievements', () => {
    const user = ({ id: 'u1', name: 'Test', avatar: '', email: '', achievements: [], karma: 0, joinedAt: Date.now() - 1000 } as unknown) as User
    const posts = [{ id: 'p1', userId: 'u1', timestamp: Date.now(), likes: [], comments: [] } as unknown as Post]
    const groups = [] as Group[]
    const result = checkAchievements(user, posts as unknown as Post[], groups)
    expect(result).toContain('first_post')
  })
})
