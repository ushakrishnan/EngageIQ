import { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify, FlattenedJWSInput } from 'jose'
import url from 'url'

interface JwtConfig {
  issuer?: string
  audience?: string
  jwksUri?: string
  hs256Secret?: string
}

const cfg: JwtConfig = {
  issuer: process.env.AUTH_ISSUER,
  audience: process.env.AUTH_AUDIENCE,
  jwksUri: process.env.AUTH_JWKS_URI,
  hs256Secret: process.env.AUTH_JWT_SECRET
}

// Simple middleware to verify a bearer JWT. Supports JWKS (recommended) or HS256 shared secret.
export async function verifyJwt(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = String(req.headers.authorization || '')
    if (!auth.toLowerCase().startsWith('bearer ')) return res.status(401).json({ error: 'missing bearer token' })
    const token = auth.slice(7).trim()

    if (cfg.jwksUri) {
      // validate using remote JWKS
      const jwks = createRemoteJWKSet(new url.URL(cfg.jwksUri))
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: cfg.issuer,
          audience: cfg.audience
        } as any)
        // attach payload to request
        ;(req as any).user = payload
        return next()
      } catch (e) {
        return res.status(401).json({ error: 'invalid token' })
      }
    }

    // Fallback: HS256 shared secret if provided (useful for tests/dev)
    if (cfg.hs256Secret) {
      try {
        const { jwtVerify: verify } = await import('jose')
        const { payload } = await verify(token, new TextEncoder().encode(cfg.hs256Secret), {
          issuer: cfg.issuer,
          audience: cfg.audience,
          algorithms: ['HS256']
        } as any)
        ;(req as any).user = payload
        return next()
      } catch (e) {
        return res.status(401).json({ error: 'invalid token' })
      }
    }

    return res.status(401).json({ error: 'no verification method configured' })
  } catch (err) {
    console.error('verifyJwt error', err)
    return res.status(500).json({ error: 'auth failure' })
  }
}

export default verifyJwt
