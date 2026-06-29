import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('env loader', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('parses valid env', async () => {
    process.env.DATABASE_URL = 'postgres://x:y@localhost:5432/launcher'
    process.env.DATABASE_URL_READ = 'postgres://x:y@localhost:5432/launcher'
    process.env.N8N_TODO_WEBHOOK_URL = 'https://n8n.example.com/webhook/todo-sync'
    process.env.N8N_TODO_WEBHOOK_TOKEN = 'secret'
    process.env.LOG_LEVEL = 'info'
    const { env } = await import('@/lib/env')
    expect(env.DATABASE_URL).toBeTruthy()
    expect(env.LOG_LEVEL).toBe('info')
  })

  it('throws on missing required var', async () => {
    delete process.env.DATABASE_URL
    await expect(import('@/lib/env')).rejects.toThrow(/DATABASE_URL/)
  })
})
