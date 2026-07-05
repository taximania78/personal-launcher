import { getFocusTodo } from '@/lib/queries/todos'
import { getDayJournal } from '@/lib/queries/journal'
import { parisToday } from '@/lib/week'
import { resolveFocusBannerState } from './focus-banner-state'
import { FocusBannerView } from './FocusBannerView'

export async function FocusBanner() {
  try {
    const [todo, journal] = await Promise.all([getFocusTodo(), getDayJournal(parisToday())])
    return (
      <FocusBannerView
        state={resolveFocusBannerState(todo, journal)}
        todoId={todo?.id ?? null}
        todayIso={parisToday()}
      />
    )
  } catch {
    return <FocusBannerView state={{ kind: 'unset', deepWork: false }} todoId={null} todayIso={parisToday()} />
  }
}
