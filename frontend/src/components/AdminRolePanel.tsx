import React from 'react';
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Shield } from '@phosphor-icons/react'
import type { User } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import databaseService, { initializeDatabase, type DatabaseItem } from '@/lib/database'
// Storage key to notify other tabs of user updates
const USERS_UPDATED_KEY = 'engageiq:users-updated'

interface AdminRolePanelProps {
  users: User[]
  setUsers: (updater: ((prev: User[]) => User[]) | User[]) => void
}

export function AdminRolePanel({ users, setUsers }: AdminRolePanelProps) {
  const [open, setOpen] = useState(false)
  const [localUsers, setLocalUsers] = useState<User[]>(users || [])

  useEffect(() => {
    setLocalUsers(users || [])
  }, [users])

  const { user: currentUser } = useAuth()

  const toggleRole = async (u: User, role: string) => {
    const currentRoles = u.roles || []
    const has = currentRoles.includes(role)
    const nextRoles = has ? currentRoles.filter(r => r !== role) : [...currentRoles, role]
    setLocalUsers(prev => prev.map(p => p.id === u.id ? { ...p, roles: nextRoles } : p))
    setUsers(prev => prev.map(p => p.id === u.id ? { ...p, roles: nextRoles } : p))

    try {
      const audit: Omit<DatabaseItem, 'createdAt' | 'updatedAt'> = {
        id: `audit-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        type: 'audit',
        data: {
          action: has ? 'revoke_role' : 'grant_role',
          role,
          targetUserId: u.id,
          targetUserEmail: u.email,
          actorId: currentUser?.id || 'unknown',
          actorName: currentUser?.name || 'unknown',
          ts: Date.now()
        }
      }
      try {
        await initializeDatabase()
        await databaseService.create(audit)
      } catch (e) {
        console.error('[AdminRolePanel] failed to write audit record:', e)
        try {
          await databaseService.logError('AdminRolePanel.createAudit', e, { audit, actorId: currentUser?.id, targetUserId: u.id })
        } catch (err) {
          console.error('[AdminRolePanel] failed to write error log:', err)
        }
      }
    } finally {
      try {
        localStorage.setItem(USERS_UPDATED_KEY, JSON.stringify({ userId: u.id, role, action: has ? 'revoke' : 'grant', ts: Date.now() }))
      } catch {
        // ignore localStorage errors
      }
    }
  }

  useEffect(() => {
    setLocalUsers(users || [])
  }, [users])

  const [auditLogs, setAuditLogs] = useState<DatabaseItem[]>([])
  const [auditTTLDays, setAuditTTLDays] = useState<number | null>(null)
  const [errorTTLDays, setErrorTTLDays] = useState<number | null>(null)
  const [ttlSaving, setTtlSaving] = useState(false)

  const fetchTTLs = React.useCallback(async (): Promise<void> => {
    try {
      if (!currentUser?.id) return
      const headers = { 'x-user-id': currentUser.id }
      const safeParseJson = async (res: Response, type: string): Promise<{ defaultTtl?: number } | null> => {
        try {
          const text = await res.text()
          try {
            const j = JSON.parse(text)
            return j
          } catch (jsonErr) {
            console.error(`[AdminRolePanel] ${type} TTL response not JSON`, { text })
            await databaseService.logError('AdminRolePanel.fetchTTLs', jsonErr, { type, text })
            return null
          }
        } catch (err) {
          console.error(`[AdminRolePanel] ${type} TTL failed to read response`, err)
          await databaseService.logError('AdminRolePanel.fetchTTLs', err, { type })
          return null
        }
      }
      const aRes = await fetch(`/admin/container-ttl?type=audit`, { headers })
      if (aRes.ok) {
        const j = await safeParseJson(aRes, 'audit')
        if (j && j.defaultTtl) setAuditTTLDays(Math.floor(j.defaultTtl / 86400))
      } else {
        console.error('[AdminRolePanel] audit TTL fetch failed', aRes.status, aRes.statusText)
        await databaseService.logError('AdminRolePanel.fetchTTLs', new Error('audit TTL fetch failed'), { status: aRes.status, statusText: aRes.statusText })
      }
      const eRes = await fetch(`/admin/container-ttl?type=error`, { headers })
      if (eRes.ok) {
        const j = await safeParseJson(eRes, 'error')
        if (j && j.defaultTtl) setErrorTTLDays(Math.floor(j.defaultTtl / 86400))
      } else {
        console.error('[AdminRolePanel] error TTL fetch failed', eRes.status, eRes.statusText)
        await databaseService.logError('AdminRolePanel.fetchTTLs', new Error('error TTL fetch failed'), { status: eRes.status, statusText: eRes.statusText })
      }
    } catch (err) {
      console.error('[AdminRolePanel] failed to fetch TTLs', err)
      try { await databaseService.logError('AdminRolePanel.fetchTTLs', err, {}) } catch (e) { console.error('[AdminRolePanel] failed to log error', e) }
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser && (currentUser.roles || []).includes('engageiq_admin')) {
      void fetchTTLs()
    }
  }, [currentUser, fetchTTLs])

  const setContainerTTL = async (type: 'audit' | 'error', days: number | null): Promise<void> => {
    if (!currentUser?.id) return
    try {
      setTtlSaving(true)
      const headers = { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }
      const body = JSON.stringify({ type, ttlSeconds: days ? Math.floor(days * 24 * 60 * 60) : null })
      await fetch('/admin/container-ttl', { method: 'POST', headers, body })
      await fetchTTLs()
    } catch (err) {
      console.error('[AdminRolePanel] failed to set TTL', err)
      try { await databaseService.logError('AdminRolePanel.setContainerTTL', err, { type, days }) } catch (e) { console.error('[AdminRolePanel] failed to log error', e) }
    } finally {
      setTtlSaving(false)
    }
  }

  const fetchAuditLogs = async (): Promise<void> => {
    try {
      await initializeDatabase()
      const items: DatabaseItem[] = await databaseService.queryByType('audit')
      setAuditLogs(items)
    } catch (err) {
      console.error('[AdminRolePanel] failed to fetch audit logs', err)
      try { await databaseService.logError('AdminRolePanel.fetchAuditLogs', err, {}) } catch (e) { console.error('[AdminRolePanel] failed to log error', e) }
    }
  }

  useEffect(() => {
    const handler = async (e: StorageEvent) => {
      if (!e.key) return
      if (e.key !== USERS_UPDATED_KEY) return
      try {
        await initializeDatabase()
        const dbItems: DatabaseItem[] = await databaseService.queryByType('user')
        const freshUsers = dbItems.map(i => i.data as User)
        setUsers(freshUsers)
      } catch (err) {
        console.error('[AdminRolePanel] error refreshing users on storage event:', err)
        try { await databaseService.logError('AdminRolePanel.storageEvent', err, {}) } catch (e) { console.error('[AdminRolePanel] failed to log error', e) }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [setUsers])

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="flex items-center justify-start">
        <Button size="sm" variant="outline" onClick={() => setOpen(!open)} className="gap-2">
          <Shield className="h-4 w-4" /> Roles
        </Button>
      </div>
      {open && (
        <div className="mt-2 w-[420px] max-h-[60vh] overflow-y-auto bg-card border border-border p-3 rounded shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <div className="font-medium">User Roles</div>
            </div>
            <div className="text-xs text-muted-foreground">Toggle engageiq_admin</div>
          </div>
          <div className="space-y-2">
            {localUsers.map(u => (
              <Card key={u.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{(u.roles || []).join(', ') || 'member'}</Badge>
                      <Button size="sm" variant={(u.roles || []).includes('engageiq_admin') ? 'default' : 'outline'} onClick={() => toggleRole(u, 'engageiq_admin')}>
                        {(u.roles || []).includes('engageiq_admin') ? 'Revoke Admin' : 'Grant Admin'}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">Member since {new Date(u.joinedAt).toLocaleDateString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Audit Logs</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fetchAuditLogs}>Refresh</Button>
              </div>
            </div>
            {auditLogs.length === 0 && <div className="text-xs text-muted-foreground">No audit logs found</div>}
            <div className="space-y-2 mt-2">
              {auditLogs.map((log, idx) => {
                const data = log.data as {
                  action?: string
                  role?: string
                  targetUserEmail?: string
                  targetUserId?: string
                  actorName?: string
                  actorId?: string
                  ts?: number
                  timestamp?: number
                } | undefined
                return (
                  <div key={idx} className="p-2 border rounded bg-muted/5 text-xs">
                    <div className="font-medium">{data?.action ?? ''} — {data?.role ?? ''}</div>
                    <div className="text-muted-foreground">target: {data?.targetUserEmail || data?.targetUserId} — by: {data?.actorName || data?.actorId}</div>
                    <div className="text-muted-foreground text-[11px]">{new Date(data?.ts || data?.timestamp || Date.now()).toLocaleString()}</div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* TTL controls - only visible to super-admins */}
          {(currentUser && (currentUser.roles || []).includes('engageiq_admin')) && (
            <div className="mt-4 p-2 border rounded bg-muted/3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Retention (days)</div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label htmlFor="audit-ttl" className="text-xs text-muted-foreground mb-1 block">Audit TTL</label>
                  <input id="audit-ttl" aria-label="Audit TTL in days" title="Audit TTL in days" placeholder="e.g. 30" type="number" value={auditTTLDays ?? ''} onChange={(e) => setAuditTTLDays(e.target.value ? parseInt(e.target.value, 10) : null)} className="text-xs px-2 py-1 border rounded w-full" />
                </div>
                <div>
                  <label htmlFor="error-ttl" className="text-xs text-muted-foreground mb-1 block">Errors TTL</label>
                  <input id="error-ttl" aria-label="Errors TTL in days" title="Errors TTL in days" placeholder="e.g. 90" type="number" value={errorTTLDays ?? ''} onChange={(e) => setErrorTTLDays(e.target.value ? parseInt(e.target.value, 10) : null)} className="text-xs px-2 py-1 border rounded w-full" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => { setAuditTTLDays(null); setErrorTTLDays(null) }}>Clear</Button>
                <Button size="sm" onClick={() => { void setContainerTTL('audit', auditTTLDays); void setContainerTTL('error', errorTTLDays) }} disabled={ttlSaving}>{ttlSaving ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminRolePanel
