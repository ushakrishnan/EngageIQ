import { useEffect, useState, useCallback, useMemo } from 'react'
import MessageCenter from './MessageCenter'
import { Button } from '@/components/ui/button'
import type { User } from '@/types'

export default function MessagesPanel({ currentUser, users, isAdmin }: { currentUser: { id: string; name: string } | null, users?: User[], isAdmin?: boolean }) {
  const [minimized, setMinimized] = useState<boolean>(() => {
    try { return typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('engageiq:messages-minimized') === '1' } catch { return false }
  })

  const [count, setCount] = useState<number>(0)
  type MessageRaw = { id: string; from: string; to: string; content: string; createdAt?: number }
  const [messagesRaw, setMessagesRaw] = useState<MessageRaw[]>([])
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(null)

  const [selectedUser, setSelectedUser] = useState<User | null>(() => {
    try {
      return isAdmin ? null : (currentUser as User | null)
    } catch { return null }
  })

  const adminUrl = (import.meta.env.VITE_ADMIN_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '')

  const fetchPreview = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setCount(0)
      setMessagesRaw([])
      return
    }
    try {
      // fetch a larger window so we can build conversation list client-side
      const resp = await fetch(`${adminUrl}/api/messages?limit=50`, { headers: { 'x-user-id': currentUser.id } })
      if (!resp.ok) { setCount(0); setMessagesRaw([]); return }
      const j = await resp.json()
      if (j && Array.isArray(j.messages)) {
        const msgs = j.messages.map((m: unknown) => {
          const mm = m as Record<string, unknown>
          return {
            id: String(mm.id ?? ''),
            from: String(mm.from ?? ''),
            to: String(mm.to ?? ''),
            content: String(mm.content ?? ''),
            createdAt: Number((mm.createdAt as number) ?? Date.now())
          } as MessageRaw
        })
        setMessagesRaw(msgs)
        setCount((Array.isArray(j.messages) ? j.messages.length : 0) || 0)
      } else {
        setCount(0); setMessagesRaw([])
      }
    } catch {
      // silently ignore — best-effort preview
      setCount(0); setMessagesRaw([])
    }
  }, [adminUrl, currentUser])

  const [newComposeMode, setNewComposeMode] = useState<boolean>(false)
  const [recipientFilter, setRecipientFilter] = useState<string>('')

  useEffect(() => {
    // initial fetch and periodic refresh
    fetchPreview()
    const id = setInterval(fetchPreview, 30_000)
    return () => clearInterval(id)
  }, [fetchPreview])

  // build conversations from fetched messages (group by the other participant)
  const conversations = useMemo(() => {
    if (!currentUser || !currentUser.id) return [] as Array<{ otherId: string; lastMessage: MessageRaw; unread?: number }>
    const map = new Map<string, { otherId: string; lastMessage: MessageRaw; unread: number }>()
    messagesRaw.slice().sort((a,b) => (b.createdAt||0) - (a.createdAt||0)).forEach(m => {
      const otherId = m.from === currentUser.id ? m.to : m.from
      if (!otherId) return
      if (!map.has(otherId)) {
        map.set(otherId, { otherId, lastMessage: m, unread: 0 })
      }
      const cur = map.get(otherId)!
      if (m.from !== currentUser.id) cur.unread = (cur.unread || 0) + 1
    })
    let list = Array.from(map.values())
    const q = (recipientFilter || '').trim().toLowerCase()
    if (q) {
      list = list.filter(c => {
        const u = (users || []).find(u => u.id === c.otherId)
        const name = u?.name || ''
        const handle = (u && (u.handle || '')) || ''
        return name.toLowerCase().includes(q) || handle.toLowerCase().includes(q) || c.otherId.toLowerCase().includes(q)
      })
    }
    return list
  }, [messagesRaw, currentUser, recipientFilter, users])

  // Listen for global open event from header to un-minimize and select current user
  useEffect(() => {
    const handler = () => {
      try {
        setMinimized(false)
        if (!isAdmin && currentUser) setSelectedUser(currentUser as User)
      } catch { /* ignore */ }
    }
    window.addEventListener('engageiq:open-messages', handler)
    return () => { window.removeEventListener('engageiq:open-messages', handler) }
  }, [isAdmin, currentUser])

  useEffect(() => {
    try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem('engageiq:messages-minimized', minimized ? '1' : '0') } catch { void 0 }
  }, [minimized])

  // If minimized: show pill with count to re-open
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setMinimized(false)} className="px-3 py-1 rounded bg-card border border-border text-sm shadow flex items-center gap-2">
            <span>Messages</span>
            {count > 0 && <span className="inline-flex items-center justify-center rounded-full bg-destructive text-white text-[10px] px-2">{count}</span>}
          </button>
        </div>
      </div>
    )
  }

  // Render the full panel (always present unless minimized)
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[560px] max-h-[70vh] overflow-y-auto bg-card border border-border p-3 rounded shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Messages</div>
        <div className="flex gap-2 items-center">
          {!newComposeMode && (
            <>
              <div className="text-xs text-muted-foreground">{count} recent</div>
              <input
                className="text-xs px-2 py-1 border rounded"
                placeholder="filter recipients"
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
              />
            </>
          )}
          {!newComposeMode ? (
            <Button size="sm" variant="default" onClick={() => setNewComposeMode(true)}>New</Button>
          ) : (
            <Button size="sm" variant="default" onClick={() => setNewComposeMode(false)}>Message Center</Button>
          )}
          {/* Minimize as icon and keep it visually the right-most control */}
          <Button size="sm" variant="ghost" onClick={() => { setMinimized(true); try { localStorage.setItem('engageiq:messages-minimized', '1') } catch { /* ignore */ } }} aria-label="Minimize messages">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Button>
        </div>
      </div>

      <div>
        {isAdmin && Array.isArray(users) ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 max-h-[62vh] overflow-y-auto bg-card p-1 border border-border rounded">
              <div className="text-sm font-medium mb-2">All Users</div>
              {users.map(u => (
                <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full text-left p-2 rounded hover:bg-accent ${selectedUser?.id === u.id ? 'bg-accent' : ''}`}>
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground">@{(u.handle || u.name.replace(/\s+/g,'').toLowerCase())}</div>
                </button>
              ))}
            </div>
            <div className="col-span-2">
              {selectedUser ? (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Viewing messages for {selectedUser.name}</div>
                  <MessageCenter currentUser={{ id: selectedUser.id, name: selectedUser.name }} users={users} openComposer={newComposeMode} onExitCompose={() => setNewComposeMode(false)} composeOnly={newComposeMode} />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Select a user to view their messages</div>
              )}
            </div>
          </div>
        ) : currentUser ? (
          newComposeMode ? (
            <div>
              <MessageCenter currentUser={currentUser!} users={users} openComposer={newComposeMode} onExitCompose={() => setNewComposeMode(false)} composeOnly={true} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 max-h-[62vh] overflow-y-auto bg-card p-1 border border-border rounded">
                <div className="text-sm font-medium mb-2">Conversations</div>
                {conversations.length === 0 && (
                  <div className="text-xs text-muted-foreground">No conversations yet</div>
                )}
                {conversations.map(c => {
                  const other = (users || []).find(u => u.id === c.otherId)
                  const title = other ? other.name : c.otherId
                  return (
                    <button key={c.otherId} onClick={() => setSelectedOtherUserId(c.otherId)} className={`w-full text-left p-2 rounded hover:bg-accent ${selectedOtherUserId === c.otherId ? 'bg-accent' : ''}`}>
                      <div className="text-sm font-medium truncate">{title}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">{c.lastMessage.content.slice(0,120)}</div>
                      {(c.unread || 0) > 0 && <div className="inline-flex items-center justify-center rounded-full bg-destructive text-white text-[10px] px-2 float-right">{c.unread}</div>}
                    </button>
                  )
                })}
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-2">{selectedOtherUserId ? `Conversation with ${((users||[]).find(u=>u.id===selectedOtherUserId)?.name) || selectedOtherUserId}` : 'Select a conversation'}</div>
                <MessageCenter currentUser={currentUser!} otherUserId={selectedOtherUserId ?? undefined} users={users} openComposer={newComposeMode} onExitCompose={() => setNewComposeMode(false)} />
              </div>
            </div>
          )
        ) : (
          <div className="text-sm text-muted-foreground">Sign in to view messages</div>
        )}
      </div>
    </div>
  )
}
