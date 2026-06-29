import { readerPool } from '../db'

export type ServicesHealth = { up: number, total: number }

export async function getServicesHealth(): Promise<ServicesHealth> {
  const r = await readerPool.query<{ up: string, total: string }>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'up')::text AS up,
      COUNT(*)::text AS total
    FROM services
  `)
  const row = r.rows[0]
  return { up: parseInt(row.up, 10), total: parseInt(row.total, 10) }
}
