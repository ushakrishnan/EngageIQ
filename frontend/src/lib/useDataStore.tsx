// Function signature is defined below, remove duplicate
import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@/lib/use-kv'
// ...existing code...
import type { UnsyncedPayload } from '@/types/unsynced'
import { config } from '@/lib/config'
import databaseService, { initializeDatabase } from '@/lib/database'


// Minimal in-browser id generator (no extra dependency)
const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`

// Shared in-memory store so multiple hook instances for the same `key` see immediate updates.
const sharedStore: Map<string, { items: unknown[]; listeners: Set<() => void> }> = new Map();

// T must extend UnsyncedPayload for type safety
export function useDataStore<T = UnsyncedPayload>(key: string, type: import('./database').DatabaseItemType): [T[], (updater: ((prev: T[]) => T[]) | T[]) => void] {
  // All hooks must be called unconditionally
  const isKV = (config.database.provider as string) === 'kv';
  const kvResult = useKV<T[]>(key, []) as [T[], (updater: ((prev: T[]) => T[]) | T[]) => void];
  const [items, setItems] = useState<T[]>(() => {
    // Initialize from shared store if present to keep instances in sync
    const shared = sharedStore.get(key)
    return (shared && Array.isArray(shared.items) ? (shared.items as T[]) : []);
  });
  const persist = useCallback(async (nextItems: T[]) => {
    try {
      const dbItems = nextItems.map((item) => {
        const id = ((item as unknown) as { id?: string }).id || genId(type);
        // Use a type-safe approach to remove keys starting with '_'
        const data = { ...item } as Record<string, unknown>;
        Object.keys(data).forEach(k => { if (k.startsWith('_')) delete data[k]; });
        return {
          id,
          partitionKey: type,
          type,
          data: { ...data, id } as T
        };
      });
      try {
        console.debug('[useDataStore] persisting to DB:', { type, count: dbItems.length, sample: dbItems.slice(0, 3) });
      } catch {
        // ignore
      }
      // REST API: fallback to individual create calls
      const results = [];
      for (const item of dbItems) {
        try {
          const res = await databaseService.create({ id: (item.id as string) || genId(type), type: item.type, data: item.data });
          results.push(res);
        } catch {
          // ignore, will be handled as failed
        }
      }
    } catch {
      // ignore
    }
  }, [type]);
  useEffect(() => {
    if (isKV) return;
    let cancelled = false;
    async function load() {
      try {
        await initializeDatabase();
        const dbItems = await databaseService.queryByType(type);
        const data = dbItems.map(i => {
          if (!i || typeof i !== 'object') return undefined
          // Support two shapes: { data: {...} } or top-level document
          if ('data' in i && i.data && typeof i.data === 'object') return (i.data as T)
          // Fallback: treat the resource itself as the document
          return (i as unknown) as T
        }).filter(Boolean) as T[];
        if (!cancelled) {
          setItems(data);
          // update shared store and notify other subscribers
          const existing = sharedStore.get(key) || { items: [], listeners: new Set<() => void>() }
          existing.items = data.slice()
          sharedStore.set(key, existing)
          try {
            for (const l of existing.listeners) {
              try { l(); } catch { /* ignore listener errors */ }
            }
          } catch { /* ignore notify errors */ }
          try {
            console.debug(`[useDataStore] loaded type=${type} count=${data.length}`, data.slice(0,3).map(d => (d && typeof d === 'object' && 'id' in d ? (d.id as string) : undefined)));
          } catch {
            // ignore stringify issues
          }
        }
      } catch (err) {
        // Don't crash the app for network/db errors; surface to console for debugging
        console.error('[useDataStore] failed to load items for', type, err);
        try { await databaseService.logError('useDataStore.load', err, { type }); } catch { /* ignore */ }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type, isKV, key]);
  const setItemsWrapper = useCallback((updaterOrValue: ((prev: T[]) => T[]) | T[]) => {
    setItems(prev => {
      const next = typeof updaterOrValue === 'function'
        ? (updaterOrValue as (prev: T[]) => T[])(prev)
        : (updaterOrValue as T[]);
      // persist asynchronously
      void persist(next);

      // update shared store and notify listeners so other hook instances update immediately
      try {
        const shared = sharedStore.get(key) || { items: [], listeners: new Set<() => void>() }
        shared.items = next.slice()
        sharedStore.set(key, shared)
        for (const l of shared.listeners) {
          try { l(); } catch { /* ignore listener errors */ }
        }
      } catch {
        // ignore shared store errors
      }

      return next;
    });
  }, [persist, key]);

  // Subscribe to shared store updates so this instance updates when others change
  useEffect(() => {
    const shared = sharedStore.get(key) || { items: [], listeners: new Set<() => void>() }
    const onSharedUpdate = () => {
      const s = sharedStore.get(key)
      if (s && Array.isArray(s.items)) setItems(s.items as T[])
    }
    shared.listeners.add(onSharedUpdate)
    sharedStore.set(key, shared)
    return () => {
      const s = sharedStore.get(key)
      if (s) {
        s.listeners.delete(onSharedUpdate)
        sharedStore.set(key, s)
      }
    }
  }, [key]);

  // Return the correct result based on provider
  return isKV ? kvResult : [items, setItemsWrapper];
}

