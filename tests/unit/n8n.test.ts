import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pushTodoSync } from '@/lib/n8n'

describe('pushTodoSync', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })))
  })

  it('does NOT throw if fetch rejects', () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down')))
    expect(() => pushTodoSync('created', { id: 1, text: 'x', done: false, is_focus: false, position: 0 })).not.toThrow()
  })

  it('sends X-Webhook-Token header', () => {
    pushTodoSync('toggled', { id: 1, text: 'x', done: true, is_focus: false, position: 0 })
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].headers['X-Webhook-Token']).toBeTruthy()
    expect(call[1].method).toBe('POST')
  })
})
