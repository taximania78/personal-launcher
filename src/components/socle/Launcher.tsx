import Link from 'next/link'
import { listLauncherTiles, type LauncherTile } from '@/lib/queries/launcher'
import { TileIcon } from '@/components/ui/TileIcon'

type RenderTile = { id: number, name: string, icon: string, href: string }

async function loadTiles(): Promise<RenderTile[]> {
  const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 500))
  let tiles: LauncherTile[] | null
  try {
    tiles = await Promise.race([listLauncherTiles(), timeoutPromise])
  } catch {
    tiles = null
  }

  if (!tiles) return []
  return tiles.map(t => ({ id: t.id, name: t.name, icon: t.icon, href: t.href }))
}

export async function Launcher() {
  const tiles = await loadTiles()
  if (tiles.length === 0) return null
  return (
    <div className="mb-6">
      <div className="text-on-image text-xs text-[var(--color-text-primary)] mb-2.5 pl-0.5 uppercase tracking-wide">Lanceur</div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hidden">
        {tiles.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className="surface-glass-soft no-underline flex w-[84px] shrink-0 aspect-square flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] px-1.5 text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-info)]"
          >
            <span className="text-[var(--color-text-secondary)]" aria-hidden>
              <TileIcon icon={t.icon} size={20} />
            </span>
            <span className="flex h-8 w-full items-center justify-center text-center text-xs leading-tight line-clamp-2">{t.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
