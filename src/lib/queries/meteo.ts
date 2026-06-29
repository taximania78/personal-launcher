import { readerPool } from '../db'

export type Meteo = {
  location: string
  temperature_c: string  // pg NUMERIC -> string
  icon: string
  condition: string | null
  fetched_at: Date
}

export async function getMeteo(): Promise<Meteo | null> {
  const r = await readerPool.query<Meteo>(`
    SELECT location, temperature_c, icon, condition, fetched_at
    FROM meteo
    WHERE id = 1
  `)
  return r.rows[0] ?? null
}
