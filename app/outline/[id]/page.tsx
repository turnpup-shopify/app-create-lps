import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Workbench } from '@/components/Workbench'
import { describeDbError, getDb, hasDatabase, logDbError, missingUrlReason, outlines } from '@/lib/db'
import { normalizeBrief } from '@/lib/outline/brief'
import type { Headings } from '@/lib/outline/types'

export const dynamic = 'force-dynamic'

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

  if (!hasDatabase()) return <Problem message={missingUrlReason('This outline cannot be read')} />

  let row: { id: string; name: string; brief: unknown; headings: unknown } | undefined
  try {
    const found = await getDb().select().from(outlines).where(eq(outlines.id, id)).limit(1)
    row = found[0]
  } catch (failure) {
    logDbError('reading an outline', failure)
    return <Problem message={describeDbError(failure, 'This outline could not be read')} />
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
