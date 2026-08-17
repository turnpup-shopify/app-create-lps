import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Workbench } from '@/components/Workbench'
import { getDb, hasDatabase, outlines } from '@/lib/db'
import { normalizeBrief } from '@/lib/outline/brief'
import type { Headings } from '@/lib/outline/types'

export const dynamic = 'force-dynamic'

const NO_DB =
  'This outline cannot be read because no database address is set. Add DATABASE_URL to the environment and reload.'

const UNREADABLE = 'This outline could not be read. Check the database address, then reload.'

function Problem({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-[720px] px-6 pt-10 pb-24">
      <Link className="label no-underline hover:text-ink" href="/">
        All outlines
      </Link>
      <h1 className="masthead mt-2">That outline is out of reach</h1>
      <p className="note-panel mt-5">{message}</p>
    </main>
  )
}

export default async function OutlinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!hasDatabase()) return <Problem message={NO_DB} />

  let row: { id: string; name: string; brief: unknown; headings: unknown } | undefined
  try {
    const found = await getDb().select().from(outlines).where(eq(outlines.id, id)).limit(1)
    row = found[0]
  } catch {
    return <Problem message={UNREADABLE} />
  }

  if (!row) notFound()

  const headings = (row.headings ?? {}) as Headings

  return (
    <Workbench
      initialId={row.id}
      initialName={row.name}
      initialBrief={normalizeBrief(row.brief)}
      initialHeadings={headings}
    />
  )
}
