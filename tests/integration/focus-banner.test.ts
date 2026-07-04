import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { FocusBanner } from '@/components/cockpit/FocusBanner'
import { createFocusTodo, setTodoDone } from '@/lib/queries/todos'

afterAll(() => closePool())

// FocusBanner (RSC) rend <FocusBannerView state={…} todoId={…} /> : on inspecte les props.
async function bannerState(): Promise<string> {
  const el = await FocusBanner() as unknown as { props: { state: { kind: string } } }
  return el.props.state.kind
}

describe('FocusBanner (server component)', () => {
  beforeEach(() => truncateAll())

  it('sans focus → unset (pas de crash, pas de texte de repli)', async () => {
    expect(await bannerState()).toBe('unset')
  })

  it('focus du jour → active ; coché → done', async () => {
    const t = await createFocusTodo('Focus du jour')
    expect(await bannerState()).toBe('active')
    await setTodoDone(t.id, true)
    expect(await bannerState()).toBe('done')
  })
})
