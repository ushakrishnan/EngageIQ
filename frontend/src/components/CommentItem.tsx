import React from 'react';
import { useState, useEffect, useCallback } from 'react'
import { DotsThreeVertical, Trash, Pencil, PaperPlaneRight } from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MentionInput } from '@/components/MentionInput'
import type { Comment, User } from '@/types'
import type { MentionableUser } from '@/lib/mentions'

interface CommentItemProps {
  comment: Comment
  postId: string
  currentUser: User | null
  depth?: number
  onAddComment: (postId: string, content: string, parentId?: string) => void
  onEditComment: (postId: string, commentId: string, newContent: string) => void
  onDeleteComment: (postId: string, commentId: string) => void
  allMentionableUsers: MentionableUser[]
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  currentUser,
  depth = 0,
  onAddComment,
  onEditComment,
  onDeleteComment,
  allMentionableUsers
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [showReplies, setShowReplies] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  // Reset edit content when comment content changes
  useEffect(() => {
    setEditContent(comment.content)
  }, [comment.content])

  const handleAddReply = useCallback(() => {
    if (replyContent.trim()) {
      onAddComment(postId, replyContent, comment.id)
      setReplyContent('')
      setShowReplyInput(false)
    }
  }, [replyContent, onAddComment, postId, comment.id])

  const handleReplyKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddReply()
    }
  }, [handleAddReply])

  const handleEdit = useCallback(() => {
    if (editContent.trim() && editContent !== comment.content) {
      onEditComment(postId, comment.id, editContent)
    }
    setIsEditing(false)
  }, [editContent, comment.content, comment.id, onEditComment, postId])

  const handleEditKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === 'Escape') {
      setEditContent(comment.content)
      setIsEditing(false)
    }
  }, [handleEdit, comment.content])

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDeleteComment(postId, comment.id)
    }
  }, [onDeleteComment, postId, comment.id])

  const handleCancelEdit = useCallback(() => {
    setEditContent(comment.content)
    setIsEditing(false)
  }, [comment.content])

  const handleUserClick = useCallback((user: MentionableUser) => {
    console.log('User clicked:', user)
  }, [])

  const hasReplies = comment.replies && comment.replies.length > 0
  const maxDepth = 3 // Limit nesting depth
  const isOwner = comment.userId === currentUser?.id

  return (
    <div className={`${depth > 0 ? 'ml-6 mt-3 pl-2 border-l border-border/30' : ''}`}>
      <div className="flex gap-3 group">
        <Avatar className={`${depth === 0 ? 'h-8 w-8' : 'h-7 w-7'} flex-shrink-0`}>
          <AvatarImage src={''} />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {comment.userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs">{comment.userName}</span>
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const diff = Date.now() - comment.timestamp
                    const minutes = Math.floor(diff / (1000 * 60))
                    const hours = Math.floor(diff / (1000 * 60 * 60))
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

                    if (days > 0) return `${days}d ago`
                    if (hours > 0) return `${hours}h ago`
                    if (minutes > 0) return `${minutes}m ago`
                    return 'Just now'
                  })()}
                </span>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <DotsThreeVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className="text-sm">
              {isEditing ? (
                <div className="space-y-2">
                  <MentionInput
                    value={editContent}
                    onChange={setEditContent}
                    onKeyPress={handleEditKeyPress}
                    placeholder="Edit your comment..."
                    users={allMentionableUsers}
                    onUserClick={handleUserClick}
                    currentUserId={currentUser?.id}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleEdit}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                comment.content
              )}
            </div>
          </div>

          {depth < maxDepth && !isEditing && (
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowReplyInput(!showReplyInput)}
              >
                Reply
              </Button>
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? 'Hide' : 'Show'} {comment.replies?.length} {comment.replies?.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>
          )}

          {showReplyInput && (
            <div className="mt-2 space-y-2">
              <MentionInput
                value={replyContent}
                onChange={setReplyContent}
                onKeyPress={handleReplyKeyPress}
                placeholder="Write a reply..."
                users={allMentionableUsers}
                onUserClick={handleUserClick}
                currentUserId={currentUser?.id}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddReply} disabled={!replyContent.trim()}>
                  <PaperPlaneRight size={14} className="mr-1" />
                  Reply
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReplyInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {hasReplies && showReplies && depth < maxDepth && (
            <div className="mt-2">
              {comment.replies?.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  currentUser={currentUser}
                  depth={depth + 1}
                  onAddComment={onAddComment}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  allMentionableUsers={allMentionableUsers}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}