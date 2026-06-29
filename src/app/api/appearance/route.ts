import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateAppAppearance } from '@/lib/queries/appearance'

const patchSchema = z.object({
  background_dim_pct: z.number().int().min(0).max(60).optional(),
})

export async function PATCH(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  const { background_dim_pct } = parsed.data
  if (background_dim_pct === undefined) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }
  try {
    const updated = await updateAppAppearance({ background_dim_pct })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/appearance]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
