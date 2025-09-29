import React from 'react';
import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { MentionSuggestions } from '@/components/MentionSuggestions'
import type { MentionableUser } from '@/lib/mentions'
import { getCurrentMention, insertMention, searchMentionSuggestions } from '@/lib/mentions'

type SuggestionWithMatches = { item: MentionableUser; matches?: unknown }

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onKeyPress?: (e: React.KeyboardEvent) => void
  placeholder?: string
  className?: string
  users: MentionableUser[]
  currentUserId?: string
  disabled?: boolean
  multiline?: boolean
  onUserClick?: (user: MentionableUser) => void
}

export function MentionInput({
  value,
  onChange,
  onKeyPress,
  placeholder,
  className,
  users,
  currentUserId,
  disabled,
  multiline = false,
  onUserClick
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 })
  const [currentMentionQuery, setCurrentMentionQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [cursorPosition, setCursorPosition] = useState(0)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }, [cursorPosition])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const newCursorPosition = e.target.selectionStart || 0
    
    onChange(newValue)
    setCursorPosition(newCursorPosition)
    
    // Check for mention trigger
    const mention = getCurrentMention(newValue, newCursorPosition)
    
    // Show suggestions when the cursor is inside a mention being typed.
    // Allow an empty query (user typed just '@') so the suggestions list appears immediately.
    if (mention) {
      setCurrentMentionQuery(mention.query)
      setShowSuggestions(true)
      try {
        // helpful debug: compute how many candidates match to make it obvious why nothing shows
        const matches = searchMentionSuggestions(mention.query, users, currentUserId || '')
        // only log when a debug flag is present in the URL to avoid noisy logs in production
        if (typeof window !== 'undefined' && window.location && new URL(window.location.href).searchParams.get('debug_mentions') === '1') {
          console.debug('[MentionInput] mention detected', { query: mention.query, cursor: newCursorPosition, matchesCount: matches.length, first5: matches.slice(0,5).map(m=>m.item?.name) })
        }
      } catch {
        // ignore search errors for robustness
      }
      updateSuggestionPosition()
    } else {
      setShowSuggestions(false)
      setCurrentMentionQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Fallback: if user types the '@' character, open suggestions immediately (schedule after event loop)
    if (e.key === '@') {
      setTimeout(() => {
        const el = inputRef.current as (HTMLInputElement | HTMLTextAreaElement | null)
        const pos = el ? (typeof (el as HTMLInputElement).selectionStart === 'number' ? (el as HTMLInputElement).selectionStart! : 0) : 0
        const mention = getCurrentMention(value, pos)
        if (mention) {
          setCurrentMentionQuery(mention.query)
          setShowSuggestions(true)
          updateSuggestionPosition()
        }
      }, 0)
    }

    setCursorPosition(e.currentTarget.selectionStart || 0)

    // If suggestions are showing, let MentionSuggestions handle navigation
    if (showSuggestions && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return
    }

    onKeyPress?.(e)
  }

  const updateSuggestionPosition = () => {
    if (!inputRef.current) return
    
    const inputRect = inputRef.current.getBoundingClientRect()
    const scrollY = window.scrollY || document.documentElement.scrollTop
    
    setSuggestionPosition({
      top: inputRect.bottom + scrollY + 8,
      left: inputRect.left
    })
  }

  const handleSelectMention = (user: MentionableUser) => {
    if (!inputRef.current) return
    
    const result = insertMention(value, cursorPosition, user)
    onChange(result.newContent)
    setCursorPosition(result.newCursorPosition)
    setShowSuggestions(false)
    setCurrentMentionQuery('')
    
    // Call onUserClick if provided
    onUserClick?.(user)
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const handleCloseSuggestions = () => {
    setShowSuggestions(false)
    setCurrentMentionQuery('')
  }

  const handleInputFocus = () => {
    if (showSuggestions) {
      updateSuggestionPosition()
    }
  }

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
      setCurrentMentionQuery('')
    }, 200)
  }

  if (multiline) {
    return (
      <div className="relative">
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        
        {showSuggestions && (() => {
          // compute suggestion results and fallbacks
          let suggestionCount = 0
          let suggestionsOverride = undefined as undefined | SuggestionWithMatches[]
          try {
            const matches = searchMentionSuggestions(currentMentionQuery, users, currentUserId || '')
            suggestionCount = matches.length
            if (matches.length === 0 && users && users.length > 0) {
              // fallback: top-5 from users (excluding current)
              const top = users.filter(u => u.id !== (currentUserId || '')).slice(0, 5).map(u => ({ item: u }))
              suggestionsOverride = top
              suggestionCount = top.length
            }
          } catch {
            suggestionCount = (users && users.length) ? Math.min(5, users.length) : 0
          }

          const showDebug = typeof window !== 'undefined' && window.location && new URL(window.location.href).searchParams.get('debug_mentions') === '1'

          return (
            <div data-mention-suggestions-count={suggestionCount}>
              {showDebug && (
                <div className="fixed top-20 right-4 z-60 bg-white border p-2 text-xs shadow rounded">
                  <div><strong>Mention Debug</strong></div>
                  <div>query: {currentMentionQuery}</div>
                  <div>matchesCount: {suggestionCount}</div>
                  <div>usersCount: {users?.length ?? 0}</div>
                </div>
              )}
              <MentionSuggestions
                query={currentMentionQuery}
                users={users}
                currentUserId={currentUserId || ''}
                onSelectMention={handleSelectMention}
                onClose={handleCloseSuggestions}
                position={suggestionPosition}
                suggestionsOverride={suggestionsOverride}
              />
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        disabled={disabled}
      />
      
      {showSuggestions && (() => {
        // compute suggestion results and fallback for single-line input
        let suggestionCount = 0
  let suggestionsOverride = undefined as undefined | SuggestionWithMatches[]
        try {
          const matches = searchMentionSuggestions(currentMentionQuery, users, currentUserId || '')
          suggestionCount = matches.length
          if (matches.length === 0 && users && users.length > 0) {
            suggestionsOverride = users.filter(u => u.id !== (currentUserId || '')).slice(0, 5).map(u => ({ item: u }))
            suggestionCount = suggestionsOverride.length
          }
        } catch {
          suggestionCount = (users && users.length) ? Math.min(5, users.length) : 0
        }

        const showDebug = typeof window !== 'undefined' && window.location && new URL(window.location.href).searchParams.get('debug_mentions') === '1'

        return (
          <div data-mention-suggestions-count={suggestionCount}>
            {showDebug && (
              <div className="fixed top-20 right-4 z-60 bg-white border p-2 text-xs shadow rounded">
                <div><strong>Mention Debug</strong></div>
                <div>query: {currentMentionQuery}</div>
                <div>matchesCount: {suggestionCount}</div>
                <div>usersCount: {users?.length ?? 0}</div>
              </div>
            )}
            <MentionSuggestions
              query={currentMentionQuery}
              users={users}
              currentUserId={currentUserId || ''}
              onSelectMention={handleSelectMention}
              onClose={handleCloseSuggestions}
              position={suggestionPosition}
              suggestionsOverride={suggestionsOverride}
            />
          </div>
        )
      })()}
    </div>
  )
}