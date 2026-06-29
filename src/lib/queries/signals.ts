import { readerPool } from '../db'

export type Signals = {
  last_commit_at: Date | null
  last_commit_message: string | null
  last_commit_repo: string | null
  backups_status: 'ok' | 'warning' | 'fail' | null
  backups_last_run_at: Date | null
  fetched_at: Date
}

export async function getSignals(): Promise<Signals | null> {
  const r = await readerPool.query<Signals>(`
    SELECT last_commit_at, last_commit_message, last_commit_repo,
           backups_status, backups_last_run_at, fetched_at
    FROM signals
    WHERE id = 1
  `)
  return r.rows[0] ?? null
}
