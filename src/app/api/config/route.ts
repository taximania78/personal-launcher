import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateAppConfig } from '@/lib/queries/config'
import { isSafeHref, SAFE_HREF_MESSAGE } from '@/lib/validation/url'

const patchSchema = z.object({
  whoogle_url: z.string().refine(isSafeHref, SAFE_HREF_MESSAGE).nullable().optional(),
  focus_default: z.string().nullable().optional(),
})

export async function PATCH(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    const updated = await updateAppConfig(parsed.data)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[api/config PATCH]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
