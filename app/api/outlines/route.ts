import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { describeDbError, getDb, hasDatabase, logDbError, outlines, missingUrlReason } from '@/lib/db'
import { normalizeBrief } from '@/lib/outline/brief'
import { SavedOutlineSchema, type SavedOutlineInput } from '@/lib/outline/saved'


export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ error: missingUrlReason() }, { status: 503 })

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
  } catch (failure) {
    logDbError('listing outlines', failure)
    return NextResponse.json({ error: describeDbError(failure) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: missingUrlReason() }, { status: 503 })

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
  } catch (failure) {
    logDbError('saving an outline', failure)
    return NextResponse.json({ error: describeDbError(failure, 'The outline could not be saved') }, { status: 500 })
  }
}
