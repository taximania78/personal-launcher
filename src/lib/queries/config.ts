import { readerPool, writerPool } from '../db'

export type AppConfig = {
  whoogle_url: string | null
  updated_at: Date
}

export async function getAppConfig(): Promise<AppConfig | null> {
  const r = await readerPool.query<AppConfig>(`
    SELECT whoogle_url, updated_at
    FROM app_config
    WHERE id = 1
  `)
  return r.rows[0] ?? null
}

export type AppConfigPatch = {
  whoogle_url?: string | null
}

export async function updateAppConfig(patch: AppConfigPatch): Promise<AppConfig> {
  if (patch.whoogle_url === undefined) {
    const r = await writerPool.query<AppConfig>(`
      SELECT whoogle_url, updated_at FROM app_config WHERE id = 1
    `)
    return r.rows[0]
  }
  const value = patch.whoogle_url === '' ? null : patch.whoogle_url
  const r = await writerPool.query<AppConfig>(
    `UPDATE app_config SET whoogle_url = $1, updated_at = NOW()
     WHERE id = 1
     RETURNING whoogle_url, updated_at`,
    [value],
  )
  return r.rows[0]
}
