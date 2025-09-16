import React from 'react';
import { useState } from 'react'
import { ArrowLeft, Lock, Globe, Crown, Shield, Calendar, Plus, ChatCircle, Heart, DotsThreeVertical, Trash, Pencil, PaperPlaneRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { MentionInput } from '@/components/MentionInput'
import { renderContentWithMentions } from '@/components/MentionRenderer'
import type { MentionableUser } from '@/lib/mentions'
import { extractMentionedUserIds } from '@/lib/mentions'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'

interface Post {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  timestamp: number
  likes: string[]
  comments: Comment[]
  groupId?: string
  editedAt?: number
}

interface Comment {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
  parentId?: string
  replies?: Comment[]
  mentions?: string[]
}

interface GroupMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: number
}

interface Group {
  id: string
  name: string
  description: string
  members: GroupMember[]
  postCount: number
  createdAt: number
  createdBy: string
  privacy: 'public' | 'private'
  avatar?: string
}

interface User {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  joinedAt: number
  following?: string[]
  followers?: string[]
}

interface GroupPageProps {
  group: Group
  posts: Post[]
  users: User[]
  currentUser: User
  onBack: () => void
  onJoinGroup: (groupId: string) => void
  onLeaveGroup: (groupId: string) => void
  onCreatePost: (content: string, groupId: string) => void
  onToggleLike: (postId: string) => void
  onAddComment: (postId: string, content: string, parentId?: string) => void
  onEditComment: (postId: string, commentId: string, newContent: string) => void
  onDeleteComment: (postId: string, commentId: string) => void
  onEditPost: (postId: string, newContent: string) => void
  onDeletePost: (postId: string) => void
  onUpdateGroup: (updatedGroup: Group) => void
  onDeleteGroup: (groupId: string) => void
  onFollowUser: (userId: string) => void
  onUnfollowUser: (userId: string) => void
}

