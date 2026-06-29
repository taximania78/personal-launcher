import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import {
  listLauncherTiles, createLauncherTile, updateLauncherTile,
  deleteLauncherTile, moveTileUp, moveTileDown,
} from '@/lib/queries/launcher'

afterAll(() => closePool())

describe('launcher_tiles queries', () => {
  beforeEach(() => truncateAll())

  it('empty list initially', async () => {
    expect(await listLauncherTiles()).toEqual([])
  })

  it('creates tiles with incrementing positions', async () => {
    const a = await createLauncherTile('A', '🅰', 'https://a')
    const b = await createLauncherTile('B', '🅱', 'https://b')
    expect(a.position).toBe(0)
    expect(b.position).toBe(1)
  })

  it('lists ordered by position ASC', async () => {
    await createLauncherTile('C', 'c', 'https://c')
    await createLauncherTile('A', 'a', 'https://a')
    await createLauncherTile('B', 'b', 'https://b')
    const list = await listLauncherTiles()
    expect(list.map(t => t.name)).toEqual(['C', 'A', 'B'])
  })

  it('updates a tile field', async () => {
    const t = await createLauncherTile('Old', '🔧', 'https://old')
    const u = await updateLauncherTile(t.id, { name: 'New', href: 'https://new' })
    expect(u.name).toBe('New')
    expect(u.href).toBe('https://new')
    expect(u.icon).toBe('🔧')  // unchanged
  })

  it('throws on update of unknown id', async () => {
    await expect(updateLauncherTile(99999, { name: 'x' })).rejects.toThrow(/not found/i)
  })

  it('deletes a tile', async () => {
    const t = await createLauncherTile('X', 'x', 'https://x')
    await deleteLauncherTile(t.id)
    expect(await listLauncherTiles()).toEqual([])
  })

  it('moveTileUp swaps with the tile immediately above', async () => {
    const a = await createLauncherTile('A', 'a', 'https://a')  // pos 0
    await createLauncherTile('B', 'b', 'https://b')             // pos 1
    const c = await createLauncherTile('C', 'c', 'https://c')   // pos 2
    await moveTileUp(c.id)
    const list = await listLauncherTiles()
    expect(list.map(t => t.name)).toEqual(['A', 'C', 'B'])
    // a stays at top
    expect(a.position).toBe(0)
  })

  it('moveTileUp is a no-op when tile is already first', async () => {
    const a = await createLauncherTile('A', 'a', 'https://a')
    const b = await createLauncherTile('B', 'b', 'https://b')
    await moveTileUp(a.id)
    expect((await listLauncherTiles()).map(t => t.name)).toEqual(['A', 'B'])
    expect(b).toBeTruthy()
  })

  it('moveTileDown swaps with the tile immediately below', async () => {
    await createLauncherTile('A', 'a', 'https://a')
    const b = await createLauncherTile('B', 'b', 'https://b')
    await createLauncherTile('C', 'c', 'https://c')
    await moveTileDown(b.id)
    expect((await listLauncherTiles()).map(t => t.name)).toEqual(['A', 'C', 'B'])
  })

  it('moveTileDown is a no-op when tile is already last', async () => {
    await createLauncherTile('A', 'a', 'https://a')
    const b = await createLauncherTile('B', 'b', 'https://b')
    await moveTileDown(b.id)
    expect((await listLauncherTiles()).map(t => t.name)).toEqual(['A', 'B'])
  })

  it('listLauncherTiles returns empty when the table is empty', async () => {
    expect(await listLauncherTiles()).toEqual([])
  })
})
