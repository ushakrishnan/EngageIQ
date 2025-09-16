import databaseService from '@/lib/database'
import { directErrorLog } from '@/lib/directErrorLog'

const UNSYNC_KEY = 'engageiq:unsynced-items'

import type { UnsyncedPayload } from '@/types/unsynced';
export type UnsyncedEntry = {
  payload: UnsyncedPayload,
  attempts?: number,
  lastAttempt?: number,
  addedAt?: number
}

const listeners = new Set<(items: UnsyncedEntry[]) => void>()

function normalizeEntry(raw: unknown): UnsyncedEntry {
  if (!raw) return { payload: {}, attempts: 0, lastAttempt: 0, addedAt: Date.now() }
  if (typeof raw === 'object' && raw !== null && 'payload' in raw) return raw as UnsyncedEntry
  return { payload: (raw as UnsyncedPayload) || {}, attempts: 0, lastAttempt: 0, addedAt: Date.now() }
}

function readStorageRaw(): UnsyncedEntry[] {
  try {
    const raw = localStorage.getItem(UNSYNC_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return (parsed || []).map(normalizeEntry)
  } catch (e) {
    console.error('[unsynced] readStorage error', e)
    return []
  }
}

function writeStorageRaw(items: UnsyncedEntry[]) {
  try {
    localStorage.setItem(UNSYNC_KEY, JSON.stringify(items))
    // notify subscribers
    try {
      for (const l of listeners) {
        try { l(items) } catch (err) { console.debug('[unsynced] listener callback error', err) }
      }
    } catch (err) { console.debug('[unsynced] writeStorageRaw listener notification failed', err) }
  } catch (e) {
    console.error('[unsynced] writeStorage error', e)
  }
}


export function getUnsyncedIds(): Set<string> {
  const items = readStorageRaw();
  // Only include defined string ids
  return new Set(items.map(i => i.payload && typeof i.payload.id === 'string' ? i.payload.id : undefined).filter((id): id is string => typeof id === 'string'));
}


export function addUnsyncedItem(item: UnsyncedPayload) {
  try {
    if (!item.id) throw new Error('Cannot add unsynced item without id');
    const items = readStorageRaw();
    if (!items.find((i: UnsyncedEntry) => i.payload && i.payload.id === item.id)) {
      items.push({ payload: item, attempts: 0, addedAt: Date.now() });
      writeStorageRaw(items);
    }
  } catch (e) {
    console.error('[unsynced] add error', e);
  }
}

export function removeUnsyncedById(id: string) {
  try {
    const items = readStorageRaw()
    const next = items.filter((i: UnsyncedEntry) => !(i.payload && i.payload.id === id))
    writeStorageRaw(next)
  } catch (e) {
    console.error('[unsynced] remove error', e)
  }
}

export function clearAllUnsynced() {
  try {
    const itemsBefore = readStorageRaw()
    if (itemsBefore.length > 0) {
      console.warn('[unsynced] Clearing unsynced items:', itemsBefore)
    } else {
      console.info('[unsynced] No unsynced items to clear.')
    }
    writeStorageRaw([])
  } catch (e) {
    console.error('[unsynced] clear error', e)
  }
}

export function subscribeUnsynced(cb: (items: UnsyncedEntry[]) => void) {
  listeners.add(cb)
  try { cb(readStorageRaw()) } catch (err) { console.debug('[unsynced] subscribe callback failed', err) }
  return () => listeners.delete(cb)
}

export async function retryAllUnsynced() {
  try {
    const entries = readStorageRaw()
    if (!entries || entries.length === 0) return { success: true, attempted: 0 }

    const now = Date.now()
    // Build list of entries ready to be retried using exponential backoff logic
    let ready = entries.filter(e => {
       const attempts = e.attempts || 0
       const last = e.lastAttempt || 0
       const delay = Math.pow(2, attempts) * 1000 // base 1s
       return now - last >= delay
     })

    if (ready.length === 0) return { success: true, attempted: 0 }

    // Filter out any entries whose payload does not contain a valid DB type
    const validTypes = new Set(['user','post','group','daily-progress','comment','report','achievement','karma','audit','error'])
    const validReady = ready.filter(e => e && e.payload && typeof e.payload.type === 'string' && validTypes.has(e.payload.type))
    const invalidReady = ready.filter(e => !validReady.includes(e))

    if (invalidReady.length > 0) {
      // Remove invalid entries from persistent store so they don't repeatedly cause exceptions
      const remaining = entries.filter(e => {
        const payload: unknown = e.payload;
        return !invalidReady.find(ir => {
          const irPayload: unknown = ir.payload;
          return irPayload && typeof irPayload === 'object' && 'id' in irPayload && payload && typeof payload === 'object' && 'id' in payload && (irPayload as { id?: string }).id === (payload as { id?: string }).id;
        });
      });
      writeStorageRaw(remaining)
      try {
        await directErrorLog('unsynced.invalidPayload', { removed: invalidReady.map(ir => ir.payload?.id) })
      } catch (err) {
        console.error('[unsynced] failed to log invalid payloads', err)
      }
    }

    // Use only the valid entries for the retry attempt
    ready = validReady

    if (ready.length === 0) return { success: true, attempted: 0 }

    // Batch by partition type, max 100 per batch
    const partitioned: { [type: string]: UnsyncedEntry[] } = {}

    for (const entry of ready) {
      const type = entry.payload.type;
      if (typeof type !== 'string') continue;
      if (!partitioned[type]) partitioned[type] = [];
      partitioned[type].push(entry);
    }

    let totalAttempted = 0
  const succeeded = new Set<string>()
    for (const type in partitioned) {
      const entriesForType = partitioned[type]
      for (let i = 0; i < entriesForType.length; i += 100) {
        const batch = entriesForType.slice(i, i + 100)

        const dbItems = batch
          .map((entry: UnsyncedEntry) => {
            const data = { ...entry.payload };
            Object.keys(data).forEach(k => { if (k.startsWith('_')) delete data[k]; });
            if (!data.id || !data.type) return undefined;
            return {
              id: String(data.id),
              type: data.type as import('./database').DatabaseItemType,
              data: { ...data, id: String(data.id) }
            };
          })
          .filter((item): item is Exclude<typeof item, undefined> => item !== undefined);
        if (dbItems.length === 0) continue;
        // REST API: fallback to individual create calls
        for (const item of dbItems) {
          try {
            const r = await databaseService.create({ id: item.id, type: item.type, data: item.data })
            const id = r && typeof r === 'object' && 'data' in r && r.data && typeof r.data === 'object' && 'id' in r.data ? (r.data as { id?: string }).id : ('id' in r ? (r as { id?: string }).id : undefined);
            if (id && typeof id === 'string') succeeded.add(id);
          } catch {
            // ignore, will be retried
          }
        }
        totalAttempted += batch.length;
      }
    }

    if (succeeded.size > 0) {
      // Remove successful entries and update attempts for others
      const remaining = entries.filter(e => {
        const id = e.payload && typeof e.payload.id === 'string' ? e.payload.id : undefined;
        return !(id && succeeded.has(id));
      });
      // For remaining entries that were retried, increment attempts and update lastAttempt
      const updated = remaining.map(e => {
        if (ready.find(r => r.payload.id && e.payload.id && r.payload.id === e.payload.id)) {
          return { ...e, attempts: (e.attempts || 0) + 1, lastAttempt: now };
        }
        return e;
      });
      writeStorageRaw(updated);
    } else {
      // No successes: update attempts and lastAttempt for all ready entries
      const updated = entries.map(e => {
        if (ready.find(r => r.payload.id && e.payload.id && r.payload.id === e.payload.id)) {
          return { ...e, attempts: (e.attempts || 0) + 1, lastAttempt: now };
        }
        return e;
      });
      writeStorageRaw(updated);
    }

    return { success: true, attempted: totalAttempted, succeeded: Array.from(succeeded) }
  } catch (err) {
    console.error('[unsynced] retryAllUnsynced failed', err)
    try { await databaseService.logError('unsynced.retryAll', err, {}) } catch (e) { console.error('[unsynced] failed to log error', e) }
    return { success: false, error: err }
  }
}

export async function retrySpecificItem(id: string) {
  try {
    const entries = readStorageRaw()
    const entry = entries.find(e => e.payload && e.payload.id === id)
    if (!entry) return { success: false, error: 'not found' }

    const data = { ...entry.payload }
    Object.keys(data).forEach(k => { if (k.startsWith('_')) delete data[k] })

    if (!data.id || !data.type) return { success: false, error: 'missing id or type' };
  // dbItem variable removed (was unused)
    // REST API: fallback to individual create call
    let succeeded = false;
    try {
      const r = await databaseService.create({ id: data.id, type: data.type as import('./database').DatabaseItemType, data: { ...data, id: String(data.id) } });
      if (r && r.data && typeof r.data === 'object' && 'id' in r.data && (r.data as { id?: string }).id === id) succeeded = true;
    } catch {
      succeeded = false;
    }
    if (succeeded) {
      const remaining = entries.filter(e => !(e.payload && e.payload.id === id));
      writeStorageRaw(remaining);
      return { success: true };
    }

    // increment attempt for this entry
    const now = Date.now()
  const updated = entries.map(e => e.payload && e.payload.id === id ? { ...e, attempts: (e.attempts || 0) + 1, lastAttempt: now } : e);
  writeStorageRaw(updated);
  return { success: false };
  } catch (err) {
    console.error('[unsynced] retrySpecificItem failed', err)
    try { await databaseService.logError('unsynced.retrySpecific', err, { id }) } catch (e) { console.error('[unsynced] failed to log error', e) }
    return { success: false, error: err }
  }
}

export { UNSYNC_KEY }
