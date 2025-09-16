import React from 'react';
import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { MentionSuggestions } from '@/components/MentionSuggestions'
import type { MentionableUser } from '@/lib/mentions'
import { getCurrentMention, insertMention } from '@/lib/mentions'

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
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
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
    
    if (mention && mention.query.length > 0) {
      setCurrentMentionQuery(mention.query)
      setShowSuggestions(true)
      updateSuggestionPosition()
    } else {
      setShowSuggestions(false)
      setCurrentMentionQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        
        {showSuggestions && (
          <MentionSuggestions
            query={currentMentionQuery}
            users={users}
            currentUserId={currentUserId || ''}
            onSelectMention={handleSelectMention}
            onClose={handleCloseSuggestions}
            position={suggestionPosition}
          />
        )}
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
        placeholder={placeholder}
        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        disabled={disabled}
      />
      
      {showSuggestions && (
        <MentionSuggestions
          query={currentMentionQuery}
          users={users}
          currentUserId={currentUserId || ''}
          onSelectMention={handleSelectMention}
          onClose={handleCloseSuggestions}
          position={suggestionPosition}
        />
      )}
    </div>
  )
}