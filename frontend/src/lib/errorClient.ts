/**
 * Minimal client-side error reporter that forwards errors to the backend.
 * The backend is responsible for writing to Cosmos (server-side secret required).
 */
export async function reportErrorToBackend(source: string, error: unknown, context?: Record<string, unknown> | null) {
  try {
    const apiBase = (import.meta.env.VITE_ADMIN_SERVER_URL as string) || (import.meta.env.VITE_API_BASE_URL as string) || ''
    const url = `${apiBase.replace(/\/$/, '')}/internal/errors`
    const payload = { source, error: typeof error === 'object' && error !== null ? error : { message: String(error) }, context, ts: Date.now() }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (e) {
    try { console.error('[errorClient] failed to report error to backend', e) } catch { /* ignore */ }
  }
}

// Keep a small convenience wrapper compatible with previous API
export const directErrorLog = reportErrorToBackend
