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
}

/**
 * Parse mentions from text content
 * Finds patterns like @username and extracts user information
 */
export function parseMentions(content: string, users: MentionableUser[]): ParsedMention[] {
  const mentions: ParsedMention[] = []
  const mentionRegex = /@(\w+)/g
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionName = match[1]
    // Try to find user by normalized name (no spaces, lowercase)
    const user = users.find(u => 
      u.name.toLowerCase().replace(/\s+/g, '') === mentionName.toLowerCase()
    )
    
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
  const query = input.toLowerCase()
  
  return users
    .filter(user => 
      user.id !== currentUserId && 
      user.name.toLowerCase().includes(query)
    )
    .slice(0, 5) // Limit to 5 suggestions
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
  
  if (!mention) {
    // Insert at cursor position
    const mentionText = `@${user.name.replace(/\s+/g, '')} `
    const newContent = content.substring(0, cursorPosition) + mentionText + content.substring(cursorPosition)
    return {
      newContent,
      newCursorPosition: cursorPosition + mentionText.length
    }
  }
  
  // Replace the current mention being typed
  const mentionText = `@${user.name.replace(/\s+/g, '')} `
  const newContent = content.substring(0, mention.start) + mentionText + content.substring(mention.end)
  
  return {
    newContent,
    newCursorPosition: mention.start + mentionText.length
  }
}