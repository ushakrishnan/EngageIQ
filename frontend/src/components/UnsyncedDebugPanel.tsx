import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { retryAllUnsynced, retrySpecificItem, subscribeUnsynced, removeUnsyncedById } from '@/lib/unsynced'
import type { UnsyncedEntry } from '@/lib/unsynced'


export function UnsyncedDebugPanel() {
  const [open, setOpen] = useState(false)
  type UnsyncedItem = {
    id?: string;
    payload?: unknown;
    attempts?: number;
    lastAttempt?: number;
    addedAt?: number;
    userName?: string;
    content?: string;
    title?: string;
  };
  const [items, setItems] = useState<UnsyncedItem[]>([])
  const [busy, setBusy] = useState(false)
  const [failedList, setFailedList] = useState<string[]>([])
  const [showFailedModal, setShowFailedModal] = useState(false)

  useEffect(() => {
    const unsub = subscribeUnsynced((entries: UnsyncedEntry[]) => {
      try {
        type EntryPayload = { id?: unknown; userName?: unknown; content?: unknown; title?: unknown }
        const mapped = (entries || []).map((e: UnsyncedEntry) => {
          const payload = (e.payload || {}) as EntryPayload
          const id = typeof payload.id === 'string' ? payload.id : undefined
          const userName = typeof payload.userName === 'string' ? payload.userName : undefined
          const content = typeof payload.content === 'string' ? payload.content : (typeof payload.title === 'string' ? payload.title : undefined)
          return {
            id,
            payload,
            attempts: e.attempts || 0,
            lastAttempt: e.lastAttempt || undefined,
            addedAt: e.addedAt || undefined,
            userName,
            content
          }
        })
        setItems(mapped)
      } catch (err) {
        console.debug('[UnsyncedDebugPanel] subscribe callback failed', err)
        setItems([])
      }
    })
    return () => { void unsub() }
  }, [])

  const handleRetryAll = async () => {
    setBusy(true)
    try {
      const currentIds = items.map(i => i.id).filter(Boolean) as string[]
      const result = await retryAllUnsynced()
      const attempted = (result && typeof result.attempted === 'number') ? result.attempted : 0
      const succeededArr = Array.isArray(result.succeeded) ? result.succeeded : []
      const succeeded = succeededArr.length
      const failedIds = currentIds.filter(id => !succeededArr.includes(id))
      if (succeeded === attempted) {
        toast.success(`All ${attempted} unsynced items succeeded`)
      } else {
        toast.error(`${succeeded}/${attempted} unsynced items succeeded — ${failedIds.length} failed`)
        if (failedIds.length > 0) {
          console.warn('[UnsyncedDebugPanel] failed IDs:', failedIds)
          setFailedList(failedIds)
          setShowFailedModal(true)
        }
      }
    } finally {
      setBusy(false)
      // subscribe will update items automatically
    }
  }

  const handleRetryOne = async (id: string) => {
    setBusy(true)
    try {
      await retrySpecificItem(id)
    } finally {
      setBusy(false)
      // refresh() // subscribe will update items automatically
    }
  }

  const handleRemove = (id: string) => {
    try {
      removeUnsyncedById(id)
    } catch (err) {
      console.debug('[UnsyncedDebugPanel] removeUnsyncedById failed', err)
    }
    // refresh() // subscribe will update items automatically
  }

  const count = items.length

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setOpen(!open)}>
          Unsynced ({count})
        </Button>
      </div>
      {open && (
        <div className="mt-2 w-[360px] max-h-[40vh] overflow-y-auto bg-card border border-border p-3 rounded shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Unsynced items</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleRetryAll} disabled={busy || count === 0}>Retry All</Button>
            </div>
          </div>
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">No unsynced items</div>
          )}
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="p-2 border rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm truncate">
                    <div className="font-medium">{item.userName || item.id}</div>
                    <div className="text-xs text-muted-foreground truncate">{String(item.content || item.title || '').slice(0, 120)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Attempts: {item.attempts ?? 0}{item.lastAttempt ? ` • Last: ${formatRelative(item.lastAttempt)}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => item.id && handleRetryOne(item.id)} disabled={busy}>Retry</Button>
                    <Button size="sm" variant="destructive" onClick={() => item.id && handleRemove(item.id)} disabled={busy}>Remove</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Failed IDs modal */}
      <Dialog open={showFailedModal} onOpenChange={setShowFailedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Failed Unsynced Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <p className="text-sm text-muted-foreground">The following items failed to sync. You can retry selected items or copy the list.</p>
            <div className="max-h-48 overflow-y-auto border p-2 rounded">
              {failedList.map(id => (
                <div key={id} className="flex items-center justify-between py-1">
                  <div className="text-sm truncate" title={id}>{id}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      setBusy(true)
                      try { await retrySpecificItem(id); toast.success(`Retried ${id}`) } catch (err) { console.debug('[UnsyncedDebugPanel] retrySpecificItem failed', err); toast.error(`Retry ${id} failed`) }
                      setBusy(false)
                    }} disabled={busy}>Retry</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-3">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(failedList.join('\n')); toast('Copied failed IDs to clipboard') }}>Copy List</Button>
              <Button size="sm" onClick={() => setShowFailedModal(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatRelative(ts?: number | undefined) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - Number(ts)) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(ts).toLocaleString()
}

export default UnsyncedDebugPanel
