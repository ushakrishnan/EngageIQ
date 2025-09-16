(async () => {
  try {
    const adminServer = process.env.VITE_ADMIN_SERVER_URL || 'http://localhost:4000'
    const response = await fetch(`${adminServer}/admin/audit-logs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'demo-user-admin'
      }
    })
    if (!response.ok) {
      console.error('audit logs request failed', response.status, await response.text())
      process.exit(1)
    }
    const json = await response.json()
    console.log('audit logs response:')
    console.log(JSON.stringify(json.slice(0, 20), null, 2))
  } catch (e) {
    console.error('get-audit-logs failed', e)
    process.exit(1)
  }
})()
