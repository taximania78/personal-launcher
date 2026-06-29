import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import {
  createAgentToken, listAgentTokens, findActiveTokenByHash, revokeAgentToken,
} from '@/lib/queries/agent-tokens'
import { hashToken } from '@/lib/agent-token'

afterAll(() => closePool())

describe('queries/agent-tokens', () => {
  beforeEach(() => truncateAll())

  it('crée un token et le retrouve par hash', async () => {
    const { token, plaintext } = await createAgentToken('Claude')
    expect(token.name).toBe('Claude')
    expect(token.token_prefix).toBe(plaintext.slice(0, 10))
    const found = await findActiveTokenByHash(hashToken(plaintext))
    expect(found?.id).toBe(token.id)
  })

  it('ne retrouve pas un token révoqué', async () => {
    const { token, plaintext } = await createAgentToken('n8n')
    await revokeAgentToken(token.id)
    expect(await findActiveTokenByHash(hashToken(plaintext))).toBeNull()
  })

  it('liste les tokens créés', async () => {
    await createAgentToken('A')
    await createAgentToken('B')
    expect((await listAgentTokens()).length).toBe(2)
  })
})
