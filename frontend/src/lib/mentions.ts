export interface ParsedMention {
  id: string
  name: string
  start: number
  end: number
}

export interface MentionableUser {
  id: string
  name: string
  avatar: string
  // computed handle (username) derived from name, e.g. 'jdoe'
  handle?: string
}

import Fuse from 'fuse.js'

/**
 * Build a canonical handle string for a user (used for insertion/search).
 */
export function buildHandleText(u: MentionableUser) {
  return (u.handle || u.name.replace(/\s+/g, '').toLowerCase())
}

/**
 * Parse mentions from text content
 * Finds patterns like @username and extracts user information
 * Supports handles containing letters, numbers, underscore, dot and hyphen.
 */
export function parseMentions(content: string, users: MentionableUser[]): ParsedMention[] {
  const mentions: ParsedMention[] = []
  // allow a-z0-9 _ . - in handles
  const mentionRegex = /@([A-Za-z0-9_.-]+)/g
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionName = match[1]
    const mentionNameNormalized = mentionName.toLowerCase()
    const user = users.find(u => {
      const handle = (u.handle || u.name.replace(/\s+/g, '').toLowerCase()).toLowerCase()
      const normalizedName = u.name.toLowerCase().replace(/\s+/g, '')
      return handle === mentionNameNormalized || normalizedName === mentionNameNormalized
    })

    if (user) {
      mentions.push({
        id: user.id,
        name: user.name,
        start: match.index,
        end: match.index + match[0].length
      })
    }
  }

  return mentions
}

/**
 * Extract mentioned user IDs from content
 */
export function extractMentionedUserIds(content: string, users: MentionableUser[]): string[] {
  const mentions = parseMentions(content, users)
  return [...new Set(mentions.map(m => m.id))]
}

/**
 * Get mention suggestions based on input
 */
export function getMentionSuggestions(
  input: string,
  users: MentionableUser[],
  currentUserId: string
): MentionableUser[] {
  const q = (input || '').trim()
  // Prepare users ensuring a handle exists (fallback to normalized name)
  const prepared = users.filter(u => u.id !== currentUserId).map(u => ({
    ...u,
    handle: buildHandleText(u)
  }))

  // If empty, return first N users (excluding current)
  if (!q) return prepared.slice(0, 5)

  // Use Fuse.js for fuzzy searching with tuned weights
  const fuse = new Fuse(prepared, {
    keys: [
      { name: 'name', weight: 0.8 },
      { name: 'handle', weight: 1 }
    ],
    includeMatches: true,
    threshold: 0.4, // lower is stricter (0 exact only, 1 match all)
    distance: 100,
    ignoreLocation: true
  })
  const results = fuse.search(q, { limit: 10 })
  // Map back to prepared users (Fuse result contains item and matches)
  return (results as Array<{ item: MentionableUser }>).map(r => r.item).slice(0, 5)
}

/**
 * Find the current mention being typed
 */
export function getCurrentMention(content: string, cursorPosition: number): {
  query: string
  start: number
  end: number
} | null {
  // Find the last @ before cursor position
  const beforeCursor = content.substring(0, cursorPosition)
  const lastAtIndex = beforeCursor.lastIndexOf('@')

  if (lastAtIndex === -1) return null

  // Check if there's a space between @ and cursor
  const afterAt = beforeCursor.substring(lastAtIndex + 1)
  if (afterAt.includes(' ')) return null

  // Find the end of the mention (space or end of string)
  const afterCursor = content.substring(cursorPosition)
  const spaceIndex = afterCursor.indexOf(' ')
  const endPosition = spaceIndex === -1 ? content.length : cursorPosition + spaceIndex

  return {
    query: afterAt,
    start: lastAtIndex,
    end: endPosition
  }
}

/**
 * Insert a mention into text content
 */
export function insertMention(
  content: string,
  cursorPosition: number,
  user: MentionableUser
): { newContent: string; newCursorPosition: number } {
  const mention = getCurrentMention(content, cursorPosition)
  const mentionText = `@${buildHandleText(user)} `

  if (!mention) {
    const newContent = content.substring(0, cursorPosition) + mentionText + content.substring(cursorPosition)
    return {
      newContent,
      newCursorPosition: cursorPosition + mentionText.length
    }
  }

  // Replace the current mention being typed
  const newContent = content.substring(0, mention.start) + mentionText + content.substring(mention.end)
  return {
    newContent,
    newCursorPosition: mention.start + mentionText.length
  }
}

export function searchMentionSuggestions(
  input: string,
  users: MentionableUser[],
  currentUserId: string
): Array<{ item: MentionableUser; matches?: Fuse.FuseResult<MentionableUser>['matches'] }> {
  const q = (input || '').trim()
  if (!q) return users.filter(u => u.id !== currentUserId).slice(0, 5).map(u => ({ item: u }))

  // Ensure each user has a handle (lowercased, no spaces)
  const prepared = users.filter(u => u.id !== currentUserId).map(u => ({
    ...u,
    handle: buildHandleText(u)
  }))

  const fuse = new Fuse(prepared, {
    keys: [
      { name: 'name', weight: 0.8 },
      { name: 'handle', weight: 1 }
    ],
    includeMatches: true,
    threshold: 0.4,
    distance: 100,
    ignoreLocation: true
  })

  const results = fuse.search(q, { limit: 10 }) as Fuse.FuseResult<MentionableUser>[]
  return results.map(r => ({ item: r.item, matches: r.matches }))
}