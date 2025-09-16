import type { User, Post, Group, Comment } from '@/types'
import { ACHIEVEMENTS } from './karmaData'

export function checkAchievements(user: User, posts: Post[], groups: Group[]): string[] {
  const newAchievements: string[] = []

  const getUserCommentCount = (userId: string): number => {
    let count = 0
    posts.forEach(post => {
      const countCommentsRecursive = (comments: Comment[]): number => {
        return comments.reduce((sum, comment) => {
          let commentCount = comment.userId === userId ? 1 : 0
          if (comment.replies) {
            commentCount += countCommentsRecursive(comment.replies)
          }
          return sum + commentCount
        }, 0)
      }
      count += countCommentsRecursive(post.comments || [])
    })
    return count
  }

  const getUserReplyCount = (userId: string): number => {
    let count = 0
    posts.forEach(post => {
      const countRepliesRecursive = (comments: Comment[]): number => {
        return comments.reduce((sum, comment) => {
          let replyCount = 0
          if (comment.replies) {
            replyCount += comment.replies.filter((reply: Comment) => reply.userId === userId).length
            replyCount += countRepliesRecursive(comment.replies)
          }
          return sum + replyCount
        }, 0)
      }
      count += countRepliesRecursive(post.comments || [])
    })
    return count
  }

  const getMentionCount = (userId: string): number => {
    let count = 0
    posts.forEach(post => {
      const countMentionsRecursive = (comments: Comment[]): number => {
        return comments.reduce((sum, comment) => {
          let mentionCount = (comment.mentions || []).includes(userId) ? 1 : 0
          if (comment.replies) {
            mentionCount += countMentionsRecursive(comment.replies)
          }
          return sum + mentionCount
        }, 0)
      }
      count += countMentionsRecursive(post.comments || [])
    })
    return count
  }

  ACHIEVEMENTS.forEach(achievement => {
    if (user.achievements?.includes(achievement.id)) return
    let unlocked = false
    switch (achievement.id) {
      case 'first_post': {
        unlocked = posts.filter(p => p.userId === user.id).length >= 1
        break
      }
      case 'first_comment': {
        unlocked = getUserCommentCount(user.id) >= 1
        break
      }
      case 'active_commenter': {
        unlocked = getUserCommentCount(user.id) >= 10
        break
      }
      case 'comment_champion': {
        unlocked = getUserCommentCount(user.id) >= 100
        break
      }
      case 'thread_weaver': {
        unlocked = getUserReplyCount(user.id) >= 25
        break
      }
      case 'mention_magnet': {
        unlocked = getMentionCount(user.id) >= 25
        break
      }
      case 'popular_post': {
        unlocked = posts.some(p => p.userId === user.id && (p.likes || []).length >= 10)
        break
      }
      case 'viral_post': {
        unlocked = posts.some(p => p.userId === user.id && (p.likes || []).length >= 50)
        break
      }
      case 'discussion_starter': {
        unlocked = posts.some(p => p.userId === user.id && (p.comments || []).length >= 10)
        break
      }
      case 'debate_master': {
        const popularDiscussions = posts.filter(p => 
          p.userId === user.id && (p.comments || []).length >= 10
        )
        unlocked = popularDiscussions.length >= 5
        break
      }
      case 'prolific_poster': {
        unlocked = posts.filter(p => p.userId === user.id).length >= 25
        break
      }
      case 'upvote_master': {
        const totalLikes = posts
          .filter(p => p.userId === user.id)
          .reduce((sum, p) => sum + (p.likes || []).length, 0)
        unlocked = totalLikes >= 100
        break
      }
      case 'trending_expert': {
        const trendingPosts = posts.filter(p => 
          p.userId === user.id && (p.score || 0) > 5
        )
        unlocked = trendingPosts.length >= 5
        break
      }
      case 'helpful_contributor': {
        unlocked = false
        break
      }
      case 'wisdom_keeper': {
        unlocked = false
        break
      }
      case 'early_bird': {
        const joinTime = user.joinedAt
        const firstPost = posts
          .filter(p => p.userId === user.id)
          .sort((a, b) => a.timestamp - b.timestamp)[0]
        if (firstPost) {
          const timeDiff = firstPost.timestamp - joinTime
          unlocked = timeDiff <= 60 * 60 * 1000 // Within 1 hour
        }
        break
      }
      case 'night_owl': {
        const nightPosts = posts.filter(p => {
          if (p.userId !== user.id) return false
          const hour = new Date(p.timestamp).getHours()
          return hour >= 22 || hour <= 6
        })
        unlocked = nightPosts.length >= 10
        break
      }
      case 'karma_milestone_100': {
        unlocked = (user.karma || 0) >= 100
        break
      }
      case 'karma_milestone_500': {
        unlocked = (user.karma || 0) >= 500
        break
      }
      case 'karma_milestone_1k': {
        unlocked = (user.karma || 0) >= 1000
        break
      }
      case 'karma_milestone_5k': {
        unlocked = (user.karma || 0) >= 5000
        break
      }
      case 'karma_milestone_10k': {
        unlocked = (user.karma || 0) >= 10000
        break
      }
      case 'networking_expert': {
        unlocked = (user.following || []).length >= 25
        break
      }
      case 'popular_figure': {
        unlocked = (user.followers || []).length >= 50
        break
      }
      case 'community_builder': {
        const ownedGroups = groups.filter(g => 
          g.createdBy === user.id && (Array.isArray(g.members) ? g.members.length : 0) >= 10
        )
        unlocked = ownedGroups.length > 0
        break
      }
      case 'bridge_builder': {
        const joinedGroups = groups.filter(g => 
          Array.isArray(g.members) && g.members.some(m => m.userId === user.id)
        )
        unlocked = joinedGroups.length >= 10
        break
      }
      case 'veteran': {
        const daysSinceJoin = Math.floor((Date.now() - user.joinedAt) / (24 * 60 * 60 * 1000))
        unlocked = daysSinceJoin >= 30
        break
      }
      case 'daily_visitor': {
        unlocked = false
        break
      }
      case 'streak_master': {
        unlocked = false
        break
      }
    }

    if (unlocked) {
      newAchievements.push(achievement.id)
    }
  })

  return newAchievements
}
