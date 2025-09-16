import { Request, Response } from 'express'
import { performance } from 'perf_hooks'
import { getContainer } from './db.js'
import logger from './logger.js'

const startTime = Date.now()

export async function readiness() {
  try {
    // attempt a cheap DB operation: read or create a config container (non-destructive)
    const cont = getContainer('config')
    await cont.read()
    return { ok: true }
  } catch (e) {
    logger.error('Readiness check failed: %o', e)
    return { ok: false, error: (e as any)?.message || String(e) }
  }
}

export async function metricsHandler(req: Request, res: Response) {
  try {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)
    const ready = await readiness()
    const lines: string[] = []
    lines.push(`# HELP engageiq_uptime_seconds Process uptime for EngageIQ admin server`)
    lines.push(`# TYPE engageiq_uptime_seconds counter`)
    lines.push(`engageiq_uptime_seconds ${uptimeSeconds}`)
    lines.push(`# HELP engageiq_ready Is EngageIQ ready (DB connected) 1=ready 0=not_ready`)
    lines.push(`# TYPE engageiq_ready gauge`)
    lines.push(`engageiq_ready ${ready.ok ? 1 : 0}`)
    // Additional metrics can be appended here

    res.setHeader('Content-Type', 'text/plain; version=0.0.4')
    res.send(lines.join('\n') + '\n')
  } catch (err) {
    logger.error('Metrics handler error: %o', err)
    res.status(500).send('')
  }
}
