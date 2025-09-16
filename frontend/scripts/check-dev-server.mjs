#!/usr/bin/env node

import http from 'node:http'
import { lookup } from 'node:dns/promises'

const port = parseInt(process.argv[2] || process.env.PORT || process.env.VITE_PORT || '5173', 10)

async function checkServer(host = 'localhost', portOverride = port, maxAttempts = 12, delayMs = 1000) {
  // Resolve 'localhost' to IPv4 and target that address (avoid ::1/IPv6)
  const addr = await lookup(host, { family: 4 })
  const hostIp = addr.address

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const status = await new Promise((resolve, reject) => {
        const req = http.get({
          hostname: hostIp,
          port: portOverride,
          path: '/',
          timeout: 2000,
          headers: { Host: host } // preserve hostname
        }, (res) => {
          resolve(res.statusCode)
          res.resume()
        })
        req.on('error', (err) => reject(err))
        req.setTimeout(2000, () => {
          req.destroy()
          reject(new Error('timeout'))
        })
      })
      return status
    } catch (err) {
      console.error(`attempt ${attempt} failed:`, (err && err.message) || err)
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw new Error('server did not respond in time')
}

;(async () => {
  try {
    const code = await checkServer('localhost', port)
    console.log('STATUS:' + code)
    process.exit(0)
  } catch (err) {
    console.error('ERR:', (err && err.message) || err)
    process.exit(1)
  }
})()
