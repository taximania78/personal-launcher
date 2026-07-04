import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { getDayJournal, upsertDayJournal } from '@/lib/queries/journal'

type Ctx = { params: Promise<{ date: string }> }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const putSchema = z.object({
  focus_todo_id: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  focus_text: z.string().max(280).nullable().optional(),
  why: z.string().max(280).nullable().optional(),
  focus_outcome: z.enum(['done', 'reported', 'expired', 'not_set']).optional(),
  report_reason: z.enum(['trop_gros', 'imprevu', 'evite', 'plus_pertinent', 'autre']).nullable().optional(),
  report_comment: z.string().max(1000).nullable().optional(),
  deep_work: z.boolean().nullable().optional(),
  shutdown_at: z.iso.datetime().nullable().optional(),
  shutdown_mode: z.enum(['normal', 'degrade']).nullable().optional(),
}).refine((d) => Object.values(d).some((v) => v !== undefined), {
  message: 'au moins un champ requis',
})

export async function GET(req: Request, ctx: Ctx) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const { date } = await ctx.params
  if (!DATE_RE.test(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 })
  try {
    return NextResponse.json(await getDayJournal(date))
  } catch (err) {
    console.error('[api/agent/journal GET]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const { date } = await ctx.params
  if (!DATE_RE.test(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 })
  const json = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    return NextResponse.json(await upsertDayJournal(date, parsed.data))
  } catch (err) {
    console.error('[api/agent/journal PUT]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
