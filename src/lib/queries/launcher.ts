import { readerPool, writerPool, withWriterTx } from '../db'

export type LauncherTile = {
  id: number
  name: string
  icon: string
  href: string
  position: number
  created_at: Date
  updated_at: Date
}

export async function listLauncherTiles(): Promise<LauncherTile[]> {
  const r = await readerPool.query<LauncherTile>(`
    SELECT id, name, icon, href, position, created_at, updated_at
    FROM launcher_tiles
    ORDER BY position ASC, id ASC
  `)
  return r.rows
}

export async function createLauncherTile(
  name: string,
  icon: string,
  href: string,
): Promise<LauncherTile> {
  const r = await writerPool.query<LauncherTile>(`
    INSERT INTO launcher_tiles (name, icon, href, position)
    VALUES ($1, $2, $3, COALESCE((SELECT MAX(position) + 1 FROM launcher_tiles), 0))
    RETURNING id, name, icon, href, position, created_at, updated_at
  `, [name, icon, href])
  return r.rows[0]
}

export type LauncherTilePatch = {
  name?: string
  icon?: string
  href?: string
}

export async function updateLauncherTile(
  id: number,
  patch: LauncherTilePatch,
): Promise<LauncherTile> {
  const sets: string[] = []
  const values: (string | number)[] = []
  let i = 1
  if (patch.name !== undefined) { sets.push(`name = $${i++}`); values.push(patch.name) }
  if (patch.icon !== undefined) { sets.push(`icon = $${i++}`); values.push(patch.icon) }
  if (patch.href !== undefined) { sets.push(`href = $${i++}`); values.push(patch.href) }

  if (sets.length === 0) {
    const r = await readerPool.query<LauncherTile>(`
      SELECT id, name, icon, href, position, created_at, updated_at
      FROM launcher_tiles WHERE id = $1
    `, [id])
    if (r.rowCount === 0) throw new Error(`Launcher tile ${id} not found`)
    return r.rows[0]
  }

  sets.push(`updated_at = NOW()`)
  values.push(id)
  const r = await writerPool.query<LauncherTile>(
    `UPDATE launcher_tiles SET ${sets.join(', ')}
     WHERE id = $${i}
     RETURNING id, name, icon, href, position, created_at, updated_at`,
    values,
  )
  if (r.rowCount === 0) throw new Error(`Launcher tile ${id} not found`)
  return r.rows[0]
}

export async function deleteLauncherTile(id: number): Promise<void> {
  const r = await writerPool.query(`DELETE FROM launcher_tiles WHERE id = $1`, [id])
  if (r.rowCount === 0) throw new Error(`Launcher tile ${id} not found`)
}

export async function moveTileUp(id: number): Promise<void> {
  return withWriterTx(async (c) => {
    const me = await c.query<{ position: number }>(
      `SELECT position FROM launcher_tiles WHERE id = $1 FOR UPDATE`, [id])
    if (me.rowCount === 0) throw new Error(`Launcher tile ${id} not found`)
    const myPos = me.rows[0].position
    const above = await c.query<{ id: number; position: number }>(
      `SELECT id, position FROM launcher_tiles
       WHERE position < $1
       ORDER BY position DESC LIMIT 1
       FOR UPDATE`, [myPos])
    if (above.rowCount === 0) return  // no-op, already at top
    const aboveRow = above.rows[0]
    await c.query(`UPDATE launcher_tiles SET position = $1, updated_at = NOW() WHERE id = $2`,
      [aboveRow.position, id])
    await c.query(`UPDATE launcher_tiles SET position = $1, updated_at = NOW() WHERE id = $2`,
      [myPos, aboveRow.id])
  })
}

export async function moveTileDown(id: number): Promise<void> {
  return withWriterTx(async (c) => {
    const me = await c.query<{ position: number }>(
      `SELECT position FROM launcher_tiles WHERE id = $1 FOR UPDATE`, [id])
    if (me.rowCount === 0) throw new Error(`Launcher tile ${id} not found`)
    const myPos = me.rows[0].position
    const below = await c.query<{ id: number; position: number }>(
      `SELECT id, position FROM launcher_tiles
       WHERE position > $1
       ORDER BY position ASC LIMIT 1
       FOR UPDATE`, [myPos])
    if (below.rowCount === 0) return  // no-op, already at bottom
    const belowRow = below.rows[0]
    await c.query(`UPDATE launcher_tiles SET position = $1, updated_at = NOW() WHERE id = $2`,
      [belowRow.position, id])
    await c.query(`UPDATE launcher_tiles SET position = $1, updated_at = NOW() WHERE id = $2`,
      [myPos, belowRow.id])
  })
}
