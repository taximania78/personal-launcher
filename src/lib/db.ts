import { Pool, PoolClient } from 'pg'
import { env } from './env'

declare global {
  var __pgPoolWriter: Pool | undefined
  var __pgPoolReader: Pool | undefined
}

export const writerPool: Pool =
  globalThis.__pgPoolWriter ??
  new Pool({ connectionString: env.DATABASE_URL, max: 10, min: 2 })

export const readerPool: Pool =
  globalThis.__pgPoolReader ??
  new Pool({ connectionString: env.DATABASE_URL_READ, max: 10, min: 2 })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPoolWriter = writerPool
  globalThis.__pgPoolReader = readerPool
}

export async function withWriterTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await writerPool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
