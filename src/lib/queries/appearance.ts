import { readerPool, writerPool } from '../db'

export type AppAppearance = {
  background_image_path: string | null
  background_dim_pct: number
  updated_at: Date
}

export async function getAppAppearance(): Promise<AppAppearance | null> {
  const r = await readerPool.query<AppAppearance>(`
    SELECT background_image_path, background_dim_pct, updated_at
    FROM app_appearance
    WHERE id = 1
  `)
  return r.rows[0] ?? null
}

export type AppAppearancePatch = {
  background_image_path?: string | null
  background_dim_pct?: number
}

export async function updateAppAppearance(patch: AppAppearancePatch): Promise<AppAppearance> {
  const sets: string[] = []
  const values: (string | number | null)[] = []
  let i = 1

  if (patch.background_image_path !== undefined) {
    sets.push(`background_image_path = $${i++}`)
    values.push(patch.background_image_path)
  }
  if (patch.background_dim_pct !== undefined) {
    sets.push(`background_dim_pct = $${i++}`)
    values.push(patch.background_dim_pct)
  }

  if (sets.length === 0) {
    const r = await writerPool.query<AppAppearance>(`
      SELECT background_image_path, background_dim_pct, updated_at FROM app_appearance WHERE id = 1
    `)
    return r.rows[0]
  }

  sets.push(`updated_at = NOW()`)
  const r = await writerPool.query<AppAppearance>(
    `UPDATE app_appearance SET ${sets.join(', ')} WHERE id = 1 RETURNING background_image_path, background_dim_pct, updated_at`,
    values,
  )
  return r.rows[0]
}
