import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/agent/openapi.json/route'

describe('GET /api/agent/openapi.json', () => {
  it('renvoie une spec OpenAPI publique', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.openapi).toMatch(/^3\./)
    expect(body.paths['/api/agent/state']).toBeTruthy()
    expect(body.paths['/api/agent/focus']).toBeTruthy()
    expect(body.paths['/api/agent/todos']).toBeTruthy()
    expect(body.components.securitySchemes.bearerAuth.scheme).toBe('bearer')
  })
})
