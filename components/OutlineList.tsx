'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface OutlineRowView {
  id: string
  name: string
  date: string
}

export function OutlineList({ outlines }: { outlines: OutlineRowView[] }) {
  const router = useRouter()
  const [asking, setAsking] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(id: string) {
    setBusy(id)
    setError(null)
    try {
      const response = await fetch(`/api/outlines/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.error ?? 'That outline could not be deleted. Try again in a moment.')
        return
      }
      setAsking(null)
      router.refresh()
    } catch {
      setError('That outline could not be deleted. Check the connection, then try again.')
    } finally {
      setBusy(null)
    }
  }

  if (outlines.length === 0) {
    return (
      <p className="max-w-[44ch] text-sm text-muted">
        Nothing saved yet. Start a new outline, pick a product and a claim, and the section stack builds itself.
      </p>
    )
  }

  return (
    <div>
      {error && <p className="note-panel mb-4">{error}</p>}
      <ul className="list-none border-t border-rule p-0">
        {outlines.map((outline) => (
          <li key={outline.id} className="flex flex-wrap items-center gap-3 border-b border-rule py-3.5">
            <Link className="min-w-0 flex-1 no-underline" href={`/outline/${outline.id}`}>
              <span className="section-title block truncate">{outline.name}</span>
              <span className="label">{outline.date}</span>
            </Link>
            {asking === outline.id ? (
              <span className="flex items-center gap-2">
                <span className="hint">Delete it for good</span>
                <button className="mini" type="button" disabled={busy === outline.id} onClick={() => remove(outline.id)}>
                  {busy === outline.id ? 'Deleting' : 'Yes delete it'}
                </button>
                <button className="mini" type="button" onClick={() => setAsking(null)}>
                  Keep it
                </button>
              </span>
            ) : (
              <button className="mini" type="button" onClick={() => setAsking(outline.id)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