export function GroupPage({
  group,
  posts,
  users,
  currentUser,
  onBack,
  onJoinGroup,
  onLeaveGroup,
  onCreatePost,
  onToggleLike,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onEditPost,
  onDeletePost,
  onUpdateGroup: _onUpdateGroup,
  onDeleteGroup: _onDeleteGroup,
  onFollowUser: _onFollowUser,
  onUnfollowUser: _onUnfollowUser
}: GroupPageProps) {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  // Reference optional handlers to avoid unused-variable compiler errors when they are not needed here
  void _onUpdateGroup; void _onDeleteGroup; void _onFollowUser; void _onUnfollowUser;

  // Get current user's membership status
  const userMembership = Array.isArray(group.members) ? group.members.find(m => m.userId === currentUser.id) : undefined
  const isMember = !!userMembership
  const isOwner = userMembership?.role === 'owner'
  const isAdmin = userMembership?.role === 'admin' || isOwner
  
  // Get group posts sorted by timestamp
  const groupPosts = posts
    .filter(post => post.groupId === group.id)
    .sort((a, b) => b.timestamp - a.timestamp)
  
  // Get all mentionable users (group members + current user)
  const memberIds = new Set((group.members || []).map(m => m.userId))
  const allMentionableUsers: MentionableUser[] = [
    ...users.filter(u => memberIds.has(u.id)).map(u => ({ id: u.id, name: u.name, avatar: u.avatar })),
    { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
  ]
  
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }
  
  const getRoleIcon = (role: 'owner' | 'admin' | 'member') => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-500" />
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />
      default:
        return null
    }
  }
  
  const getRoleBadge = (role: 'owner' | 'admin' | 'member') => {
    const colors = {
      owner: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      admin: 'bg-blue-100 text-blue-800 border-blue-200',
      member: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    return (
      <Badge variant="outline" className={`text-xs ${colors[role]}`}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </Badge>
    )
  }
  
  const handleCreatePost = () => {
    if (!newPostContent.trim()) return
    
    // Extract mentioned user IDs from content
    const mentionedUserIds = extractMentionedUserIds(newPostContent, allMentionableUsers)
    
    onCreatePost(newPostContent.trim(), group.id)
    
    // Notify mentioned users
    if (mentionedUserIds.length > 0) {
      const mentionedNames = mentionedUserIds
        .map(id => allMentionableUsers.find(u => u.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      
      if (mentionedNames) {
        toast.success(`Mentioned ${mentionedNames} in your post`)
      }
    }
    
    setNewPostContent('')
    setIsCreatePostOpen(false)
  }
  
  const handleJoinGroup = () => {
    if (group.privacy === 'private') {
      toast.error('This is a private group. You need an invitation to join.')
      return
    }
    onJoinGroup(group.id)
  }
  
  // Post component with all functionality
  const PostCard = ({ post }: { post: Post }) => {
    const [showComments, setShowComments] = useState(false)
    const [commentContent, setCommentContent] = useState('')
    const [isEditingPost, setIsEditingPost] = useState(false)
    const [editPostContent, setEditPostContent] = useState(post.content)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const isPostOwner = post.userId === currentUser.id
    
    const handleAddComment = () => {
      onAddComment(post.id, commentContent)
      setCommentContent('')
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleAddComment()
      }
    }

    const handleEditPost = () => {
      if (editPostContent.trim() && editPostContent !== post.content) {
        onEditPost(post.id, editPostContent)
      }
      setIsEditingPost(false)
    }

    const handleEditPostKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        handleEditPost()
      } else if (e.key === 'Escape') {
        setEditPostContent(post.content)
        setIsEditingPost(false)
      }
    }

    const handleDeletePost = () => { setShowDeleteConfirm(true) }

    const handleCancelEditPost = () => {
      setEditPostContent(post.content)
      setIsEditingPost(false)
    }

    // Calculate total comment count including replies
    const getTotalCommentCount = (comments: Comment[]): number => {
      return comments.reduce((count, comment) => {
        return count + 1 + (comment.replies ? getTotalCommentCount(comment.replies) : 0)
      }, 0)
    }

    // Recursive component for rendering comments with replies
    const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
      const [showReplyInput, setShowReplyInput] = useState(false)
      const [replyContent, setReplyContent] = useState('')
      const [showReplies, setShowReplies] = useState(true)
      const [isEditing, setIsEditing] = useState(false)
      const [editContent, setEditContent] = useState(comment.content)
      
      const handleAddReply = () => {
        onAddComment(post.id, replyContent, comment.id)
        setReplyContent('')
        setShowReplyInput(false)
      }

      const handleReplyKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleAddReply()
        }
      }

      const handleEdit = () => {
        if (editContent.trim() && editContent !== comment.content) {
          onEditComment(post.id, comment.id, editContent)
        }
        setIsEditing(false)
      }

      const handleEditKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleEdit()
        } else if (e.key === 'Escape') {
          setEditContent(comment.content)
          setIsEditing(false)
        }
      }

      const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
          onDeleteComment(post.id, comment.id)
        }
      }

      const handleCancelEdit = () => {
        setEditContent(comment.content)
        setIsEditing(false)
      }

      const hasReplies = comment.replies && comment.replies.length > 0
      const maxDepth = 3
      const isCommentOwner = comment.userId === currentUser.id

      return (
        <div className={`${depth > 0 ? 'ml-8 mt-3' : ''}`}>
          <div className="flex gap-3">
            <Avatar className={`${depth === 0 ? 'h-7 w-7' : 'h-6 w-6'} flex-shrink-0`}>
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
                      {formatTime(comment.timestamp)}
                    </span>
                  </div>
                  {isCommentOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <DotsThreeVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Pencil className="mr-2 h-3 w-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                          <Trash className="mr-2 h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <MentionInput
                      value={editContent}
                      onChange={setEditContent}
                      onKeyPress={handleEditKeyPress}
                      className="text-sm"
                      users={allMentionableUsers}
                      currentUserId={currentUser.id}
                      multiline
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleEdit} disabled={!editContent.trim()}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed break-words">
                    {renderContentWithMentions(comment.content, allMentionableUsers)}
                  </div>
                )}
              </div>
              
              {/* Reply button and reply count */}
              <div className="flex items-center gap-4 mt-2 ml-3">
                {depth < maxDepth && !isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowReplyInput(!showReplyInput)}
                  >
                    Reply
                  </Button>
                )}
                {hasReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowReplies(!showReplies)}
                  >
                    {showReplies ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                  </Button>
                )}
              </div>

              {/* Reply input */}
              {showReplyInput && !isEditing && (
                <div className="mt-3 ml-3">
                  <div className="flex gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <MentionInput
                        placeholder={`Reply to ${comment.userName}...`}
                        value={replyContent}
                        onChange={setReplyContent}
                        onKeyPress={handleReplyKeyPress}
                        className="text-sm h-8"
                        users={allMentionableUsers}
                        currentUserId={currentUser.id}
                      />
                      <Button 
                        size="sm" 
                        onClick={handleAddReply}
                        disabled={!replyContent.trim()}
                        className="px-3 h-8"
                      >
                        <PaperPlaneRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground mt-2 ml-8"
                    onClick={() => {
                      setShowReplyInput(false)
                      setReplyContent('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Nested replies */}
              {hasReplies && showReplies && (
                <div className="mt-3">
                  {comment.replies!.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.userAvatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {post.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{post.userName}</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{formatTime(post.timestamp)}</p>
                {post.editedAt && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">edited</span>
                  </>
                )}
              </div>
            </div>
            {(isPostOwner || isAdmin) && (
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
                  {isPostOwner && (
                    <DropdownMenuItem onClick={() => setIsEditingPost(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {(isPostOwner || isAdmin) && (
                    <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete post</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure you want to delete this post? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-white" onClick={() => { onDeletePost(post.id); setShowDeleteConfirm(false); toast.success('Post deleted') }}>
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
                onKeyDown={handleEditPostKeyPress}
                className="min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEditPost} disabled={!editPostContent.trim()}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEditPost}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to save, Escape to cancel
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed mb-4">{post.content}</p>
          )}
          
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 gap-2 ${
                (post.likes || []).includes(currentUser.id) 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onToggleLike(post.id)}
              disabled={isEditingPost}
            >
              <Heart 
                className="h-4 w-4" 
                weight={(post.likes || []).includes(currentUser.id) ? 'fill' : 'regular'} 
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
          {!isEditingPost && (
            <>
              {showComments && (
                <div className="space-y-3">
                  <Separator />
                  
                  {/* Comment Input */}
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {currentUser.name.charAt(0).toUpperCase()}
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
                        currentUserId={currentUser.id}
                      />
                      <Button 
                        size="sm" 
                        onClick={handleAddComment}
                        disabled={!commentContent.trim()}
                        className="px-3"
                      >
                        <PaperPlaneRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  {post.comments.length > 0 && (
                    <div className="space-y-3">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="group">
                          <CommentItem comment={comment} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-primary">{group.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {group.privacy === 'private' ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                <span>{group.privacy === 'private' ? 'Private' : 'Public'} Group</span>
                <span>•</span>
                <span>{(group.members || []).length} members</span>
              </div>
            </div>
            {isMember && (
              <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Post
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Post in {group.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePost} disabled={!newPostContent.trim()}>
                        Post
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Group Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <div className="text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarImage src={group.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {group.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold mb-2">{group.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
                  
                  {!isMember ? (
                    <Button onClick={handleJoinGroup} className="w-full mb-4">
                      Join Group
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => onLeaveGroup(group.id)}
                      className="w-full mb-4"
                    >
                      Leave Group
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Group Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">{group.members.length}</div>
                      <div className="text-sm text-muted-foreground">Members</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{groupPosts.length}</div>
                      <div className="text-sm text-muted-foreground">Posts</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Group Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created {new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {group.privacy === 'private' ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-muted-foreground capitalize">{group.privacy} group</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Members List */}
                  <div>
                    <h3 className="font-medium mb-3">Members</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(group.members || []).map(member => {
                         const memberUser = users.find(u => u.id === member.userId) || 
                           (member.userId === currentUser.id ? currentUser : null)
                        if (!memberUser) return null
                        
                        return (
                          <div key={member.userId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={memberUser.avatar} />
                              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                {memberUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{memberUser.name}</span>
                                {getRoleBadge(member.role)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Posts Feed */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {!isMember && group.privacy === 'private' ? (
                <Card className="p-8 text-center">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Private Group</h3>
                  <p className="text-muted-foreground">
                    This is a private group. You need to be a member to see posts.
                  </p>
                </Card>
              ) : groupPosts.length === 0 ? (
                <Card className="p-8 text-center">
                  <ChatCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Posts Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {isMember 
                      ? "Be the first to post in this group!"
                      : "This group doesn't have any posts yet."
                    }
                  </p>
                  {isMember && (
                    <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                      <DialogTrigger asChild>
                        <Button>Create First Post</Button>
                      </DialogTrigger>
                    </Dialog>
                  )}
                </Card>
              ) : (
                groupPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}