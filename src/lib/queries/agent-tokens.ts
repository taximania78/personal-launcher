import { readerPool, writerPool } from '../db'
import { generateToken, hashToken, tokenPrefix } from '../agent-token'

export type AgentToken = {
  id: number
  name: string
  token_prefix: string
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

const COLS =
  'id::int AS id, name, token_prefix, last_used_at, revoked_at, created_at'

export async function createAgentToken(
  name: string,
): Promise<{ token: AgentToken; plaintext: string }> {
  const plaintext = generateToken()
  const r = await writerPool.query<AgentToken>(`
    INSERT INTO agent_tokens (name, token_hash, token_prefix)
    VALUES ($1, $2, $3)
    RETURNING ${COLS}
  `, [name, hashToken(plaintext), tokenPrefix(plaintext)])
  return { token: r.rows[0], plaintext }
}

export async function listAgentTokens(): Promise<AgentToken[]> {
  const r = await readerPool.query<AgentToken>(`
    SELECT ${COLS} FROM agent_tokens ORDER BY created_at DESC, id DESC
  `)
  return r.rows
}

export async function findActiveTokenByHash(
  hash: string,
): Promise<{ id: number } | null> {
  const r = await readerPool.query<{ id: number }>(`
    SELECT id::int AS id FROM agent_tokens
    WHERE token_hash = $1 AND revoked_at IS NULL
    LIMIT 1
  `, [hash])
  return r.rows[0] ?? null
}

export async function revokeAgentToken(id: number): Promise<void> {
  const r = await writerPool.query(
    `UPDATE agent_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
    [id],
  )
  if (r.rowCount === 0) throw new Error(`Agent token ${id} not found`)
}

export async function touchTokenLastUsed(id: number): Promise<void> {
  await writerPool.query(`UPDATE agent_tokens SET last_used_at = NOW() WHERE id = $1`, [id])
}
