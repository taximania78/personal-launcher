import { NextResponse } from 'next/server'
import { requireAgent } from '@/lib/agent-auth'
import { listJournals } from '@/lib/queries/journal'
import { getHabitCheckCounts } from '@/lib/queries/habits'

function clampDays(raw: string | null): number {
  const n = parseInt(raw ?? '', 10)
  if (!Number.isFinite(n)) return 14
  return Math.min(90, Math.max(1, n))
}

export async function GET(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const days = clampDays(new URL(req.url).searchParams.get('days'))
  try {
    const [journals, habits] = await Promise.all([
      listJournals(days),
      getHabitCheckCounts(days),
    ])
    return NextResponse.json({ days, journals, habits })
  } catch (err) {
    console.error('[api/agent/history GET]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
