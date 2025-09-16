import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import type { MentionableUser } from '@/lib/mentions'
import { getMentionSuggestions } from '@/lib/mentions'

interface MentionSuggestionsProps {
  query: string
  users: MentionableUser[]
  currentUserId: string
  onSelectMention: (user: MentionableUser) => void
  onClose: () => void
  position: { top: number; left: number }
}

export function MentionSuggestions({
  query,
  users,
  currentUserId,
  onSelectMention,
  onClose,
  position
}: MentionSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const suggestions = getMentionSuggestions(query, users, currentUserId)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % suggestions.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (suggestions[selectedIndex]) {
            onSelectMention(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, selectedIndex, onSelectMention, onClose])

  useEffect(() => {
    // Scroll selected item into view
    if (containerRef.current) {
      const selectedItem = containerRef.current.children[selectedIndex] as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [selectedIndex])

  if (suggestions.length === 0) return null

  const id = `mention-${Math.random().toString(36).slice(2, 9)}`

  return (
    <Card
      ref={containerRef}
      id={id}
      className="absolute z-50 w-64 max-h-48 overflow-y-auto shadow-lg border bg-popover"
      data-mention-id={id}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `#${id} { top: ${position.top}px; left: ${position.left}px; }`,
        }}
      />
      {suggestions.map((user, index) => (
        <div
          key={user.id}
          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent ${
            index === selectedIndex ? 'bg-accent' : ''
          }`}
          onClick={() => onSelectMention(user)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.name.replace(/\s+/g, '').toLowerCase()}</p>
          </div>
        </div>
      ))}
    </Card>
  )
}