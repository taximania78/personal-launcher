import { readerPool } from '../db'

export type JobKpis = Record<string, number>

export async function getJobKpis(): Promise<JobKpis> {
  const r = await readerPool.query<{ status: string, n: string }>(`
    SELECT status, COUNT(*)::text AS n
    FROM applications
    GROUP BY status
  `)
  const out: JobKpis = {}
  for (const row of r.rows) out[row.status] = parseInt(row.n, 10)
  return out
}

export type Followup = {
  notion_id: string
  company: string
  last_contact: Date | null
}

export async function getPendingFollowups(): Promise<Followup[]> {
  const r = await readerPool.query<Followup>(`
    SELECT notion_id, company, last_contact
    FROM applications
    WHERE status = 'Applied'
      AND (last_contact IS NULL OR last_contact < CURRENT_DATE - INTERVAL '7 days')
    ORDER BY last_contact NULLS FIRST
    LIMIT 3
  `)
  return r.rows
}

export type ApplicationEvent = {
  notion_id: string
  company: string
  next_event: Date
}

export async function getNextApplicationEvent(): Promise<ApplicationEvent | null> {
  const r = await readerPool.query<ApplicationEvent>(`
    SELECT notion_id, company, next_event
    FROM applications
    WHERE next_event > NOW()
    ORDER BY next_event ASC
    LIMIT 1
  `)
  return r.rows[0] ?? null
}
