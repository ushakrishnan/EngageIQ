import React from 'react';

import type { MentionableUser } from '@/lib/mentions'
import { parseMentions } from '@/lib/mentions'

/**
 * Render text content with mentions highlighted and optionally clickable
 */
export function renderContentWithMentions(
  content: string, 
  users: MentionableUser[],
  onUserClick?: (user: MentionableUser) => void
): React.ReactNode[] {
  const mentions = parseMentions(content, users)
  
  if (mentions.length === 0) {
    return [content]
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  mentions.forEach((mention, index) => {
    // Add text before mention
    if (mention.start > lastIndex) {
      const textPart = content.substring(lastIndex, mention.start)
      parts.push(<span key={`text-${index}-before`}>{textPart}</span>)
    }

    // Get the actual mention text from the content
    const mentionText = content.substring(mention.start, mention.end)

    // Add mention with styling
    parts.push(
      <span
        key={`mention-${index}`}
        className={`text-primary font-medium bg-primary/10 px-1 rounded ${
          onUserClick ? 'cursor-pointer hover:bg-primary/20 transition-colors' : ''
        }`}
        title={`Mentioned ${mention.name}`}
        onClick={onUserClick ? () => {
          // Find the user by id from the mention
          const user = users.find(u => u.id === mention.id)
          if (user) {
            onUserClick(user)
          }
        } : undefined}
      >
        {mentionText}
      </span>
    )

    lastIndex = mention.end
  })

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex)
    parts.push(<span key="text-end">{remainingText}</span>)
  }

  return parts
}