import React from 'react';
import { useState } from 'react'
import { Plus, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Hash } from '@phosphor-icons/react'
import { config, appConfig, isDevelopment } from '@/lib/config'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User as UserIcon, PencilSimple, Gear, SignOut } from '@phosphor-icons/react'
import type { User, Group } from '@/types'
import { toast } from 'sonner'

interface HeaderProps {
  currentUser: User
  newPostContent: string
  setNewPostContent: React.Dispatch<React.SetStateAction<string>>
  selectedGroupForPost: string
  setSelectedGroupForPost: (groupId: string) => void
  isCreatePostOpen: boolean
  setIsCreatePostOpen: (open: boolean) => void
  userGroups: Group[]
  createPost: (tags?: string[]) => void
  setIsSearchOpen: (open: boolean) => void
  setActiveTab: (tab: string) => void
  setIsEditProfileOpen: (open: boolean) => void
  setShowSettings: (show: boolean) => void
  handleLogout: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  newPostContent,
  setNewPostContent,
  selectedGroupForPost,
  setSelectedGroupForPost,
  isCreatePostOpen,
  setIsCreatePostOpen,
  userGroups,
  createPost,
  setIsSearchOpen,
  setActiveTab,
  setIsEditProfileOpen,
  setShowSettings,
  handleLogout
}) => {
  // Smart admin server URL + autotag provider
  const adminServer = (import.meta.env.VITE_ADMIN_SERVER_URL as string) || 'http://localhost:4000'
  const autotagProvider = (import.meta.env.VITE_AUTOTAG_PROVIDER as string) || ''

  // Tagging states for in-place tag editor
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSuggestingTags, setIsSuggestingTags] = useState(false)
  const [tagInputValue, setTagInputValue] = useState('')
  const [adminReachable, setAdminReachable] = useState<boolean | null>(null)
  const [, setAdminStatus] = useState<'unknown' | 'running' | 'not-running'>('unknown')
  const [isRewriting, setIsRewriting] = useState(false)

  // Check admin server reachability only when autotag provider is set to Foundry
  // Track admin server status (running/not-running) for menu logic
  React.useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setAdminReachable(null)
    setAdminStatus('unknown')
    fetch(`${adminServer}/admin/status`, {
      method: 'GET',
      headers: { 'x-user-id': (currentUser && currentUser.id) || '' },
      signal: controller.signal
    })
      .then((resp) => resp.json())
      .then((json) => {
        if (!cancelled) setAdminReachable(json && json.ok && json.status === 'running')
        if (!cancelled) setAdminStatus(json && json.ok && json.status === 'running' ? 'running' : 'not-running')
      })
      .catch(() => {
        if (!cancelled) setAdminReachable(false)
        if (!cancelled) setAdminStatus('not-running')
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [adminServer, currentUser])

  // utility: add tag to selectedTags (lowercase normalized)
  const addTag = (t: string) => {
    const tag = String(t || '').trim()
    if (!tag) return
    setSelectedTags(prev => {
      const merged = Array.from(new Set([...(prev || []), tag.toLowerCase()]));
      return merged;
    })
  }

  const removeTag = (t: string) => setSelectedTags(prev => (prev || []).filter(x => x !== t))

  const suggestTagsFromServer = async () => {
    if (!newPostContent.trim()) return
    try {
      setIsSuggestingTags(true)
      const res = await fetch(`${adminServer}/admin/autotag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': (currentUser && currentUser.id) || '' },
        body: JSON.stringify({ content: newPostContent, maxTags: 6 })
      })
      const json = await res.json()
      const tags = Array.isArray(json?.tags) ? json.tags : []
      setSuggestedTags(tags)
      // optionally pre-select suggested tags
      setSelectedTags(prev => Array.from(new Set([...(prev || []), ...tags.map((t:string)=>String(t).toLowerCase())])))
    } catch (err) {
      console.error('suggestTagsFromServer failed', err)
    } finally {
      setIsSuggestingTags(false)
    }
  }

  const rewriteWithAI = async (style = 'concise') => {
    if (!newPostContent.trim()) return
    try {
      setIsRewriting(true)
      const res = await fetch(`${adminServer}/admin/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': (currentUser && currentUser.id) || '' },
        body: JSON.stringify({ content: newPostContent, style })
      })
      if (!res.ok) {
        const text = await res.text()
        toast.error('Rewrite failed: ' + (text || res.status))
        return
      }
      const json = await res.json()
      const rewritten = json?.rewritten || ''
      if (rewritten && rewritten.trim()) {
        setNewPostContent(rewritten)
        toast.success('Post rewritten by AI')
      } else {
        toast.error('Rewrite returned empty result')
      }
    } catch (err) {
      console.error('rewriteWithAI failed', err)
      toast.error('Rewrite failed — check admin server or AOAI config')
    } finally {
      setIsRewriting(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <div className="relative flex items-center">
              <span className="text-lg font-bold">E</span>
              <div className="relative ml-1">
                <div className="border-2 border-primary rounded w-8 h-6 flex items-center justify-center">
                  <span className="text-lg font-bold">IQ</span>
                </div>
              </div>
            </div>
            {appConfig.name}
            {isDevelopment && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                DEV
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setIsSearchOpen(true)}
              title="Search (Ctrl+K)"
            >
              <MagnifyingGlass className="h-4 w-4" />
              Search
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-70">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            
            {/* Database Provider Indicator */}
            {isDevelopment && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                DB: {config.database.provider.toUpperCase()}
              </div>
            )}
            
            <Dialog open={isCreatePostOpen} onOpenChange={(open: boolean) => {
              setIsCreatePostOpen(open)
              if (!open) {
                setNewPostContent('')
                setSelectedGroupForPost('timeline')
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  
                  {/* Suggest tags button and suggestions */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={suggestTagsFromServer} disabled={isSuggestingTags || !newPostContent.trim()}>
                      {isSuggestingTags ? 'Suggesting…' : 'Suggest tags'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => rewriteWithAI('concise')} disabled={!newPostContent.trim() || isRewriting}>
                      {isRewriting ? 'Rewriting…' : 'Rewrite with AI'}
                    </Button>
                    {((autotagProvider || '').toUpperCase() === 'FOUNDRY') && adminReachable === false && Array.isArray(currentUser?.roles) && currentUser.roles.includes('engageiq_admin') && (
                      <span className="text-xs text-destructive ml-2" title="Admin autotag server not reachable. Start it (npm run start:admin) or set VITE_ADMIN_SERVER_URL">
                        Autotag server unreachable
                      </span>
                    )}
                    <div className="text-sm text-muted-foreground">Or add tags manually below</div>
                  </div>
                  
                  {/* Selected tags (editable) */}
                  <div className="flex gap-2 flex-wrap">
                    {(selectedTags || []).map(tag => (
                      <button key={tag} type="button" className="px-2 py-1 bg-muted rounded text-xs flex items-center gap-2" onClick={() => removeTag(tag)}>
                        <span>{tag}</span>
                        <span className="text-muted-foreground">✕</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Suggested tags (quick add) */}
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
                  
                  {/* Manual tag input */}
                  <div className="flex gap-2 items-center">
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
                    <Button size="sm" onClick={() => { if (tagInputValue.trim()) {addTag(tagInputValue); setTagInputValue('')} }}>Add</Button>
                  </div>
                  
                  {/* Topic suggestions based on content */}
                  {(() => {
                    if (!newPostContent.trim()) return null
                    
                    const userTopics = currentUser?.interestedTopics || []
                    const suggestedTags: string[] = []
                    
                    // Simple keyword matching for topic suggestions
                    const content = newPostContent.toLowerCase()
                    userTopics.forEach(topic => {
                      const topicWords = topic.toLowerCase().split(/[\s&]+/)
                      if (topicWords.some(word => content.includes(word))) {
                        suggestedTags.push(topic)
                      }
                    })
                    
                    if (suggestedTags.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Suggested topics for your post:</p>
                          <div className="flex gap-2 flex-wrap">
                            {suggestedTags.slice(0, 3).map(tag => (
                              <Button
                                key={tag}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  const hashtag = `#${tag.replace(/\s+/g, '')}`
                                  if (!newPostContent.includes(hashtag)) {
                                    setNewPostContent(prev => prev + ` ${hashtag}`)
                                  }
                                }}
                              >
                                <Hash className="h-3 w-3 mr-1" />
                                {tag}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                  
                  {userGroups.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Post to group (optional)</label>
                      <Select value={selectedGroupForPost} onValueChange={setSelectedGroupForPost}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="timeline">Your timeline</SelectItem>
                          {userGroups.map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsCreatePostOpen(false); setSelectedTags([]); setSuggestedTags([]); setTagInputValue('') }}>
                      Cancel
                    </Button>
                    <Button onClick={() => { createPost(selectedTags); setSelectedTags([]); setSuggestedTags([]); }} disabled={!newPostContent.trim()}>
                      Post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center space-x-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}>
                  <PencilSimple className="mr-2 h-4 w-4" />
                  Edit Profile / Photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Gear className="mr-2 h-4 w-4" />
                  App Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Array.isArray(currentUser?.roles) && currentUser.roles.includes('engageiq_admin') && (
                  <>
                    <DropdownMenuItem onClick={async () => {
                      try {
                        const resp = await fetch(`${adminServer}/admin/status`, {
                          method: 'GET',
                          headers: { 'x-user-id': (currentUser && currentUser.id) || '' }
                        })
                        const json = await resp.json()
                        if (json.ok && json.status === 'running') {
                          toast.success(`Admin server is running (pid: ${json.pid})`)
                          setAdminStatus('running')
                        } else {
                          toast.error('Admin server not running')
                          setAdminStatus('not-running')
                        }
                      } catch {
                        toast.error('Failed to check admin server status')
                        setAdminStatus('unknown')
                      }
                    }}>
                      Check Admin Server Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      try {
                        const resp = await fetch(`${adminServer}/admin/stop`, {
                          method: 'POST',
                          headers: { 'x-user-id': (currentUser && currentUser.id) || '' }
                        })
                        const json = await resp.json()
                        if (json.ok && json.stopped) {
                          toast.success('Admin server stopped')
                          setAdminStatus('not-running')
                        } else {
                          toast.error('Failed to stop admin server: ' + (json.error || 'Unknown error'))
                        }
                      } catch {
                        toast.error('Failed to stop admin server')
                      }
                    }}>
                      Stop Admin Server
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => {
                  // Diagnostic: show toast and log
                  toast.info('Logout called: clearing session and reloading')
                  console.log('Logout called: clearing session and reloading')
                  try {
                    sessionStorage.clear()
                    localStorage.clear()
                    // Clear cookies (best effort)
                    document.cookie.split(';').forEach(function(c) {
                      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                    })
                  } catch (e) {
                    console.error('Error clearing session/localStorage/cookies', e)
                  }
                  if (typeof handleLogout === 'function') handleLogout()
                  setTimeout(() => { window.location.reload() }, 300)
                }} className="text-destructive">
                  <SignOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}