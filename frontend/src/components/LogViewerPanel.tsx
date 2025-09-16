import React from 'react';

import { useEffect, useState, useRef } from 'react'
import { useCallback } from 'react'
import databaseService, { initializeDatabase } from '@/lib/database'
import { Button } from '@/components/ui/button'


const PAGE_SIZE = 25
const AUTO_REFRESH_INTERVAL_MS = 30_000 // 30s

const LogViewerPanel: React.FC = () => {
  type AuditLog = {
    action: string;
    role?: string;
    targetUserId?: string;
    targetUserEmail?: string;
    actorId?: string;
    actorName?: string;
    ts: number;
    timestamp?: number;
    details?: Record<string, unknown>;
  };
  type ErrorLog = { message?: string; msg?: string; source?: string; sourceName?: string; ts?: number; context?: unknown };
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])

  const [auditTokens, setAuditTokens] = useState<(string | undefined)[]>([undefined])
  const [auditPage, setAuditPage] = useState(0)
  const [auditNextToken, setAuditNextToken] = useState<string | undefined>(undefined)

  const [errorTokens, setErrorTokens] = useState<(string | undefined)[]>([undefined])
  const [errorPage, setErrorPage] = useState(0)
  const [errorNextToken, setErrorNextToken] = useState<string | undefined>(undefined)

  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [filterText, setFilterText] = useState('')

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        // refresh current page for both audit and errors
        void fetchAuditPage(auditPage);
        void fetchErrorPage(errorPage);
      }, AUTO_REFRESH_INTERVAL_MS)
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
        autoRefreshRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh])

  const fetchAuditPage = useCallback(async (page: number) => {
    setLoading(true)
    try {
      await initializeDatabase()
      const token = auditTokens[page]
      const result = await databaseService.getAllByType('audit', token, PAGE_SIZE)
      setAuditLogs((result.items || []).map((i: unknown) => {
        if (i && typeof i === 'object' && 'data' in i && (i as { data?: unknown }).data) {
          return (i as { data: AuditLog }).data
        }
        return i as AuditLog
      }))
      const next = result.continuationToken
      setAuditNextToken(next)
      if (next && auditTokens[page + 1] !== next) {
        setAuditTokens(prev => {
          const copy = prev.slice(0, page + 1)
          copy.push(next)
          return copy
        })
      }
    } catch (err) {
      console.error('[LogViewerPanel] fetchAuditPage failed', err)
      try { databaseService.logError('LogViewerPanel.fetchAuditPage', err, {}) } catch (e) { console.error('[LogViewerPanel] failed to log error', e) }
    } finally {
      setLoading(false)
    }
  }, [auditTokens])

  const fetchErrorPage = useCallback(async (page: number) => {
    setLoading(true)
    try {
      await initializeDatabase()
      const token = errorTokens[page]
      const result = await databaseService.getAllByType('error', token, PAGE_SIZE)
      setErrorLogs((result.items || []).map((i: unknown) => {
        if (i && typeof i === 'object' && 'data' in i && (i as { data?: unknown }).data) {
          return (i as { data: ErrorLog }).data
        }
        return i as ErrorLog
      }))
      const next = result.continuationToken
      setErrorNextToken(next)
      if (next && errorTokens[page + 1] !== next) {
        setErrorTokens(prev => {
          const copy = prev.slice(0, page + 1)
          copy.push(next)
          return copy
        })
      }
    } catch (err) {
      console.error('[LogViewerPanel] fetchErrorPage failed', err)
      try { databaseService.logError('LogViewerPanel.fetchErrorPage', err, {}) } catch (e) { console.error('[LogViewerPanel] failed to log error', e) }
    } finally {
      setLoading(false)
    }
  }, [errorTokens])

  useEffect(() => {
    void fetchAuditPage(auditPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditPage])

  useEffect(() => {
    void fetchErrorPage(errorPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorPage])

  useEffect(() => {
    // initial fetch
    void fetchAuditPage(0)
    void fetchErrorPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredAuditLogs = auditLogs.filter(l => {
    if (!filterText) return true
    const s = filterText.toLowerCase()
    return (
      ('message' in l && typeof l.message === 'string' && l.message.toLowerCase().includes(s)) ||
      ('action' in l && typeof l.action === 'string' && l.action.toLowerCase().includes(s)) ||
      ('source' in l && typeof l.source === 'string' && l.source.toLowerCase().includes(s))
    )
  })

  const filteredErrorLogs = errorLogs.filter(l => {
    if (!filterText) return true
    const s = filterText.toLowerCase()
    return (l.message || '').toString().toLowerCase().includes(s) || (l.source || '').toString().toLowerCase().includes(s)
  })

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[560px] max-h-[70vh] overflow-y-auto bg-card border border-border p-3 rounded shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Audit & Error Logs</div>
        <div className="flex gap-2 items-center">
          <input
            className="text-xs px-2 py-1 border rounded"
            placeholder="filter text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={() => { void fetchAuditPage(auditPage); void fetchErrorPage(errorPage) }}>{loading ? '...' : 'Refresh'}</Button>
          <Button size="sm" variant={autoRefresh ? 'default' : 'outline'} onClick={() => setAutoRefresh(v => !v)}>{autoRefresh ? 'Auto ON' : 'Auto OFF'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-2">Errors</div>
          <div className="space-y-2 max-h-[38vh] overflow-y-auto mb-2">
            {filteredErrorLogs.length === 0 && <div className="text-xs text-muted-foreground">No errors</div>}
            {filteredErrorLogs.map((err, i) => (
              <div key={`err-${i}`} className="p-2 border rounded bg-red-50 text-xs">
                <div className="font-medium truncate">{'message' in err && typeof err.message === 'string' ? err.message : ('msg' in err && typeof err.msg === 'string' ? err.msg : 'Error')}</div>
                <div className="text-muted-foreground">source: {'source' in err && typeof err.source === 'string' ? err.source : ('sourceName' in err && typeof err.sourceName === 'string' ? err.sourceName : 'unknown')}</div>
                <div className="text-muted-foreground text-[11px]">{new Date(('ts' in err && typeof err.ts === 'number' ? err.ts : Date.now())).toLocaleString()}</div>
                <div className="text-[11px] text-muted-foreground mt-1 truncate">{JSON.stringify('context' in err ? err.context : {}).slice(0, 200)}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs">Page {errorPage + 1}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={errorPage === 0} onClick={() => setErrorPage(p => Math.max(0, p - 1))}>Prev</Button>
              <Button size="sm" variant="outline" disabled={!errorNextToken} onClick={() => { if (errorNextToken) setErrorPage(p => p + 1) }}>Next</Button>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">Audits</div>
          <div className="space-y-2 max-h-[38vh] overflow-y-auto mb-2">
            {filteredAuditLogs.length === 0 && <div className="text-xs text-muted-foreground">No audits</div>}
            {filteredAuditLogs.map((log, i) => (
              <div key={`audit-${i}`} className="p-2 border rounded bg-muted/5 text-xs">
                <div className="font-medium truncate">{'action' in log && typeof log.action === 'string' ? log.action : ('type' in log && typeof log.type === 'string' ? log.type : 'audit')}</div>
                <div className="text-muted-foreground">target: {'targetUserEmail' in log && typeof log.targetUserEmail === 'string' ? log.targetUserEmail : ('targetUserId' in log && typeof log.targetUserId === 'string' ? log.targetUserId : ('target' in log && typeof log.target === 'string' ? log.target : ''))}</div>
                <div className="text-muted-foreground text-[11px]">{new Date(('ts' in log && typeof log.ts === 'number' ? log.ts : ('timestamp' in log && typeof log.timestamp === 'number' ? log.timestamp : Date.now()))).toLocaleString()}</div>
                {'context' in log ? (
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">{JSON.stringify(log.context || {}).slice(0, 200)}</div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs">Page {auditPage + 1}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={auditPage === 0} onClick={() => setAuditPage(p => Math.max(0, p - 1))}>Prev</Button>
              <Button size="sm" variant="outline" disabled={!auditNextToken} onClick={() => { if (auditNextToken) setAuditPage(p => p + 1) }}>Next</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogViewerPanel
