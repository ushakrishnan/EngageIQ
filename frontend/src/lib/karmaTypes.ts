import type { ElementType } from 'react'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: ElementType
  condition: string
  karmaReward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'engagement' | 'content' | 'community' | 'milestone' | 'special'
  unlockedAt?: number
}

export interface KarmaAction {
  type: 'post_created' | 'post_liked' | 'post_upvoted' | 'comment_made' | 'comment_liked' | 'comment_replied' | 'mentioned' | 'followed' | 'group_joined' | 'streak_bonus' | 'daily_login' | 'helpful_comment' | 'discussion_participation' | 'quality_post'
  points: number
  description: string
  timestamp: number
  relatedId?: string
}

export interface UserRank {
  title: string
  minKarma: number
  color: string
  icon: ElementType
  benefits: string[]
}
