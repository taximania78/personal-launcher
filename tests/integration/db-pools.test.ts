import { describe, it, expect, afterAll } from 'vitest'
import { Pool } from 'pg'
import { closePool } from './helpers/test-db'

afterAll(() => closePool())

describe('db pools', () => {
  it('reader can SELECT', async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
    const r = await pool.query('SELECT 1 as x')
    expect(r.rows[0].x).toBe(1)
    await pool.end()
  })
})
