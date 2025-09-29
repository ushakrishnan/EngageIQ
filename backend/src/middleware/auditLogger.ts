import { Request, Response, NextFunction } from 'express'
import { getOrCreateContainer } from '../db.js'

// Simple audit logger for admin actions. Writes a small record to the 'audit' container.
export async function auditLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  // defer to after response finishes so we can capture status
  res.on('finish', async () => {
    try {
      const actorId = (req as any).actor?.id || (req as any).user?.sub || (req as any).user?.userId || null
      const rec: any = {
        id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
        type: 'audit',
        actor: actorId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Date.now() - start,
        createdAt: Date.now()
      }
      // avoid storing request bodies (may contain secrets)
      const cont = await getOrCreateContainer('audit')
      await cont.items.create(rec)
    } catch (e) {
      // non-fatal: do not break request if audit fails
      // eslint-disable-next-line no-console
      console.error('auditLogger write failed', e)
    }
  })
  return next()
}

export default auditLogger
