import { getFocusTodo } from '@/lib/queries/todos'
import { getDayJournal } from '@/lib/queries/journal'
import { parisToday } from '@/lib/week'
import { resolveFocusBannerState } from './focus-banner-state'
import { FocusBannerView } from './FocusBannerView'

export async function FocusBanner() {
  const today = parisToday()
  try {
    const [todo, journal] = await Promise.all([getFocusTodo(), getDayJournal(today)])
    return (
      <FocusBannerView
        state={resolveFocusBannerState(todo, journal)}
        todoId={todo?.id ?? null}
        todayIso={today}
      />
    )
  } catch {
    return <FocusBannerView state={{ kind: 'unset', deepWork: false }} todoId={null} todayIso={today} />
  }
}
