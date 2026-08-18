import { desc } from 'drizzle-orm'
import Link from 'next/link'
import { OutlineList } from '@/components/OutlineList'
import { getDb, hasDatabase, outlines, missingUrlReason } from '@/lib/db'

export const dynamic = 'force-dynamic'


const UNREADABLE = 'The saved outlines could not be read. Check the database address, then reload.'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function IndexPage() {
  let rows: { id: string; name: string; date: string }[] = []
  let error: string | null = null

  if (!hasDatabase()) {
    error = missingUrlReason()
  } else {
    try {
      const found = await getDb()
        .select({ id: outlines.id, name: outlines.name, updatedAt: outlines.updatedAt })
        .from(outlines)
        .orderBy(desc(outlines.updatedAt))
      rows = found.map((row) => ({
        id: row.id,
        name: row.name,
        date: dateFormat.format(row.updatedAt),
      }))
    } catch {
      error = UNREADABLE
    }
  }

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 pt-10 pb-24">
      <header className="mb-9 border-b border-rule pb-6">
        <span className="label">Landing page outline</span>
        <h1 className="masthead mt-2.5">Build the argument before you write a word</h1>
        <p className="mt-2.5 max-w-[48ch] text-muted">
          Pick the traffic, the products, the claims and the worries. The app returns an ordered outline of one H1 and a
          series of H2s.
        </p>
      </header>

      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="section-title">Saved outlines</h2>
        <Link className="button no-underline" href="/outline/new">
          Start a new outline
        </Link>
      </div>

      {error ? <p className="note-panel">{error}</p> : <OutlineList outlines={rows} />}
    </main>
  )
}
