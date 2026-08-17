import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb, hasDatabase, outlines } from '@/lib/db'
import { normalizeBrief } from '@/lib/outline/brief'
import { SavedOutlineSchema, type SavedOutlineInput } from '@/lib/outline/saved'

const NO_DB =
  'Saved outlines are unavailable because no database address is set. Add DATABASE_URL to the environment and reload.'

const NOT_FOUND = 'That outline is not in the database. It may have been deleted in another tab.'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  if (!hasDatabase()) return NextResponse.json({ error: NO_DB }, { status: 503 })
  const { id } = await params

  let body: SavedOutlineInput
  try {
    const parsed = SavedOutlineSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Give the outline a name before you save it.' }, { status: 400 })
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: 'That request could not be read, so nothing was saved.' }, { status: 400 })
  }

  try {
    const [row] = await getDb()
      .update(outlines)
      .set({
        name: body.name,
        brief: normalizeBrief(body.brief),
        headings: body.headings,
        updatedAt: new Date(),
      })
      .where(eq(outlines.id, id))
      .returning()

    if (!row) return NextResponse.json({ error: NOT_FOUND }, { status: 404 })
    return NextResponse.json({ outline: row })
  } catch {
    return NextResponse.json(
      { error: 'The outline could not be saved. Check the database address and try again.' },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!hasDatabase()) return NextResponse.json({ error: NO_DB }, { status: 503 })
  const { id } = await params

  try {
    const [row] = await getDb().delete(outlines).where(eq(outlines.id, id)).returning({ id: outlines.id })
    if (!row) return NextResponse.json({ error: NOT_FOUND }, { status: 404 })
    return NextResponse.json({ deleted: row.id })
  } catch {
    return NextResponse.json(
      { error: 'The outline could not be deleted. Check the database address and try again.' },
      { status: 500 },
    )
  }
}
