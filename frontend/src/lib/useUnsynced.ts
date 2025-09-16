import { useState, useEffect } from 'react'
import { subscribeUnsynced, getUnsyncedIds } from '@/lib/unsynced'

export function useUnsyncedIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => getUnsyncedIds())

  useEffect(() => {
    const unsubscribe = subscribeUnsynced((entries) => {
      try {
        const idList = entries.map(e => (e.payload && (e.payload as unknown as { id?: string }).id) as string | undefined).filter((x): x is string => Boolean(x))
        const s = new Set(idList)
        setIds(s)
      } catch (err) {
        console.debug('[useUnsynced] failed to compute ids from entries', err)
        setIds(getUnsyncedIds())
      }
    })

    return () => {
      try { unsubscribe() } catch (err) { console.debug('[useUnsynced] unsubscribe failed', err) }
    }
  }, [])

  return ids
}
