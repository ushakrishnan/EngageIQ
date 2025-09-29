import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import type { MentionableUser } from '@/lib/mentions'
import { searchMentionSuggestions } from '@/lib/mentions'
type SuggestionWithMatches = { item: MentionableUser; matches?: unknown }

interface MentionSuggestionsProps {
  query: string
  users: MentionableUser[]
  currentUserId: string
  onSelectMention: (user: MentionableUser) => void
  onClose: () => void
  position: { top: number; left: number }
  // optional precomputed suggestions (item + matches) to render instead of running search inside
  suggestionsOverride?: SuggestionWithMatches[]
}

export function MentionSuggestions({
  query,
  users,
  currentUserId,
  onSelectMention,
  onClose,
  position,
  suggestionsOverride
}: MentionSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const suggestionsWithMatches: SuggestionWithMatches[] = suggestionsOverride ?? searchMentionSuggestions(query, users, currentUserId)
  const suggestions: MentionableUser[] = suggestionsWithMatches.map((s: SuggestionWithMatches) => s.item)
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

  if (suggestions.length === 0) {
    const id = `mention-${Math.random().toString(36).slice(2, 9)}`
    return (
      <Card
        id={id}
        className="absolute z-50 w-64 max-h-48 overflow-y-auto shadow-lg border bg-popover p-2"
        data-mention-id={id}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `#${id} { top: ${position.top}px; left: ${position.left}px; }`,
          }}
        />
        <div className="text-sm text-muted-foreground p-2">No matches</div>
      </Card>
    )
  }

  const id = `mention-${Math.random().toString(36).slice(2, 9)}`

  type Match = { key: string; indices?: [number, number][] }
  const renderHighlightedName = (user: MentionableUser, matchData?: unknown) => {
    if (!matchData || (Array.isArray(matchData) && matchData.length === 0)) return <>{user.name}</>
    // Find the name match
    const matchesArr = matchData as Match[]
    const nameMatch = matchesArr.find((m) => m?.key === 'name') as Match | undefined
    if (!nameMatch || !nameMatch.indices) return <>{user.name}</>
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    for (const [i, pair] of nameMatch.indices.entries()) {
      const [start, end] = pair
      if (start > lastIndex) parts.push(<span key={`t-${i}-pre`}>{user.name.substring(lastIndex, start)}</span>)
      parts.push(<span key={`t-${i}-match`} className="bg-primary/20 px-0.5 rounded">{user.name.substring(start, end + 1)}</span>)
      lastIndex = end + 1
    }
    if (lastIndex < user.name.length) parts.push(<span key={`t-end`}>{user.name.substring(lastIndex)}</span>)
    return <>{parts}</>
  }

  const renderHighlightedHandle = (user: MentionableUser, matchData?: unknown) => {
    // compute handle if not present
    const handle = user.handle || user.name.replace(/\s+/g, '').toLowerCase()
    if (!matchData || (Array.isArray(matchData) && matchData.length === 0)) return <>{`@${handle}`}</>
    const matchesArr = matchData as Match[]
    const handleMatch = matchesArr.find((m) => m?.key === 'handle') as Match | undefined
    if (!handleMatch || !handleMatch.indices) return <>{`@${handle}`}</>
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    for (const [i, pair] of handleMatch.indices.entries()) {
      const [start, end] = pair
      if (start > lastIndex) parts.push(<span key={`h-${i}-pre`}>{handle.substring(lastIndex, start)}</span>)
      parts.push(<span key={`h-${i}-match`} className="bg-primary/20 px-0.5 rounded">{handle.substring(start, end + 1)}</span>)
      lastIndex = end + 1
    }
    if (lastIndex < handle.length) parts.push(<span key={`h-end`}>{handle.substring(lastIndex)}</span>)
    return <>{'@'}{parts}</>
  }

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
      {suggestionsWithMatches.map((s, index) => {
        const user = s.item
        const matchData = s.matches
        return (
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
              <p className="text-sm font-medium truncate">{renderHighlightedName(user, matchData)}</p>
              <p className="text-xs text-muted-foreground">{renderHighlightedHandle(user, matchData)}</p>
            </div>
          </div>
        )
      })}
    </Card>
  )
}