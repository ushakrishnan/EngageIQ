import { Request, Response, NextFunction } from 'express'
import verifyJwt from './verifyJwt.js'
import { loadUserByHeader } from './auth.js'

// identifyActor: try token-based identification first, then fall back to header-based
export async function identifyActor(req: Request, res: Response, next: NextFunction) {
  // try token
  try {
    // call verifyJwt but don't require it to be configured; it will respond 401 if configured and token invalid
    await new Promise<void>((resolve) => verifyJwt(req as any, res as any, () => resolve()))
    // if verifyJwt attached a user, loadUserByHeader will pick it up from req.user
    if ((req as any).user) {
      return loadUserByHeader(req, res, next)
    }
  } catch (e) {
    // ignore and try header fallback
  }

  // header fallback only allowed in non-production
  if (process.env.NODE_ENV === 'production') return res.status(401).json({ error: 'missing auth' })
  return loadUserByHeader(req, res, next)
}

export default identifyActor
