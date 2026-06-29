import { readerPool, writerPool } from '../db'

export type AppConfig = {
  whoogle_url: string | null
  focus_default: string | null
  updated_at: Date
}

export async function getAppConfig(): Promise<AppConfig | null> {
  const r = await readerPool.query<AppConfig>(`
    SELECT whoogle_url, focus_default, updated_at
    FROM app_config
    WHERE id = 1
  `)
  return r.rows[0] ?? null
}

export type AppConfigPatch = {
  whoogle_url?: string | null
  focus_default?: string | null
}

export async function updateAppConfig(patch: AppConfigPatch): Promise<AppConfig> {
  const sets: string[] = []
  const values: (string | null)[] = []
  let i = 1

  if (patch.whoogle_url !== undefined) {
    sets.push(`whoogle_url = $${i++}`)
    values.push(patch.whoogle_url === '' ? null : patch.whoogle_url)
  }
  if (patch.focus_default !== undefined) {
    sets.push(`focus_default = $${i++}`)
    values.push(patch.focus_default === '' ? null : patch.focus_default)
  }

  if (sets.length === 0) {
    // No-op patch — return current row
    const r = await writerPool.query<AppConfig>(`
      SELECT whoogle_url, focus_default, updated_at FROM app_config WHERE id = 1
    `)
    return r.rows[0]
  }

  sets.push(`updated_at = NOW()`)
  const r = await writerPool.query<AppConfig>(
    `UPDATE app_config SET ${sets.join(', ')} WHERE id = 1 RETURNING whoogle_url, focus_default, updated_at`,
    values,
  )
  return r.rows[0]
}
