import { describe, it, expect } from 'vitest'
import { generateToken, hashToken, tokenPrefix } from '@/lib/agent-token'

describe('agent-token', () => {
  it('generateToken renvoie un token préfixé plt_ et unique', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a.startsWith('plt_')).toBe(true)
    expect(a.length).toBeGreaterThan(20)
    expect(a).not.toBe(b)
  })

  it('hashToken est déterministe et en hex 64 caractères', () => {
    const t = 'plt_example'
    expect(hashToken(t)).toBe(hashToken(t))
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('tokenPrefix renvoie les 10 premiers caractères', () => {
    const t = 'plt_abcdef123456'
    expect(tokenPrefix(t)).toBe('plt_abcdef')
  })
})
