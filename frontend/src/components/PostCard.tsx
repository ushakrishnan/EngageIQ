import React from 'react';
import { useState, useCallback, useEffect } from 'react'
import { Heart, ChatCircle, Users, DotsThreeVertical, Trash, Pencil, PaperPlaneRight, Hash, Briefcase, UserPlus, UserMinus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { MentionInput } from '@/components/MentionInput'
import { renderContentWithMentions } from '@/components/MentionRenderer'
import { CommentItem } from '@/components/CommentItem'
import type { Post, Comment, User, Group } from '@/types'
import type { MentionableUser } from '@/lib/mentions'
import { useUnsyncedIds } from '@/lib/useUnsynced'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'

interface PostCardProps {
  post: Post
  currentUser: User | null
  users: User[]
  groups: Group[]
  allMentionableUsers: MentionableUser[]
  onToggleUpvote?: (postId: string) => void
  onToggleDownvote?: (postId: string) => void
  toggleLike: (postId: string) => void
  addComment: (postId: string, content: string, parentId?: string) => void
  editComment: (postId: string, commentId: string, newContent: string) => void
  deleteComment: (postId: string, commentId: string) => void
  editPost: (postId: string, content: string, tags?: string[]) => void
  deletePost: (postId: string) => void
  setViewingUserProfile: (user: User) => void
  handleContentAction: (action: string, contentId: string, contentType: 'post' | 'comment') => void
  handleUserAction: (action: string, userId: string) => void
  handleReportContent: (contentId: string, contentType: 'post' | 'comment', reason: string) => void
  isUserModerator: boolean
  getUserRank: (karma: number) => unknown
  followUser: (userId: string) => void
  unfollowUser: (userId: string) => void
}

export const PostCard = React.memo<PostCardProps>(({ 
  post, 
  currentUser, 
  users, 
  groups, 
  allMentionableUsers, 
  onToggleUpvote: _onToggleUpvote, 
  onToggleDownvote: _onToggleDownvote, 
  toggleLike, 
  addComment, 
  editComment, 
  deleteComment, 
  editPost, 
  deletePost, 
  setViewingUserProfile, 
  handleContentAction: _handleContentAction, 
  handleUserAction: _handleUserAction, 
  handleReportContent: _handleReportContent, 
  isUserModerator: _isUserModerator, 
  getUserRank: _getUserRank, 
  followUser, 
  unfollowUser 
}) => {
  const unsyncedIds = useUnsyncedIds()
  const postGroup = post.groupId ? groups.find(g => g.id === post.groupId) : null
  const [showComments, setShowComments] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editPostContent, setEditPostContent] = useState(post.content)
  // Reference unused handlers so they are not reported as unused by TS
  void _onToggleUpvote; void _onToggleDownvote; void _handleContentAction; void _handleUserAction; void _handleReportContent; void _isUserModerator; void _getUserRank;
  // Tagging states while editing
  const [selectedTags, setSelectedTags] = useState<string[]>(post.tags || [])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [isSuggestingTags, setIsSuggestingTags] = useState(false)
  const [tagInputValue, setTagInputValue] = useState('')

  // Consider a post owner if post.userId matches currentUser.id OR post.userName matches currentUser.name
  const isPostOwner = (post.userId && currentUser?.id && String(post.userId) === String(currentUser.id)) || (post.userName && currentUser?.name && String(post.userName) === String(currentUser.name))
  const postUser = users.find(u => u.id === post.userId || (post.userName && u.name === post.userName))
  const displayUserName = post.userName || postUser?.name || (post.userId === currentUser?.id ? currentUser?.name : '') || ''
  const isFollowing = !!(currentUser?.following?.includes(post.userId) || (postUser && currentUser?.following?.includes(postUser.id)))
  const canFollow = !!(currentUser?.id && !isPostOwner && post.userId)
  
  // Reset edit content when post content changes
  useEffect(() => {
    setEditPostContent(post.content)
    setSelectedTags(post.tags || [])
  }, [post.content, post.tags])
  
  const addTag = (t: string) => {
    const tag = String(t || '').trim().toLowerCase()
    if (!tag) return
    setSelectedTags(prev => Array.from(new Set([...(prev || []), tag])))
  }
  
  const removeTag = (t: string) => setSelectedTags(prev => (prev || []).filter(x => x !== t))

  const suggestTagsFromServer = async () => {
    if (!editPostContent.trim()) return
    try {
      setIsSuggestingTags(true)
      const adminServer = (import.meta.env.VITE_ADMIN_SERVER_URL as string) || 'http://localhost:4000'
      const res = await fetch(`${adminServer}/admin/autotag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': (currentUser && currentUser.id) || '' },
        body: JSON.stringify({ content: editPostContent, maxTags: 6 })
      })
      const json = await res.json()
      const tags = Array.isArray(json?.tags) ? json.tags : []
      setSuggestedTags(tags)
      setSelectedTags(prev => Array.from(new Set([...(prev || []), ...tags.map((t: unknown) => String(t).toLowerCase())])))
    } catch (err) {
      console.error('suggestTagsFromServer failed', err)
      try { toast.error('Tag suggestion failed') } catch (e) { console.error(e) }
    } finally {
      setIsSuggestingTags(false)
    }
  }

  const formatTime = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }, [])

  const handleAddComment = useCallback(() => {
    if (commentContent.trim()) {
      addComment(post.id, commentContent)
      setCommentContent('')
    }
  }, [addComment, post.id, commentContent])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }, [handleAddComment])

  const handleEditPost = useCallback(() => {
    if (!editPostContent.trim()) return

    const contentChanged = editPostContent !== post.content
    const prevTags = post.tags || []
    const tagsChanged = JSON.stringify((selectedTags || []).slice().sort()) !== JSON.stringify((prevTags || []).slice().sort())

    if (contentChanged || tagsChanged) {
      editPost(post.id, editPostContent, selectedTags)
    }
    setIsEditingPost(false)
  }, [editPost, post.id, editPostContent, post.content, selectedTags, post.tags])

  const handleDeletePost = useCallback(() => {
    // Use modal confirmation instead of window.confirm. This function toggles the dialog.
    setShowDeleteConfirm(true)
  }, [])

  const handleUserClick = useCallback((user: MentionableUser | User) => {
    // Normalize MentionableUser -> User by looking up the full user record if available
    let fullUser: User | undefined = undefined
    if ((user as User).id) {
      fullUser = users.find(u => u.id === (user as User).id)
    }
    if (!fullUser) {
      // Create a minimal User object from MentionableUser
      const mention = user as MentionableUser
      fullUser = { id: mention.id, name: mention.name, email: '', avatar: mention.avatar || '', bio: '', joinedAt: Date.now(), following: [], followers: [], karma: 0, karmaHistory: [], achievements: [], status: 'offline' }
    }
    setViewingUserProfile(fullUser)
  }, [setViewingUserProfile, users])

  const getTotalCommentCount = useCallback((comments: Comment[]): number => {
    return comments.reduce((count, comment) => {
      return count + 1 + (comment.replies ? getTotalCommentCount(comment.replies) : 0)
    }, 0)
  }, [])
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                  onClick={() => {
                    const targetUser = postUser || (post.userId === currentUser?.id ? currentUser : null)
                    if (targetUser) {
                      handleUserClick(targetUser)
                    }
                  }}>
            <AvatarImage src={post.userAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {(displayUserName || '').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors" 
                  onClick={() => {
                    const targetUser = postUser || (post.userId === currentUser?.id ? currentUser : null)
                    if (targetUser) {
                      handleUserClick(targetUser)
                    }
                  }}>
                {displayUserName || 'Unknown'}
                {unsyncedIds.has(post.id) && (
                  <Badge variant="destructive" className="text-[10px] ml-2">Unsynced</Badge>
                )}
              </h3>
              {canFollow && (
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  className="h-6 px-2 text-xs relative z-10"
                  onPointerDown={(e) => { e.stopPropagation() }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isFollowing) {
                      unfollowUser(post.userId)
                    } else {
                      followUser(post.userId)
                    }
                  }}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-3 w-3 mr-1" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{formatTime(post.timestamp)}</p>
              {postGroup && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {postGroup.name}
                  </Badge>
                </>
              )}
            </div>
          </div>
          {isPostOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <DotsThreeVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => setIsEditingPost(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
              {/* Delete confirmation modal */}
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-white" onClick={() => { deletePost(post.id); setShowDeleteConfirm(false); }}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEditingPost ? (
          <div className="space-y-3 mb-4">
            <Textarea
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
            {/* Tag autotagging + manual tag editor */}
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={suggestTagsFromServer} disabled={isSuggestingTags || !editPostContent.trim()}>
                {isSuggestingTags ? 'Suggesting…' : 'Suggest tags'}
              </Button>
              <div className="text-sm text-muted-foreground">Or add tags manually below</div>
            </div>

            <div className="flex gap-2 flex-wrap mt-2">
              {(selectedTags || []).map(tag => (
                <button key={tag} type="button" className="px-2 py-1 bg-muted rounded text-xs flex items-center gap-2" onClick={() => removeTag(tag)}>
                  <span>{tag}</span>
                  <span className="text-muted-foreground">✕</span>
                </button>
              ))}
            </div>

            {suggestedTags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">AI suggested tags</p>
                <div className="flex gap-2 flex-wrap">
                  {suggestedTags.map(tag => (
                    <button key={tag} type="button" onClick={() => addTag(tag)} className="px-2 py-1 bg-outline rounded text-xs">{tag}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 items-center mt-2">
              <input
                value={tagInputValue}
                onChange={(e) => setTagInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInputValue.trim()) {
                    e.preventDefault()
                    addTag(tagInputValue)
                    setTagInputValue('')
                  }
                }}
                placeholder="Add a tag and press Enter"
                className="input input-sm flex-1"
              />
              <Button size="sm" onClick={() => { if (tagInputValue.trim()) { addTag(tagInputValue); setTagInputValue('') }}}>Add</Button>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditPost} disabled={!editPostContent.trim()}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setIsEditingPost(false); setEditPostContent(post.content); setSelectedTags(post.tags || []) }}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to save, Escape to cancel
            </p>
          </div>
        ) : (
           <div className="space-y-3 mb-4">
             <div className="text-sm leading-relaxed">
               {renderContentWithMentions(post.content, allMentionableUsers, handleUserClick)}
             </div>
            
            {/* Post Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Hash className="h-2 w-2 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Post Type Badge */}
            {post.type === 'professional' && (
              <Badge variant="secondary" className="text-xs w-fit">
                <Briefcase className="h-3 w-3 mr-1" />
                Professional
              </Badge>
            )}
            
            {/* Edit Indicator */}
            {post.editedAt && (
              <p className="text-xs text-muted-foreground">
                Edited {formatTime(post.editedAt)}
              </p>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 gap-2 ${
              currentUser?.id && (post.likes || []).includes(currentUser.id) 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => toggleLike(post.id)}
            disabled={isEditingPost}
          >
            <Heart 
              className="h-4 w-4" 
              weight={currentUser?.id && (post.likes || []).includes(currentUser.id) ? 'fill' : 'regular'} 
            />
            <span className="text-xs">{(post.likes || []).length}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 gap-2 ${
               showComments 
                 ? 'text-primary hover:text-primary/80' 
                 : 'text-muted-foreground hover:text-foreground'
             }`}
             onClick={() => setShowComments(!showComments)}
             disabled={isEditingPost}
           >
             <ChatCircle 
               className="h-4 w-4" 
               weight={showComments ? 'fill' : 'regular'} 
             />
            <span className="text-xs">{getTotalCommentCount(post.comments || [])}</span>
          </Button>
        </div>

        {/* Comments Section */}
        {!isEditingPost && showComments && (
          <div className="space-y-3">
            <Separator />
            
            {/* Comment Input */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {currentUser?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <MentionInput
                  placeholder="Write a comment..."
                  value={commentContent}
                  onChange={setCommentContent}
                  onKeyPress={handleKeyPress}
                  className="text-sm"
                  users={allMentionableUsers}
                  currentUserId={currentUser?.id}
                />
                <Button 
                  onClick={handleAddComment}
                  size="sm" 
                  disabled={!commentContent.trim()}
                  className="px-3"
                >
                  <PaperPlaneRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {(post.comments || []).length > 0 && (
              <div className="space-y-3">
                {(post.comments || []).map((comment) => (
                  <div key={comment.id} className="group">
                    <CommentItem 
                      comment={comment}
                      depth={0}
                      postId={post.id}
                      currentUser={currentUser}
                      allMentionableUsers={allMentionableUsers}
                      onAddComment={addComment}
                      onEditComment={editComment}
                      onDeleteComment={deleteComment}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})