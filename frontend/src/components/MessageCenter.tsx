import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import type { User } from '@/types'

type Message = {
  id: string
  type: string
  from: string
  to: string
  content: string
  createdAt: number
}
export function MessageCenter({ currentUser, otherUserId, users, openComposer, onExitCompose, composeOnly }: { currentUser: { id: string; name: string }, otherUserId?: string, users?: User[], openComposer?: boolean, onExitCompose?: () => void, composeOnly?: boolean }) {
  const adminUrl = (import.meta.env.VITE_ADMIN_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '')
  const [messages, setMessages] = useState<Message[]>([])
  // `to` stores the visible input value (display name or typed text).
  const [to, setTo] = useState<string>(otherUserId ? (otherUserId as string) : '')
  // selectedRecipientId stores the actual id/handle to send to the backend when a suggestion is chosen
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(otherUserId || null)
  const [content, setContent] = useState<string>('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [showComposer, setShowComposer] = useState<boolean>(false)
  const [composeNew, setComposeNew] = useState<boolean>(false)
  // suggestion visibility is derived from `suggestions.length`
  // ref for websocket connection
  const wsRef = useRef<WebSocket | null>(null)
  const messageInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!currentUser || !currentUser.id) return

  const stoppedRef = { stopped: false }
    ;(async () => {
      // fetch recent messages
      try {
        const resp = await fetch(`${adminUrl}/api/messages?limit=50`, { headers: { 'x-user-id': currentUser.id } })
        const j = await resp.json()
        if (j && Array.isArray(j.messages)) {
          // normalize messages to our local shape
          const msgs = (j.messages as unknown[]).map((mm: unknown) => {
            const mrec = mm as Record<string, unknown>
            return {
              id: String(mrec.id ?? ''),
              type: String(mrec.type ?? 'message'),
              from: String(mrec.from ?? ''),
              to: String(mrec.to ?? ''),
              content: String(mrec.content ?? ''),
              createdAt: Number(mrec.createdAt ?? Date.now())
            } as Message
          })
          // if otherUserId provided, filter to thread between currentUser and otherUserId
          const filtered = otherUserId ? msgs.filter((m: Message) => (m.from === otherUserId && m.to === currentUser.id) || (m.from === currentUser.id && m.to === otherUserId)) : msgs
          setMessages(filtered)
        }
      } catch (e) {
        console.warn('failed to fetch messages', e)
      }

      // try to request a short-lived SSE token from the server
      const tokenUrl = `${adminUrl}/api/messages/token`
      let token: string | null = null
      try {
        const tResp = await fetch(tokenUrl, { headers: { 'x-user-id': currentUser.id } })
        const tj = await tResp.json()
        if (tResp.ok && tj && tj.token) {
          token = tj.token
        }
      } catch (e) {
        console.warn('failed to fetch token', e)
      }

      // Establish WebSocket connection (required). If token exists, include it in query param.
      if (!token) {
        console.error('No token available for WebSocket connection')
        return
      }

      const protocol = adminUrl.startsWith('https') ? 'wss' : 'ws'
      const host = adminUrl.replace(/^https?:\/\//, '')
  const wsUrl = `${protocol}://${host}/`

      // simple reconnect/backoff
  let backoff = 500
      const connect = () => {
        if (stoppedRef.stopped) return
        try {
          const ws = new WebSocket(wsUrl)
          ws.addEventListener('message', (ev) => {
            try {
              const msg = JSON.parse(ev.data) as Message
              setMessages((m) => [msg, ...m])
            } catch (e) {
              console.warn('invalid ws message', e)
            }
          })
          ws.addEventListener('open', () => {
            // send auth handshake with the short-lived token
            try { ws.send(JSON.stringify({ type: 'auth', token })) } catch (e) { console.warn('failed to send auth handshake', e) }
            wsRef.current = ws; backoff = 500
          })
          ws.addEventListener('close', () => {
            if (wsRef.current === ws) wsRef.current = null
            // reconnect with backoff
            setTimeout(() => { backoff = Math.min(60000, backoff * 1.5); connect() }, backoff)
          })
          ws.addEventListener('error', (e) => {
            console.warn('ws error', e)
            try { ws.close() } catch (closeErr) { console.warn('ws close error', closeErr) }
          })
        } catch (e) {
          console.warn('ws connection failed', e)
          setTimeout(() => connect(), backoff)
        }
      }

      connect()
    })()

      return () => {
      stoppedRef.stopped = true
      try { if (wsRef.current) wsRef.current.close() } catch (closeErr) { console.warn('error closing ws', closeErr) }
    }
  }, [currentUser, adminUrl, otherUserId])

  async function doRewrite() {
    if (!content) return
    setIsRewriting(true)
    try {
      const resp = await fetch(`${adminUrl}/admin/rewrite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ content, style: 'concise' })
      })
      const j = await resp.json()
      if (j && (j.rewritten || j.rewritten === '')) {
        setContent(j.rewritten)
      } else if (j && j.rewritten === undefined && j.rewritten === null && j.rewritten !== j) {
        // no-op
      } else if (j && j.rewritten) {
        setContent(j.rewritten)
      } else if (j && j.rewritten === undefined && j.rewritten === null) {
        // leave
      }
    } catch (err) {
      console.warn('rewrite failed', err)
    } finally {
      setIsRewriting(false)
    }
  }

  async function doSend() {
    // prefer selectedRecipientId (actual id) when available; fall back to visible `to` value
    const recipient = composeNew ? (selectedRecipientId || to) : (otherUserId || selectedRecipientId || to)
    if (!recipient || !content) return
    try {
      const resp = await fetch(`${adminUrl}/api/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ to: recipient, content })
      })
      const j = await resp.json()
      if (j && j.ok && j.message) {
        setMessages((m) => [j.message, ...m])
        setContent('')
        // after sending, close composer and show inbox
        setShowComposer(false)
        // when user sends while viewing a conversation, keep composeNew false
        if (!composeNew) setComposeNew(false)
        // if parent passed an onExitCompose handler, call it to let parent hide compose-only mode
        if (onExitCompose) onExitCompose()
      }
    } catch (err) {
      console.warn('send failed', err)
    }
  }

  // Small dropdown that positions above the input when there's insufficient space below
  function SuggestionDropdown({ items, onSelect }: { items: User[], onSelect: (item: User) => void }) {
    // Always render the suggestion dropdown above the input to avoid clipping at the bottom
    const ref = useRef<HTMLDivElement | null>(null)
    return (
      <div ref={ref} className={`absolute left-0 right-0 bottom-full mb-1 bg-white border border-border rounded shadow max-h-44 overflow-auto z-20`}>
        {items.map(s => (
          <button key={s.id} onClick={() => onSelect(s)} className="w-full text-left p-2 hover:bg-accent">
            <div className="text-sm font-medium">{s.name}</div>
            <div className="text-xs text-muted-foreground">@{((s as Partial<User>).handle) || s.name.replace(/\s+/g,'').toLowerCase()}</div>
          </button>
        ))}
      </div>
    )
  }

  // Small consistent icon button used across the composer
  function IconButton({ title, onClick, variant = 'subtle', children, disabled }: { title?: string, onClick?: () => void, variant?: 'primary' | 'subtle' | 'outline', children: React.ReactNode, disabled?: boolean }) {
    const base = 'p-2 rounded flex items-center justify-center';
    const variantClass = variant === 'primary' ? 'bg-primary text-white' : variant === 'outline' ? 'border border-border bg-white text-sm' : 'hover:bg-accent';
    return (
      <button title={title} onClick={onClick} disabled={disabled} className={`${base} ${variantClass}`} aria-label={title}>
        {children}
      </button>
    )
  }

  useEffect(() => {
    if (showComposer && messageInputRef.current) {
      try {
        const el = messageInputRef.current as (HTMLInputElement | HTMLTextAreaElement)
        el.focus()
      } catch { /* ignore */ }
    }
  }, [showComposer])

  // Open composer when the parent toggle increments
  // Open composer when parent signals openComposer boolean
  useEffect(() => {
    if (openComposer) {
      setShowComposer(true)
      setComposeNew(true)
      setTo('')
    }
  }, [openComposer])

  // shortlist suggestions from users based on `to` input; match name or handle (case-insensitive)
  const suggestions = useMemo(() => {
    // allow suggestions when composing new; otherwise suppress suggestions if we are viewing a selected conversation
    if (!users || !to || (!composeNew && otherUserId)) return [] as User[]
    const q = to.trim().toLowerCase()
    if (!q) return []
    // score: name startsWith => top, contains => next
    const candidates = users.filter(u => {
      const handle = (u as Partial<User>).handle || ''
      return (u.name || '').toLowerCase().includes(q) || handle.toLowerCase().includes(q)
    })
    // simple sort: name startsWith first
    candidates.sort((a,b) => {
      const an = (a.name || '').toLowerCase(), bn = (b.name || '').toLowerCase()
      const aStarts = an.startsWith(q) ? 0 : 1
      const bStarts = bn.startsWith(q) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return an.localeCompare(bn)
    })
    return candidates.slice(0, 8)
  }, [users, to, otherUserId, composeNew])

  // helper: find a user by id or handle
  const findUserByIdOrHandle = useCallback((idOrHandle?: string) => {
    if (!users || !idOrHandle) return undefined
    const byId = users.find(u => u.id === idOrHandle)
    if (byId) return byId
    const byHandle = users.find(u => (u.handle || '').toLowerCase() === String(idOrHandle).toLowerCase())
    if (byHandle) return byHandle
    return undefined
  }, [users])

  const displayNameFor = useCallback((idOrHandle?: string) => {
    if (!idOrHandle) return ''
    const u = findUserByIdOrHandle(idOrHandle)
    if (u) return u.name || idOrHandle
    return idOrHandle
  }, [findUserByIdOrHandle])

  // auto-show composer (compact) when a conversation is selected and not composing a new recipient
  useEffect(() => {
    if (otherUserId && !composeNew) {
      setShowComposer(true)
      setComposeNew(false)
      // populate visible input with display name but keep selectedRecipientId as the id
      setSelectedRecipientId(otherUserId)
      setTo(displayNameFor(otherUserId) || otherUserId)
    }
  }, [otherUserId, composeNew, displayNameFor])

  return (
    // fixed-height message center: messages scroll in the middle area, composer stays visible at bottom
    <div className="flex flex-col h-[480px]">
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {!composeOnly && messages.map(m => {
          const fromName = displayNameFor(m.from) || m.from
          const toName = displayNameFor(m.to) || m.to
          return (
            <div key={m.id} className="p-2 bg-white rounded shadow-sm">
              <div className="text-xs text-muted-foreground">From: {fromName} • To: {toName} • {new Date(m.createdAt).toLocaleString()}</div>
              <div className="mt-1 text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          )
        })}
      </div>

      {/* composer area pinned to bottom */}
      {showComposer && (
        <div className="p-2 bg-white rounded shadow-sm border border-border">
          {composeNew ? (
            <div className="mb-2 relative">
                <input
                  id="message-to-input"
                  value={to}
                  onChange={e => { setTo(e.target.value); setSelectedRecipientId(null); }}
                  placeholder="To: start typing a name..."
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              {suggestions.length > 0 && (
                <SuggestionDropdown items={suggestions} onSelect={(s: User) => { setSelectedRecipientId(s.id); setTo(s.name || s.id); setContent(''); setComposeNew(true); }} />
              )}
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            {composeOnly ? (
              <textarea
                ref={(el) => { messageInputRef.current = el }}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write a message..."
                rows={5}
                className="flex-1 border rounded px-2 py-1 text-sm resize-y"
              />
            ) : (
              <input
                ref={(el) => { messageInputRef.current = el }}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSend(); } }}
                placeholder="Write a message..."
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
            )}

            {/* vertical icon column to keep the composer wide */}
            <div className="flex flex-col items-center gap-2 ml-2">
              <IconButton title="Rewrite" onClick={doRewrite} disabled={isRewriting} variant="subtle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </IconButton>
              <IconButton title="Send" onClick={doSend} variant="primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </IconButton>
              {otherUserId && composeNew && (
                <IconButton title="Cancel" onClick={() => { setComposeNew(false); setTo(otherUserId); setContent('') }} variant="outline">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </IconButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageCenter
