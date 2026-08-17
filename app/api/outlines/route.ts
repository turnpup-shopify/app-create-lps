import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb, hasDatabase, outlines } from '@/lib/db'
import { normalizeBrief } from '@/lib/outline/brief'
import { SavedOutlineSchema, type SavedOutlineInput } from '@/lib/outline/saved'

const NO_DB =
  'Saved outlines are unavailable because no database address is set. Add DATABASE_URL to the environment and reload.'

export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ error: NO_DB }, { status: 503 })

  try {
    const rows = await getDb()
      .select({
        id: outlines.id,
        name: outlines.name,
        createdAt: outlines.createdAt,
        updatedAt: outlines.updatedAt,
      })
      .from(outlines)
      .orderBy(desc(outlines.updatedAt))

    return NextResponse.json({ outlines: rows })
  } catch {
    return NextResponse.json(
      { error: 'The saved outlines could not be read. Check the database address and try again.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: NO_DB }, { status: 503 })

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
      .insert(outlines)
      .values({
        id: crypto.randomUUID(),
        name: body.name,
        brief: normalizeBrief(body.brief),
        headings: body.headings,
      })
      .returning()

    return NextResponse.json({ outline: row }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'The outline could not be saved. Check the database address and try again.' },
      { status: 500 },
    )
  }
}
