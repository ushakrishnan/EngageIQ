import { Star, Target, Heart, TrendUp as TrendingUp, Shield, Crown, Trophy, Medal, ArrowUp, ChatCircle, Fire, Lightning, Users, Calendar } from '@phosphor-icons/react'
import type { Achievement, UserRank } from '@/lib/karmaTypes'

// Map icon components directly on the exported objects so callers can render <rank.icon />
export const USER_RANKS: UserRank[] = [
  { title: 'Newcomer', minKarma: 0, color: 'text-gray-500', icon: Star, benefits: ['Basic community access'] },
  { title: 'Active Member', minKarma: 100, color: 'text-blue-500', icon: Target, benefits: ['Group creation', 'Enhanced profile'] },
  { title: 'Community Contributor', minKarma: 500, color: 'text-green-500', icon: Heart, benefits: ['Priority support', 'Special badges'] },
  { title: 'Influencer', minKarma: 1500, color: 'text-purple-500', icon: TrendingUp, benefits: ['Featured posts', 'Analytics access'] },
  { title: 'Community Leader', minKarma: 3000, color: 'text-orange-500', icon: Shield, benefits: ['Moderation tools', 'Early access'] },
  { title: 'Legend', minKarma: 10000, color: 'text-yellow-500', icon: Crown, benefits: ['All features', 'Exclusive events', 'Beta testing'] }
]

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_post', name: 'First Steps', description: 'Create your first post', icon: Star, condition: 'Create 1 post', karmaReward: 10, rarity: 'common', category: 'milestone' },
  { id: 'first_comment', name: 'Breaking the Ice', description: 'Make your first comment', icon: ChatCircle, condition: 'Make 1 comment', karmaReward: 5, rarity: 'common', category: 'milestone' },
  { id: 'active_commenter', name: 'Discussion Enthusiast', description: 'Make 10 comments', icon: ChatCircle, condition: 'Make 10 comments', karmaReward: 25, rarity: 'common', category: 'engagement' },
  { id: 'comment_champion', name: 'Conversation Champion', description: 'Make 100 comments', icon: ChatCircle, condition: 'Make 100 comments', karmaReward: 100, rarity: 'rare', category: 'engagement' },
  { id: 'discussion_starter', name: 'Discussion Starter', description: 'Create a post with 10+ comments', icon: ChatCircle, condition: 'Get 10 comments on one post', karmaReward: 50, rarity: 'common', category: 'engagement' },
  { id: 'debate_master', name: 'Debate Master', description: 'Start 5 discussions with 10+ comments each', icon: Fire, condition: 'Start 5 popular discussions', karmaReward: 150, rarity: 'rare', category: 'engagement' },
  { id: 'thread_weaver', name: 'Thread Weaver', description: 'Reply to 25 comments (start conversations)', icon: Lightning, condition: 'Reply to 25 comments', karmaReward: 50, rarity: 'common', category: 'engagement' },
  { id: 'helpful_contributor', name: 'Helpful Contributor', description: 'Receive 50 comment likes', icon: Medal, condition: 'Get 50 comment likes', karmaReward: 75, rarity: 'common', category: 'engagement' },
  { id: 'wisdom_keeper', name: 'Wisdom Keeper', description: 'Get 100+ likes on comments', icon: Medal, condition: 'Get 100 comment likes', karmaReward: 150, rarity: 'rare', category: 'engagement' },
  { id: 'mention_magnet', name: 'Mention Magnet', description: 'Get mentioned by others 25 times', icon: Target, condition: 'Get mentioned 25 times', karmaReward: 100, rarity: 'rare', category: 'engagement' },

  { id: 'popular_post', name: 'Crowd Pleaser', description: 'Get 10 likes on a single post', icon: Heart, condition: 'Get 10 likes on one post', karmaReward: 25, rarity: 'common', category: 'engagement' },
  { id: 'viral_post', name: 'Viral Star', description: 'Get 50 likes on a single post', icon: Fire, condition: 'Get 50 likes on one post', karmaReward: 100, rarity: 'rare', category: 'engagement' },
  { id: 'prolific_poster', name: 'Content Creator', description: 'Create 25 posts', icon: Medal, condition: 'Create 25 posts', karmaReward: 100, rarity: 'rare', category: 'content' },
  { id: 'upvote_master', name: 'Quality Curator', description: 'Receive 100 total likes', icon: ArrowUp, condition: 'Receive 100 likes', karmaReward: 150, rarity: 'rare', category: 'content' },
  { id: 'trending_expert', name: 'Trending Expert', description: 'Create 5 posts that reach Hot feed', icon: TrendingUp, condition: 'Create 5 trending posts', karmaReward: 200, rarity: 'epic', category: 'content' },

  { id: 'community_builder', name: 'Community Builder', description: 'Create a group with 10+ members', icon: Users, condition: 'Create group with 10 members', karmaReward: 200, rarity: 'epic', category: 'community' },
  { id: 'networking_expert', name: 'Networking Expert', description: 'Follow 25 users', icon: Target, condition: 'Follow 25 users', karmaReward: 50, rarity: 'common', category: 'community' },
  { id: 'popular_figure', name: 'Popular Figure', description: 'Get 50 followers', icon: Medal, condition: 'Get 50 followers', karmaReward: 200, rarity: 'epic', category: 'community' },
  { id: 'bridge_builder', name: 'Bridge Builder', description: 'Join 10 different groups', icon: Users, condition: 'Join 10 groups', karmaReward: 75, rarity: 'common', category: 'community' },

  { id: 'early_bird', name: 'Early Bird', description: 'Post within first hour of joining', icon: Lightning, condition: 'Quick to engage', karmaReward: 25, rarity: 'common', category: 'special' },
  { id: 'streak_master', name: 'Dedication Master', description: 'Post for 7 consecutive days', icon: Lightning, condition: 'Post 7 days in a row', karmaReward: 150, rarity: 'rare', category: 'special' },
  { id: 'daily_visitor', name: 'Daily Visitor', description: 'Visit the platform 30 days in a row', icon: Calendar, condition: 'Login 30 days straight', karmaReward: 200, rarity: 'epic', category: 'special' },
  { id: 'night_owl', name: 'Night Owl', description: 'Make 10 posts between 10PM-6AM', icon: Target, condition: 'Post during night hours', karmaReward: 50, rarity: 'common', category: 'special' },

  { id: 'veteran', name: 'Platform Veteran', description: 'Active for 30+ days', icon: Calendar, condition: 'Active for 30 days', karmaReward: 100, rarity: 'rare', category: 'milestone' },
  { id: 'karma_milestone_100', name: 'Rising Contributor', description: 'Reach 100 karma', icon: Trophy, condition: 'Reach 100 karma', karmaReward: 25, rarity: 'common', category: 'milestone' },
  { id: 'karma_milestone_500', name: 'Active Member', description: 'Reach 500 karma', icon: Trophy, condition: 'Reach 500 karma', karmaReward: 50, rarity: 'common', category: 'milestone' },
  { id: 'karma_milestone_1k', name: 'Rising Star', description: 'Reach 1,000 karma', icon: Trophy, condition: 'Reach 1,000 karma', karmaReward: 100, rarity: 'epic', category: 'milestone' },
  { id: 'karma_milestone_5k', name: 'Community Icon', description: 'Reach 5,000 karma', icon: Crown, condition: 'Reach 5,000 karma', karmaReward: 500, rarity: 'legendary', category: 'milestone' },
  { id: 'karma_milestone_10k', name: 'Platform Legend', description: 'Reach 10,000 karma', icon: Crown, condition: 'Reach 10,000 karma', karmaReward: 1000, rarity: 'legendary', category: 'milestone' }
]

