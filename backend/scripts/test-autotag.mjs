(async () => {
  try {
    const adminServer = process.env.VITE_ADMIN_SERVER_URL || 'http://localhost:4000'
    const content = 'Testing autotag: building an ML dashboard with visualization'
    const response = await fetch(`${adminServer}/admin/autotag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'demo-user-admin'
      },
      body: JSON.stringify({ content, maxTags: 6 })
    })

    const json = await response.json()
    console.log('autotag response:')
    console.log(JSON.stringify(json, null, 2))
  } catch (e) {
    console.error('autotag test failed', e)
    process.exit(1)
  }
})()
