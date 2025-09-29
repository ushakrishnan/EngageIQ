import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

type Message = {
  id: string
  from: string
  to: string
  content: string
  createdAt: number
  status: string
  moderation?: { flagged?: boolean; reason?: string } & Record<string, unknown> | null
}
type AuditItem = { id?: string; action?: string; actor?: { id?: string; name?: string }; note?: string; timestamp?: string }

export function AdminModerationPanel() {
  const { user } = useAuth()
  const adminUrl = (import.meta.env.VITE_ADMIN_SERVER_URL || '').replace(/\/$/, '')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [limit] = useState(25)
  const [offset, setOffset] = useState(0)
  // continuation token stack to allow basic back navigation
  const [nextToken, setNextToken] = useState<string | undefined>(undefined)
  const [tokenStack, setTokenStack] = useState<string[]>([])
  const [selected, setSelected] = useState<Message | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [audits, setAudits] = useState<unknown[]>([])
  const [totalLoaded, setTotalLoaded] = useState(0)

  const fetchQueue = useCallback(async (off = offset, token?: string) => {
    if (!user || !user.id) return
    setLoading(true)
    try {
      // Use continuationToken when provided; fall back to offset for compatibility
      const q = token ? `?status=pending_review&limit=${limit}&continuationToken=${encodeURIComponent(token)}` : `?status=pending_review&limit=${limit}&offset=${off}`
      const res = await fetch(`${adminUrl}/admin/moderation${q}`, { headers: { 'x-user-id': user.id } })
      const j = await res.json()
      if (j && j.messages) {
        setMessages(j.messages)
        setTotalLoaded((j.messages && j.messages.length) || 0)
        // store next continuation token if provided
        setNextToken(j.continuationToken)
      }
    } catch (e) {
      console.warn('failed to fetch moderation queue', e)
    } finally { setLoading(false) }
  }, [user, adminUrl, limit, offset])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  async function doAction(id: string, action: 'approve' | 'block', note?: string) {
    if (!user || !user.id) return
    try {
      const res = await fetch(`${adminUrl}/admin/moderation/${id}/${action}`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': user.id }, body: JSON.stringify({ note })
      })
      const j = await res.json()
      if (j && j.ok) setMessages(prev => prev.filter(m => m.id !== id))
      else console.warn('action failed', j)
    } catch (e) { console.warn('action error', e) }
  }

  async function fetchDetails(id: string) {
    if (!user || !user.id) return
    try {
      const res = await fetch(`${adminUrl}/admin/moderation/${id}`, { headers: { 'x-user-id': user.id } })
      const j = await res.json()
      if (j && j.ok) {
        setSelected(j.message)
        setAudits(j.audits || [])
      }
    } catch (e) { console.warn('failed to fetch details', e) }
  }

  function openDetails(m: Message) {
    setSelected(m)
    setReviewNote('')
    fetchDetails(m.id)
  }

  function closeDetails() {
    setSelected(null)
    setReviewNote('')
  }

  function nextPage() {
    // When using continuation tokens, request next page with token and push current token to stack
    if (nextToken) {
      setTokenStack(prev => [...prev, nextToken])
      // fetch with the returned token (server returns next token for the following page)
      fetchQueue(0, nextToken)
      // no offset changes when using tokens
      return
    }
    const next = offset + limit
    setOffset(next)
    fetchQueue(next)
  }

  function prevPage() {
    // If we have a token stack, pop and use previous token to navigate back
    if (tokenStack.length > 0) {
      const stack = [...tokenStack]
      const last = stack.pop() as string
      setTokenStack(stack)
      // fetch using last token as continuationToken - Cosmos tokens are forward-only, so
      // this works if the server echoes tokens that allow client-side back navigation via cached tokens.
      fetchQueue(0, last)
      return
    }
    const prev = Math.max(0, offset - limit)
    setOffset(prev)
    fetchQueue(prev)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Moderation Queue</h3>
  <button className="px-2 py-1 border rounded" onClick={() => fetchQueue()} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      <div className="space-y-3">
        {messages.length === 0 && <div className="text-sm text-muted-foreground">No pending items</div>}
        {messages.map(m => (
          <div key={m.id} className="p-3 bg-white rounded shadow-sm">
            <div className="text-xs text-muted-foreground">From: {m.from} • To: {m.to} • {new Date(m.createdAt).toLocaleString()}</div>
            <pre className="mt-2 text-sm whitespace-pre-wrap">{m.content}</pre>
            {m.moderation && (<div className="mt-2 text-xs text-muted-foreground">Flagged: {String(!!m.moderation.flagged)} • Reason: {m.moderation.reason || '—'}</div>)}
            <div className="mt-3 flex gap-2">
              <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => openDetails(m)}>Details</button>
              <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => doAction(m.id, 'approve')}>Approve</button>
              <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => doAction(m.id, 'block')}>Block</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button className="px-2 py-1 border rounded" onClick={prevPage} disabled={offset === 0}>Prev</button>
        <div className="text-sm">Showing {offset + 1} - {offset + totalLoaded} (limit {limit})</div>
        <button className="px-2 py-1 border rounded" onClick={nextPage} disabled={totalLoaded < limit}>Next</button>
      </div>

      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-4 rounded w-[90%] max-w-3xl">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-lg">Message details</h4>
              <button className="px-2 py-1" onClick={closeDetails}>Close</button>
            </div>
            <div className="text-xs text-muted-foreground mb-2">From: {selected.from} • To: {selected.to} • {new Date(selected.createdAt).toLocaleString()}</div>
            <pre className="p-2 bg-gray-50 rounded mb-2">{selected.content}</pre>
            <div className="mb-2">
              <label className="block text-sm mb-1">Review note (optional)</label>
              <textarea aria-label="Review note" placeholder="Optional note to record why you approved or blocked this message" className="w-full border rounded p-2" value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
            </div>
            {audits.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-medium mb-1">Audit history</h5>
                <div className="space-y-2 max-h-40 overflow-auto p-2 bg-gray-50 rounded">
                  {audits.map((a) => {
                    const item = a as AuditItem
                    return (
                      <div key={item.id || item.timestamp} className="text-xs">
                        <div className="font-medium">{item.action} • {item.actor?.id || item.actor?.name || 'system'}</div>
                        <div className="text-muted-foreground">{item.note || ''} {item.timestamp ? `• ${new Date(item.timestamp).toLocaleString()}` : ''}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => { doAction(selected.id, 'approve', reviewNote); closeDetails() }}>Approve</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => { doAction(selected.id, 'block', reviewNote); closeDetails() }}>Block</button>
              <button className="px-3 py-1 border rounded" onClick={closeDetails}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminModerationPanel
