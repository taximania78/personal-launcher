import Link from 'next/link'
import { listLauncherTiles } from '@/lib/queries/launcher'
import { getAppConfig } from '@/lib/queries/config'
import { getAppAppearance } from '@/lib/queries/appearance'
import { listHabits } from '@/lib/queries/habits'
import { listAgentTokens } from '@/lib/queries/agent-tokens'
import { TilesManager } from '@/components/config/TilesManager'
import { GeneralSettings } from '@/components/config/GeneralSettings'
import { AppearanceSettings } from '@/components/config/AppearanceSettings'
import { HabitsManager } from '@/components/config/HabitsManager'
import { IconCatalog } from '@/components/config/IconCatalog'
import { TokensManager } from '@/components/config/TokensManager'

export const dynamic = 'force-dynamic'

export default async function ConfigPage() {
  let tiles: Awaited<ReturnType<typeof listLauncherTiles>> = []
  let config: Awaited<ReturnType<typeof getAppConfig>> = null
  let appearance: Awaited<ReturnType<typeof getAppAppearance>> = null
  let habits: Awaited<ReturnType<typeof listHabits>> = []
  let tokens: Awaited<ReturnType<typeof listAgentTokens>> = []
  let dbError = false
  try {
    ;[tiles, config, appearance, habits, tokens] = await Promise.all([
      listLauncherTiles(),
      getAppConfig(),
      getAppAppearance(),
      listHabits(true),
      listAgentTokens(),
    ])
  } catch (err) {
    console.error('[/config]', err)
    dbError = true
  }

  return (
    <main>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl italic"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Configuration
        </h1>
        <Link href="/" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          ← Retour
        </Link>
      </div>

      {dbError && (
        <div className="bg-[var(--color-bg-danger)] text-[var(--color-text-danger)] rounded-[var(--radius-md)] p-3 mb-5 text-sm">
          Base de données indisponible. La configuration ne peut pas être chargée ou enregistrée pour le moment.
        </div>
      )}

      {!dbError && (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">Apparence</h2>
            <AppearanceSettings
              initialPath={appearance?.background_image_path ?? null}
              initialDim={appearance?.background_dim_pct ?? 35}
              initialUpdatedAt={appearance?.updated_at ? new Date(appearance.updated_at).getTime() : 0}
            />
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">Tuiles du lanceur</h2>
            <TilesManager initial={tiles.map(t => ({ id: t.id, name: t.name, icon: t.icon, href: t.href, position: t.position }))} />
            <IconCatalog />
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">Habitudes</h2>
            <HabitsManager initial={habits.map(h => ({ id: h.id, name: h.name, icon: h.icon, active: h.active }))} />
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">Paramètres généraux</h2>
            <GeneralSettings initial={{ whoogle_url: config?.whoogle_url ?? '' }} />
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium mb-3">Tokens API (agent)</h2>
            <TokensManager initial={tokens.map(t => ({
              id: t.id, name: t.name, token_prefix: t.token_prefix,
              last_used_at: t.last_used_at, created_at: t.created_at,
            }))} />
          </section>
        </>
      )}
    </main>
  )
}
