import { Request, Response, NextFunction } from 'express'
import { getContainer, getOrCreateContainer } from '../db.js'
import logger from '../logger.js'

export interface Actor {
  id: string
  data?: any
}

declare global {
  namespace Express {
    interface Request {
      actor?: Actor
    }
  }
}

export async function loadUserByHeader(req: Request, res: Response, next: NextFunction) {
  // If a token-derived user is already attached (from verifyJwt), prefer it
  const tokenUser = (req as any).user
  if (tokenUser && (tokenUser.sub || tokenUser.userId || tokenUser.id)) {
    req.actor = { id: String(tokenUser.sub || tokenUser.userId || tokenUser.id), data: tokenUser }
    return next()
  }

  const actorId = req.header('x-user-id') as string | undefined
  if (!actorId) {
    // In production we should not accept x-user-id header as identity
    if (process.env.NODE_ENV === 'production') return res.status(401).json({ error: 'Missing authentication' })
    return res.status(401).json({ error: 'Missing x-user-id header (dev mode).' })
  }

  try {
    // Try per-type 'users' container first
    try {
      const usersContainer = await getOrCreateContainer('users')
      const { resource } = await usersContainer.item(actorId, actorId).read()
      if (resource) {
        req.actor = resource
        return next()
      }
    } catch (e) {
      // ignore and fall back
    }

    // Fallback: legacy container (partitionKey 'user')
    try {
      const fallback = await getOrCreateContainer('data')
      const { resource } = await fallback.item(actorId, 'user').read()
      if (resource) {
        req.actor = resource
        return next()
      }
    } catch (e) {
      // ignore
    }

    return res.status(401).json({ error: 'Actor not found' })
  } catch (err) {
    logger.error('loadUserByHeader error: %o', err)
    return res.status(500).json({ error: 'Failed to read actor' })
  }
}

export function requireEngageIQAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Check token-derived claims first (if present)
    const tokenUser = (req as any).user
    if (tokenUser) {
      const tokenRoles = tokenUser.roles || tokenUser.role || tokenUser['roles'] || tokenUser['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      // tokenRoles can be string or array
      const rArray = Array.isArray(tokenRoles) ? tokenRoles : (typeof tokenRoles === 'string' ? [tokenRoles] : [])
      if (Array.isArray(rArray) && rArray.includes('engageiq_admin')) return next()
      return res.status(403).json({ error: 'Forbidden: admin role required' })
    }

    if (!req.actor) return res.status(401).json({ error: 'Not identified' })
    const roles = (req.actor.data && req.actor.data.roles) || []
    if (!Array.isArray(roles) || !roles.includes('engageiq_admin')) {
      return res.status(403).json({ error: 'Forbidden: admin role required' })
    }
    return next()
  } catch (err) {
    logger.error('requireEngageIQAdmin error: %o', err)
    return res.status(500).json({ error: 'internal' })
  }
}
