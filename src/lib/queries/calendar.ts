import { readerPool } from '../db'

export type CalendarEvent = {
  uid: string
  title: string
  starts_at: Date
  ends_at: Date
  location: string | null
  is_interview: boolean
  all_day: boolean
}

// Agenda de l'AgendaCard :
//  - avant 18h (Europe/Paris) : tous les événements restants d'aujourd'hui
//    (à venir + en cours, via ends_at >= NOW()) ;
//  - à partir de 18h : bascule sur tous les événements de demain ;
//  - dans tous les cas, au minimum les 3 prochains (rn <= 3) pour ne jamais
//    laisser la carte vide et garder visible un événement du soir après 18h.
export async function getUpcomingEvents(): Promise<CalendarEvent[]> {
  const r = await readerPool.query<CalendarEvent>(`
    WITH ref AS (
      SELECT CASE
        WHEN EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Europe/Paris') >= 18
          THEN (NOW() AT TIME ZONE 'Europe/Paris')::date + 1
        ELSE (NOW() AT TIME ZONE 'Europe/Paris')::date
      END AS jour
    )
    SELECT uid, title, starts_at, ends_at, location, is_interview, all_day
    FROM (
      SELECT c.*,
        ROW_NUMBER() OVER (ORDER BY c.starts_at ASC) AS rn,
        (c.starts_at AT TIME ZONE 'Europe/Paris')::date AS jour
      FROM calendar c
      WHERE c.ends_at >= NOW()
    ) t
    CROSS JOIN ref
    WHERE t.jour = ref.jour OR t.rn <= 3
    ORDER BY t.starts_at ASC
    LIMIT 20
  `)
  return r.rows
}

export async function getNextInterview(): Promise<CalendarEvent | null> {
  const r = await readerPool.query<CalendarEvent>(`
    SELECT uid, title, starts_at, ends_at, location, is_interview, all_day
    FROM calendar
    WHERE is_interview = TRUE AND starts_at > NOW()
    ORDER BY starts_at ASC
    LIMIT 1
  `)
  return r.rows[0] ?? null
}
