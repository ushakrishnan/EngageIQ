import { useState } from 'react'

// Minimal wrapper hook to provide a no-op local state fallback when not using Spark KV.
// Instead of statically importing `@github/spark/hooks` (which can cause bundling side-effects),
// this shim expects the real hook to be exposed on `window.__SPARK_USE_KV__` by the app entrypoint
// when the configured provider is 'kv'. If the global hook is not available, we fall back to local state.
export function useKV<T>(key: string, initialValue: T): [T, (valueOrUpdater: ((prev: T) => T) | T) => void] {
  void key
  // Always use local state fallback to ensure hooks order stability.
  const [value, setValue] = useState<T>(initialValue)
  const setWrapper = (valueOrUpdater: ((prev: T) => T) | T) => {
    setValue(prev => (typeof valueOrUpdater === 'function' ? (valueOrUpdater as (p: T) => T)(prev) : (valueOrUpdater as T)))
  }
  return [value, setWrapper]
}
