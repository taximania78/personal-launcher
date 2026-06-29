import { NextResponse } from 'next/server'
import { hashToken } from './agent-token'
import { findActiveTokenByHash, touchTokenLastUsed } from './queries/agent-tokens'

const UNAUTHORIZED = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 })

/**
 * Garde bearer pour les routes /api/agent/*.
 * Renvoie une réponse 401 à retourner telle quelle, ou null si l'auth passe.
 */
export async function requireAgent(req: Request): Promise<NextResponse | null> {
  const header = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)$/.exec(header)
  if (!match) return UNAUTHORIZED()

  const found = await findActiveTokenByHash(hashToken(match[1]))
  if (!found) return UNAUTHORIZED()

  // best-effort, ne bloque pas la réponse
  void touchTokenLastUsed(found.id).catch(() => {})
  return null
}
