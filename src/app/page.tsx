import { Suspense } from 'react'
import { Header } from '@/components/socle/Header'
import { SearchBar } from '@/components/socle/SearchBar'
import { Launcher } from '@/components/socle/Launcher'
import { FocusBanner } from '@/components/cockpit/FocusBanner'
import { TodoCard } from '@/components/cockpit/TodoCard'
import { WeekCard } from '@/components/cockpit/WeekCard'
import { HabitsCard } from '@/components/cockpit/HabitsCard'
import { AgendaCard } from '@/components/cockpit/AgendaCard'
import { JobCard } from '@/components/cockpit/JobCard'
import { HomelabCard } from '@/components/cockpit/HomelabCard'
import { CardSkeleton, FocusBannerSkeleton } from '@/components/ui/Skeleton'
import { getAppConfig } from '@/lib/queries/config'

export default async function Home() {
  // Read app_config with a short timeout for the socle's SearchBar fallback.
  // If DB is slow/down, whoogleUrl ends up null → SearchBar falls back to Google.
  let whoogleUrl: string | null = null
  try {
    const config = await Promise.race([
      getAppConfig(),
      new Promise<null>((r) => setTimeout(() => r(null), 500)),
    ])
    whoogleUrl = config?.whoogle_url ?? null
  } catch {
    whoogleUrl = null
  }

  return (
    <main>
      <Header />
      <SearchBar whoogleUrl={whoogleUrl} />
      <Launcher />

      <Suspense fallback={<FocusBannerSkeleton />}><FocusBanner /></Suspense>

      <div className="mb-3.5">
        <Suspense fallback={<CardSkeleton />}><WeekCard /></Suspense>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
        <Suspense fallback={<CardSkeleton />}><TodoCard /></Suspense>
        <Suspense fallback={<CardSkeleton />}><AgendaCard /></Suspense>
      </div>
      <div className="mb-3.5">
        <Suspense fallback={<CardSkeleton />}><HabitsCard /></Suspense>
      </div>
      <div className="mb-3.5">
        <Suspense fallback={<CardSkeleton />}><JobCard /></Suspense>
      </div>
      <div>
        <Suspense fallback={<CardSkeleton />}><HomelabCard /></Suspense>
      </div>
    </main>
  )
}