export type ActionName =
  | 'post_created'
  | 'post_liked'
  | 'post_upvoted'
  | 'comment_made'
  | 'comment_liked'
  | 'comment_replied'
  | 'mentioned'
  | 'followed'
  | 'group_joined'
  | 'streak_bonus'
  | 'daily_login'
  | 'helpful_comment'
  | 'discussion_participation'
  | 'quality_post'

// Aliases map legacy or alternative action keys to canonical action names
const ACTION_ALIASES: Record<string, ActionName> = {
  'upvote': 'post_liked',
  'upvoted': 'post_liked',
  'post_upvoted': 'post_liked',
  'like': 'post_liked',
  'liked': 'post_liked'
}

export function normalizeAction(action: string | undefined): ActionName | string {
  if (!action || typeof action !== 'string') return action || ''
  const key = action.trim().toLowerCase()
  return (ACTION_ALIASES[key] as ActionName) || (key as ActionName)
}

export function getUserRank(karma: number): UserRank {
  // Find highest rank not exceeding karma
  const ranks = [...USER_RANKS].sort((a, b) => b.minKarma - a.minKarma)
  return ranks.find(r => karma >= r.minKarma) || USER_RANKS[0]
}

export function getNextRank(karma: number): UserRank | null {
  const ranks = [...USER_RANKS].sort((a, b) => a.minKarma - b.minKarma)
  for (const r of ranks) {
    if (r.minKarma > karma) return r
  }
  return null
}

export function calculateKarmaForAction(action: string): number {
  const canonical = String(normalizeAction(action))
  const karmaValues: Record<string, number> = {
    'post_created': 5,
    'post_liked': 1,
    'post_upvoted': 3,
    'comment_made': 2,
    'comment_liked': 1,
    'comment_replied': 2,
    'mentioned': 2,
    'followed': 1,
    'group_joined': 5,
    'streak_bonus': 10,
    'daily_login': 1,
    'helpful_comment': 5,
    'discussion_participation': 4,
    'quality_post': 8
  }
  return karmaValues[canonical] || 0
}
