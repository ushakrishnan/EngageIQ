/**
 * Frontend helper to ask the backend to test a database connection.
 * This avoids including secrets or the SDK in the client bundle.
 * The backend must expose an admin-only endpoint to perform the test.
 */
export async function testDatabaseConnection(endpoint: string, key: string) {
  try {
    const apiBase = (import.meta.env.VITE_ADMIN_SERVER_URL as string) || (import.meta.env.VITE_API_BASE_URL as string) || ''
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/admin/test-cosmos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, key })
    })
    if (!res.ok) return false
    const json = await res.json()
    return !!json?.ok
  } catch (err) {
    console.error('[testDatabaseConnection] request failed', err)
    return false
  }
}

if (typeof window !== 'undefined') {
  // expose lightly for debugging in dev only
  (window as unknown as Record<string, unknown>).testDatabaseConnection = testDatabaseConnection as unknown
}
