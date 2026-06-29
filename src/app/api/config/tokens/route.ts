import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAgentToken } from '@/lib/queries/agent-tokens'

const createSchema = z.object({ name: z.string().min(1).max(60) })

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    const created = await createAgentToken(parsed.data.name)
    return NextResponse.json(created)
  } catch (err) {
    console.error('[api/config/tokens POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
