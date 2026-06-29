import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { requireAgent } from '@/lib/agent-auth'
import { createAgentToken, revokeAgentToken } from '@/lib/queries/agent-tokens'

afterAll(() => closePool())

function req(authHeader?: string): Request {
  return new Request('http://x/api/agent/state', {
    headers: authHeader ? { Authorization: authHeader } : {},
  })
}

describe('requireAgent', () => {
  beforeEach(() => truncateAll())

  it('refuse sans en-tête (401)', async () => {
    const res = await requireAgent(req())
    expect(res?.status).toBe(401)
  })

  it('refuse un en-tête mal formé (401)', async () => {
    const res = await requireAgent(req('Token abc'))
    expect(res?.status).toBe(401)
  })

  it('refuse un token inconnu (401)', async () => {
    const res = await requireAgent(req('Bearer plt_inconnu'))
    expect(res?.status).toBe(401)
  })

  it('accepte un token valide (null)', async () => {
    const { plaintext } = await createAgentToken('Claude')
    const res = await requireAgent(req(`Bearer ${plaintext}`))
    expect(res).toBeNull()
  })

  it('refuse un token révoqué (401)', async () => {
    const { token, plaintext } = await createAgentToken('n8n')
    await revokeAgentToken(token.id)
    const res = await requireAgent(req(`Bearer ${plaintext}`))
    expect(res?.status).toBe(401)
  })
})
