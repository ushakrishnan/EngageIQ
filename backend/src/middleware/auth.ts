import { Request, Response, NextFunction } from 'express'
import { getContainer, getOrCreateContainer } from '../db.js'

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
  const actorId = req.header('x-user-id') as string | undefined
  if (!actorId) return res.status(401).json({ error: 'Missing x-user-id header (dev mode).' })

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
    console.error('loadUserByHeader error', err)
    return res.status(500).json({ error: 'Failed to read actor' })
  }
}

export function requireEngageIQAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.actor) return res.status(401).json({ error: 'Not identified' })
    const roles = (req.actor.data && req.actor.data.roles) || []
    if (!Array.isArray(roles) || !roles.includes('engageiq_admin')) {
      return res.status(403).json({ error: 'Forbidden: admin role required' })
    }
    return next()
  } catch (err) {
    console.error('requireEngageIQAdmin error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
