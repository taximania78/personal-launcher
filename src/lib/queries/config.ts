import { readerPool, writerPool } from '../db'

export type AppConfig = {
  whoogle_url: string | null
  confetti_enabled: boolean
  updated_at: Date
}

const CONFIG_COLS = 'whoogle_url, confetti_enabled, updated_at'

export async function getAppConfig(): Promise<AppConfig | null> {
  const r = await readerPool.query<AppConfig>(`
    SELECT ${CONFIG_COLS}
    FROM app_config
    WHERE id = 1
  `)
  return r.rows[0] ?? null
}

export type AppConfigPatch = {
  whoogle_url?: string | null
  confetti_enabled?: boolean
}

export async function updateAppConfig(patch: AppConfigPatch): Promise<AppConfig> {
  const sets: string[] = []
  const values: unknown[] = []
  if (patch.whoogle_url !== undefined) {
    // '' → null : champ vide = pas de Whoogle (cf. GeneralSettings)
    values.push(patch.whoogle_url === '' ? null : patch.whoogle_url)
    sets.push(`whoogle_url = $${values.length}`)
  }
  if (patch.confetti_enabled !== undefined) {
    values.push(patch.confetti_enabled)
    sets.push(`confetti_enabled = $${values.length}`)
  }
  if (sets.length === 0) {
    const r = await readerPool.query<AppConfig>(
      `SELECT ${CONFIG_COLS} FROM app_config WHERE id = 1`,
    )
    return r.rows[0]
  }
  const r = await writerPool.query<AppConfig>(
    `UPDATE app_config SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = 1
     RETURNING ${CONFIG_COLS}`,
    values,
  )
  return r.rows[0]
}
