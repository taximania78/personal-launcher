import { Pool } from 'pg'

const TEST_URL = process.env.TEST_DATABASE_URL
if (!TEST_URL) throw new Error('TEST_DATABASE_URL is required for integration tests')

export const testPool = new Pool({ connectionString: TEST_URL, max: 5 })

export async function truncateAll() {
  await testPool.query(`
    TRUNCATE day_journal, week_priorities, todos, calendar, applications, services, launcher_tiles, habits, habit_checks, agent_tokens
    RESTART IDENTITY CASCADE;
  `)
  await testPool.query(`DELETE FROM meteo;`)
  await testPool.query(`DELETE FROM signals;`)
  await testPool.query(`UPDATE app_config SET whoogle_url = NULL, focus_default = NULL WHERE id = 1;`)
  await testPool.query(`UPDATE app_appearance SET background_image_path = NULL, background_dim_pct = 35 WHERE id = 1;`)
}

export async function closePool() {
  await testPool.end()
}
