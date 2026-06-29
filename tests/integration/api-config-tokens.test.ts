import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { POST } from '@/app/api/config/tokens/route'
import { DELETE } from '@/app/api/config/tokens/[id]/route'
import { listAgentTokens, findActiveTokenByHash } from '@/lib/queries/agent-tokens'
import { hashToken } from '@/lib/agent-token'

afterAll(() => closePool())

describe('POST /api/config/tokens', () => {
  beforeEach(() => truncateAll())

  it('crée un token et renvoie le secret une fois', async () => {
    const res = await POST(new Request('http://x/api/config/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Claude' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plaintext.startsWith('plt_')).toBe(true)
    expect((await listAgentTokens()).length).toBe(1)
  })

  it('400 si nom vide', async () => {
    const res = await POST(new Request('http://x/api/config/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    }))
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/config/tokens/:id', () => {
  beforeEach(() => truncateAll())

  it('révoque un token', async () => {
    const created = await (await POST(new Request('http://x/api/config/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    }))).json()
    const res = await DELETE(new Request(`http://x/api/config/tokens/${created.token.id}`, {
      method: 'DELETE',
    }), { params: Promise.resolve({ id: String(created.token.id) }) })
    expect(res.status).toBe(204)
    expect(await findActiveTokenByHash(hashToken(created.plaintext))).toBeNull()
  })
})
